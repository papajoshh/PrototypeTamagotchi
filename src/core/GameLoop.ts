import { Pet } from './Pet';
import { NotificationSystem } from './NotificationSystem';
import { Settings } from './Settings';

export const TIME_MODES = {
  REAL_TIME: 1,      // 1x - Tiempos reales del juego
  FAST: 10,          // 10x - Bebé en 6 min
  VERY_FAST: 60,     // 60x - Bebé en 1 min
  INSTANT: 600,      // 600x - Bebé en 6 segundos
  DEBUG: 1000        // 1000x - Para testing inmediato
};

export class GameLoop {
  private pet: Pet;
  private settings: Settings;
  private lastUpdate: number = Date.now();
  private timeMultiplier: number = TIME_MODES.REAL_TIME;
  private onUpdate?: (pet: Pet) => void;
  private notifications: NotificationSystem;

  // Estado previo para detectar cambios
  private previousHungerStars: number = 3;
  private previousBoringStars: number = 3;
  private previousIllness: boolean = false;
  private previousPoop: boolean = false;
  private previousStage: number = 0;

  // Intervals para background (setInterval funciona en background)
  private notificationCheckIntervalId: number | null = null;
  private backgroundUpdateIntervalId: number | null = null;
  private readonly NOTIFICATION_CHECK_INTERVAL = 30000; // 30 segundos
  private readonly BACKGROUND_UPDATE_INTERVAL = 5000; // 5 segundos

  // Tracking de background updates
  private lastBackgroundUpdate: number = Date.now();

  constructor(pet: Pet) {
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
    if (!lastSave) return;

    const now = Date.now();
    const offlineTime = (now - parseInt(lastSave)) / 1000; // segundos

    console.log(`[GameLoop] Simulating ${offlineTime}s of offline time`);

    // Simular tiempo offline con el multiplicador actual
    this.pet.update(offlineTime * this.timeMultiplier);
  }

