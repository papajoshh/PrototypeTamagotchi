export type NotificationType =
  | 'attention_low'      // 1 estrella en hambre o aburrimiento
  | 'attention_critical' // 0 estrellas en hambre o aburrimiento
  | 'illness'            // Criatura enferma
  | 'poop'               // Criatura hizo caca
  | 'near_death'         // A punto de morir
  | 'death'              // Criatura muerta
  | 'evolution';         // Va a evolucionar

export interface NotificationConfig {
  title: string;
  message: string;
  soundFrequency?: number; // Frecuencia del sonido en Hz
  soundDuration?: number;  // Duración del sonido en ms
}

export class NotificationSystem {
  private permission: NotificationPermission = 'default';
  private audioContext: AudioContext | null = null;
  private notificationSound: HTMLAudioElement | null = null;
  private lastNotifications: Map<NotificationType, number> = new Map();
  private readonly NOTIFICATION_COOLDOWN = 60000; // 1 minuto entre notificaciones del mismo tipo

  private readonly notificationConfigs: Record<NotificationType, NotificationConfig> = {
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
    poop: {
      title: '💩 ¡Tu mascota hizo caca!',
      message: 'Límpiala antes de que se enferme',
      soundFrequency: 392, // Sol (G4)
      soundDuration: 250,
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

  constructor() {
    this.requestPermission();
    this.initAudioContext();
    this.loadNotificationSound();
  }

  private loadNotificationSound() {
    try {
      this.notificationSound = new Audio('/assets/sounds/notification.mp3');
      this.notificationSound.volume = 0.5; // Volumen al 50%
      console.log('[Notifications] Custom sound loaded');
    } catch (e) {
      console.warn('[Notifications] Failed to load custom sound:', e);
    }
  }

  private async requestPermission() {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      console.log('[Notifications] Permission:', this.permission);
    }
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('[Notifications] Audio context not supported:', e);
    }
  }

  private canSendNotification(type: NotificationType): boolean {
    const lastTime = this.lastNotifications.get(type) || 0;
    const now = Date.now();

    // Verificar cooldown
    if (now - lastTime < this.NOTIFICATION_COOLDOWN) {
      return false;
    }

    return true;
  }

  notify(type: NotificationType) {
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

  private playSound() {
    if (!this.notificationSound) return;

    try {
      // Reiniciar el audio si ya se está reproduciendo
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(e => {
        console.warn('[Notifications] Failed to play sound:', e);
      });
    } catch (e) {
      console.warn('[Notifications] Failed to play sound:', e);
    }
  }

  // Forzar envío (ignora cooldown) - útil para testing
  forceNotify(type: NotificationType) {
    this.lastNotifications.delete(type);
    this.notify(type);
  }
}
