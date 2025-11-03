export type NotificationType =
  | 'attention_low'      // 1 estrella en hambre o aburrimiento
  | 'attention_critical' // 0 estrellas en hambre o aburrimiento
  | 'illness'            // Criatura enferma
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

    // Reproducir sonido
    this.playSound(config.soundFrequency || 440, config.soundDuration || 200);

    // Actualizar último envío
    this.lastNotifications.set(type, Date.now());

    console.log(`[Notifications] Sent: ${type} - ${config.title}`);
  }

  private playSound(frequency: number, duration: number) {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Envelope: fade in y fade out
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Fade in rápido
      gainNode.gain.linearRampToValueAtTime(0.3, now + duration / 1000 - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000); // Fade out

      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
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