  private setupPageVisibilityListener() {
    // Detectar cuando vuelves a la app (para recovery de tiempo perdido)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Volviste a la app - recuperar tiempo perdido por si acaso
        console.log('[GameLoop] 👁️ Page visible again - running background time recovery');
        this.simulateBackgroundTime();
        this.lastBackgroundUpdate = Date.now();
        this.lastUpdate = Date.now();
      } else {
        // App minimizada - guardar timestamp
        console.log('[GameLoop] 🙈 Page hidden - saving state');
        this.save();
      }
    });

    console.log('[GameLoop] Page visibility listener setup complete');
  }

  private simulateBackgroundTime() {
    // Similar a simulateOfflineTime pero para background
    const lastSave = localStorage.getItem('last-save-time');
    if (!lastSave) return;

    const now = Date.now();
    const backgroundTime = (now - parseInt(lastSave)) / 1000; // segundos

    console.log(`[GameLoop] 📱 Android background recovery: Simulating ${backgroundTime.toFixed(1)}s that passed while hidden`);

    // Update sleep system para tiempo transcurrido
    this.settings.sleep.timePass(new Date());

    // Actualizar pet con todo el tiempo acumulado (si NO está durmiendo)
    if (!this.settings.sleep.isSleeping) {
      const deltaTime = backgroundTime * this.timeMultiplier;
      this.pet.update(deltaTime);

      // Guardar cambios
      this.save();
    } else {
      console.log(`[GameLoop] Pet was sleeping, no update applied`);
    }
  }

  start(onUpdate?: (pet: Pet) => void) {
    this.onUpdate = onUpdate;
    this.lastUpdate = Date.now();

    // ============ PAGE VISIBILITY API ============
    // Detectar cuando la app está visible o en background
    this.setupPageVisibilityListener();

    // ============ SISTEMA DE BACKGROUND (SOLO cuando app está minimizada) ============
    // setInterval continúa ejecutándose incluso cuando la app está minimizada
    // requestAnimationFrame SE PAUSA en background, por eso necesitamos esto

    console.log('[GameLoop] Starting background systems:');
    console.log('[GameLoop] - Pet update every 5s (ALWAYS, even with app open)');
    console.log('[GameLoop] - Notification check every 30s');
    console.log('[GameLoop] ⚠️ Background update runs in parallel with requestAnimationFrame');

    // Background update: SIEMPRE actualiza (no confía en Page Visibility API)
    this.backgroundUpdateIntervalId = window.setInterval(() => {
      const now = Date.now();
      const deltaTime = ((now - this.lastBackgroundUpdate) / 1000) * this.timeMultiplier;
      this.lastBackgroundUpdate = now;

      // Update sleep system
      this.settings.sleep.timePass(new Date());

      // Actualizar pet si NO está durmiendo
      if (!this.settings.sleep.isSleeping) {
        this.pet.update(deltaTime);
      }

      // Guardar progreso
      this.save();
    }, this.BACKGROUND_UPDATE_INTERVAL);

    // Background notifications: verifica y envía notificaciones cada 30 segundos
    this.notificationCheckIntervalId = window.setInterval(() => {
      console.log('[GameLoop] Background notification check triggered');
      this.checkNotifications();
    }, this.NOTIFICATION_CHECK_INTERVAL);

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

      // Detectar cambios y enviar notificaciones (inmediato cuando app está activa)
      // También se ejecuta cada 30s en background via setInterval arriba
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

  private checkNotifications() {
    const currentHungerStars = this.pet.hunger.getStars();
    const currentBoringStars = this.pet.boring.getStars();
    const currentIllness = this.pet.illness.isCurrentlyIll();
    const currentPoop = this.pet.poop.hasPoopedNow();
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

    // Notificación: Caca (nueva)
    if (currentPoop && !this.previousPoop && this.settings.notifications.poopEnabled) {
      this.notifications.notify('poop');
    }

    // Notificación: Cerca de morir (le quedan 10 minutos o menos)
    // SOLO si NO está muerto ya
    if (currentStage !== 6) { // 6 = LifeStage.Dead
      const TEN_MINUTES = 600; // 10 minutos en segundos

      // Verificar tiempo hasta muerte por hambre
      const timeUntilHungerDeath = this.pet.hunger.getTimeUntilDeath();

      // Verificar tiempo hasta muerte por enfermedad
      const timeUntilIllnessDeath = this.pet.illness.getTimeUntilDeath();

      // Si cualquiera de los dos está en peligro crítico (<=10 min)
      const isNearDeath =
        (timeUntilHungerDeath !== null && timeUntilHungerDeath <= TEN_MINUTES) ||
        (timeUntilIllnessDeath !== null && timeUntilIllnessDeath <= TEN_MINUTES);

      if (isNearDeath) {
        this.notifications.notify('near_death');
      }
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
    this.previousPoop = currentPoop;
    this.previousStage = currentStage;
  }

  save() {
    localStorage.setItem('tamagotchi-save', this.pet.save());
    localStorage.setItem('last-save-time', Date.now().toString());
  }

  setTimeMultiplier(multiplier: number) {
    this.timeMultiplier = multiplier;
    console.log(`[GameLoop] Time multiplier set to ${multiplier}x`);
  }

  getTimeMultiplier(): number {
    return this.timeMultiplier;
  }

  getSettings(): Settings {
    return this.settings;
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    return await this.notifications.requestPermission();
  }

  testNotification(): void {
    this.notifications.forceNotify('attention_low');
  }

  // Cleanup: detener los intervals de background (si es necesario)
  stop(): void {
    if (this.backgroundUpdateIntervalId !== null) {
      window.clearInterval(this.backgroundUpdateIntervalId);
      this.backgroundUpdateIntervalId = null;
      console.log('[GameLoop] Background update interval stopped');
    }

    if (this.notificationCheckIntervalId !== null) {
      window.clearInterval(this.notificationCheckIntervalId);
      this.notificationCheckIntervalId = null;
      console.log('[GameLoop] Notification check interval stopped');
    }
  }
}
