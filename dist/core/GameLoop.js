import { NotificationSystem } from './NotificationSystem';
import { Settings } from './Settings';
export const TIME_MODES = {
    REAL_TIME: 1, // 1x - Tiempos reales del juego
    FAST: 10, // 10x - Bebé en 6 min
    VERY_FAST: 60, // 60x - Bebé en 1 min
    INSTANT: 600, // 600x - Bebé en 6 segundos
    DEBUG: 1000 // 1000x - Para testing inmediato
};
export class GameLoop {
    constructor(pet) {
        this.lastUpdate = Date.now();
        this.timeMultiplier = TIME_MODES.REAL_TIME;
        // Estado previo para detectar cambios
        this.previousHungerStars = 3;
        this.previousBoringStars = 3;
        this.previousIllness = false;
        this.previousStage = 0;
        this.pet = pet;
        this.settings = new Settings(); // Carga automáticamente desde localStorage
        this.notifications = new NotificationSystem();
        // Cargar estado guardado
        const savedData = localStorage.getItem('tamagotchi-save');
        if (savedData) {
            this.pet.load(savedData);
            this.simulateOfflineTime();
        }
        // Inicializar estado previo
        this.previousHungerStars = this.pet.hunger.getStars();
        this.previousBoringStars = this.pet.boring.getStars();
        this.previousIllness = this.pet.illness.isCurrentlyIll();
        this.previousStage = this.pet.stage;
    }
    simulateOfflineTime() {
        const lastSave = localStorage.getItem('last-save-time');
        if (!lastSave)
            return;
        const now = Date.now();
        const offlineTime = (now - parseInt(lastSave)) / 1000; // segundos
        console.log(`[GameLoop] Simulating ${offlineTime}s of offline time`);
        // Simular tiempo offline con el multiplicador actual
        this.pet.update(offlineTime * this.timeMultiplier);
    }
    start(onUpdate) {
        this.onUpdate = onUpdate;
        this.lastUpdate = Date.now();
        // Update loop usando requestAnimationFrame (más suave que setInterval)
        const gameLoop = () => {
            const now = Date.now();
            const deltaTime = ((now - this.lastUpdate) / 1000) * this.timeMultiplier;
            this.lastUpdate = now;
            // Update sleep system (verifica si debe estar dormido según hora real)
            this.settings.sleep.timePass(new Date());
            // Solo actualizar pet si NO está durmiendo (el tiempo se congela mientras duerme)
            if (!this.settings.sleep.isSleeping) {
                this.pet.update(deltaTime);
            }
            // Detectar cambios y enviar notificaciones
            this.checkNotifications();
            // Notificar actualización
            if (this.onUpdate) {
                this.onUpdate(this.pet);
            }
            // Guardar cada ~10 segundos (a 60fps, 600 frames = 10s)
            if (Math.random() < 0.0016) { // ~1 vez cada 10 segundos
                this.save();
            }
            // Siguiente frame
            requestAnimationFrame(gameLoop);
        };
        // Iniciar loop
        requestAnimationFrame(gameLoop);
    }
    checkNotifications() {
        const currentHungerStars = this.pet.hunger.getStars();
        const currentBoringStars = this.pet.boring.getStars();
        const currentIllness = this.pet.illness.isCurrentlyIll();
        const currentStage = this.pet.stage;
        // Notificación: Hambre en 1 estrella (bajó de 2 o 3 a 1)
        if (currentHungerStars === 1 && this.previousHungerStars > 1) {
            this.notifications.notify('attention_low');
        }
        // Notificación: Hambre en 0 estrellas (bajó de 1 o más a 0)
        if (currentHungerStars === 0 && this.previousHungerStars > 0) {
            this.notifications.notify('attention_critical');
        }
        // Notificación: Aburrimiento en 1 estrella (bajó de 2 o 3 a 1)
        if (currentBoringStars === 1 && this.previousBoringStars > 1) {
            this.notifications.notify('attention_low');
        }
        // Notificación: Aburrimiento en 0 estrellas (bajó de 1 o más a 0)
        if (currentBoringStars === 0 && this.previousBoringStars > 0) {
            this.notifications.notify('attention_critical');
        }
        // Notificación: Enfermedad (nuevo)
        if (currentIllness && !this.previousIllness) {
            this.notifications.notify('illness');
        }
        // Notificación: Cerca de morir (le quedan 10 minutos o menos)
        const TEN_MINUTES = 600; // 10 minutos en segundos
        // Verificar tiempo hasta muerte por hambre
        const timeUntilHungerDeath = this.pet.hunger.getTimeUntilDeath();
        // Verificar tiempo hasta muerte por enfermedad
        const timeUntilIllnessDeath = this.pet.illness.getTimeUntilDeath();
        // Si cualquiera de los dos está en peligro crítico (<=10 min)
        const isNearDeath = (timeUntilHungerDeath !== null && timeUntilHungerDeath <= TEN_MINUTES) ||
            (timeUntilIllnessDeath !== null && timeUntilIllnessDeath <= TEN_MINUTES);
        if (isNearDeath) {
            this.notifications.notify('near_death');
        }
        // Notificación: Va a evolucionar (progreso >= 100% y no está en stage final)
        const progress = this.pet.getGrowthProgress();
        if (progress >= 1.0 && currentStage < 6 && currentStage > 0) {
            this.notifications.notify('evolution');
        }
        // Notificación: Muerte (cambió a stage Dead)
        if (currentStage === 6 && this.previousStage !== 6) {
            this.notifications.notify('death');
        }
        // Actualizar estado previo
        this.previousHungerStars = currentHungerStars;
        this.previousBoringStars = currentBoringStars;
        this.previousIllness = currentIllness;
        this.previousStage = currentStage;
    }
    save() {
        localStorage.setItem('tamagotchi-save', this.pet.save());
        localStorage.setItem('last-save-time', Date.now().toString());
    }
    setTimeMultiplier(multiplier) {
        this.timeMultiplier = multiplier;
        console.log(`[GameLoop] Time multiplier set to ${multiplier}x`);
    }
    getTimeMultiplier() {
        return this.timeMultiplier;
    }
    getSettings() {
        return this.settings;
    }
}
