export class NotificationSystem {
    constructor() {
        this.permission = 'default';
        this.audioContext = null;
        this.notificationSound = null;
        this.lastNotifications = new Map();
        this.NOTIFICATION_COOLDOWN = 60000; // 1 minuto entre notificaciones del mismo tipo
        this.notificationConfigs = {
            attention_low: {
                title: '⚠️ Tu mascota necesita atención',
                message: 'Tiene poca energía o está aburrida',
                soundFrequency: 440, // La (A4)
                soundDuration: 200,
            },
            attention_critical: {
                title: '🚨 ¡Atención urgente!',
                message: '¡Tu mascota necesita cuidados inmediatos!',
                soundFrequency: 880, // La (A5) - más agudo
                soundDuration: 400,
            },
            illness: {
                title: '🤒 Tu mascota está enferma',
                message: 'Necesita medicina urgentemente',
                soundFrequency: 523, // Do (C5)
                soundDuration: 300,
            },
            near_death: {
                title: '💔 ¡Peligro crítico!',
                message: 'Tu mascota está en riesgo de morir',
                soundFrequency: 659, // Mi (E5)
                soundDuration: 500,
            },
            death: {
                title: '😢 Tu mascota ha muerto',
                message: 'Cuídala mejor la próxima vez',
                soundFrequency: 330, // Mi (E4) - grave
                soundDuration: 600,
            },
            evolution: {
                title: '✨ ¡Tu mascota va a evolucionar!',
                message: 'Está lista para la siguiente etapa',
                soundFrequency: 587, // Re (D5)
                soundDuration: 300,
            },
        };
        this.requestPermission();
        this.initAudioContext();
        this.loadNotificationSound();
    }
    loadNotificationSound() {
        try {
            this.notificationSound = new Audio('/assets/sounds/notification.mp3');
            this.notificationSound.volume = 0.5; // Volumen al 50%
            console.log('[Notifications] Custom sound loaded');
        }
        catch (e) {
            console.warn('[Notifications] Failed to load custom sound:', e);
        }
    }
    async requestPermission() {
        if ('Notification' in window) {
            this.permission = await Notification.requestPermission();
            console.log('[Notifications] Permission:', this.permission);
        }
    }
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        catch (e) {
            console.warn('[Notifications] Audio context not supported:', e);
        }
    }
    canSendNotification(type) {
        const lastTime = this.lastNotifications.get(type) || 0;
        const now = Date.now();
        // Verificar cooldown
        if (now - lastTime < this.NOTIFICATION_COOLDOWN) {
            return false;
        }
        return true;
    }
    notify(type) {
        if (!this.canSendNotification(type)) {
            console.log(`[Notifications] Skipped ${type} (cooldown)`);
            return;
        }
        const config = this.notificationConfigs[type];
        // Enviar notificación web
        if (this.permission === 'granted') {
            new Notification(config.title, {
                body: config.message,
                tag: type, // Evita duplicados
                requireInteraction: type === 'attention_critical' || type === 'near_death' || type === 'death',
            });
        }
        // Reproducir sonido personalizado
        this.playSound();
        // Actualizar último envío
        this.lastNotifications.set(type, Date.now());
        console.log(`[Notifications] Sent: ${type} - ${config.title}`);
    }
    playSound() {
        if (!this.notificationSound)
            return;
        try {
            // Reiniciar el audio si ya se está reproduciendo
            this.notificationSound.currentTime = 0;
            this.notificationSound.play().catch(e => {
                console.warn('[Notifications] Failed to play sound:', e);
            });
        }
        catch (e) {
            console.warn('[Notifications] Failed to play sound:', e);
        }
    }
    // Forzar envío (ignora cooldown) - útil para testing
    forceNotify(type) {
        this.lastNotifications.delete(type);
        this.notify(type);
    }
}
