export type NotificationType =
  | 'attention_low'      // 1 estrella en hambre o aburrimiento
  | 'attention_critical' // 0 estrellas en hambre o aburrimiento
  | 'illness'            // Criatura enferma
  | 'poop'               // Criatura hizo caca
  | 'near_death'         // A punto de morir
  | 'death'              // Criatura muerta
  | 'evolution'          // Va a evolucionar
  | 'debug';             // Notificación de debug con info del pet

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
    debug: {
      title: '🔍 DEBUG - Background Update',
      message: 'Info del pet (será reemplazado dinámicamente)',
      soundFrequency: 440,
      soundDuration: 200,
    },
  };

  constructor() {
    // NO pedir permiso automáticamente - Chrome lo bloquea
    // Se pedirá cuando el usuario interactúe
    this.initAudioContext();
    this.loadNotificationSound();
    this.checkPermission();
  }

  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      console.log('[Notifications] Current permission:', this.permission);
    }
  }

  // Método público para pedir permiso tras interacción del usuario
  async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      console.log('[Notifications] Permission requested:', this.permission);
      return this.permission;
    }
    return 'denied';
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

  async notify(type: NotificationType) {
    if (!this.canSendNotification(type)) {
      console.log(`[Notifications] Skipped ${type} (cooldown)`);
      return;
    }

    const config = this.notificationConfigs[type];

    // Enviar notificación web
    if (this.permission === 'granted') {
      try {
        // Intentar usar Service Worker si está disponible (mejor para móvil)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;

          const notificationOptions: any = {
            body: config.message,
            tag: type, // Evita duplicados
            requireInteraction: type === 'attention_critical' || type === 'near_death' || type === 'death',
            icon: '/icon-192.png', // Icono de la app
            badge: '/icon-192.png', // Badge para Android
            vibrate: [200, 100, 200], // Patrón de vibración
          };

          await registration.showNotification(config.title, notificationOptions);

          console.log(`[Notifications] Sent via Service Worker: ${type} - ${config.title}`);
        } else {
          // Fallback: notificación tradicional (desktop o móvil sin SW)
          new Notification(config.title, {
            body: config.message,
            tag: type, // Evita duplicados
            requireInteraction: type === 'attention_critical' || type === 'near_death' || type === 'death',
            icon: '/icon-192.png',
          });

          console.log(`[Notifications] Sent via Notification API: ${type} - ${config.title}`);
        }
      } catch (error) {
        console.error('[Notifications] Failed to send notification:', error);
      }
    } else {
      console.warn(`[Notifications] Permission not granted (${this.permission}), cannot send notification`);
    }

    // Reproducir sonido personalizado
    this.playSound();

    // Actualizar último envío
    this.lastNotifications.set(type, Date.now());
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
  async forceNotify(type: NotificationType) {
    this.lastNotifications.delete(type);
    await this.notify(type);
  }

  // Enviar notificación de debug con mensaje personalizado
  async sendDebugNotification(debugMessage: string) {
    this.lastNotifications.delete('debug');

    if (this.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;

          const notificationOptions: any = {
            body: debugMessage,
            tag: 'debug',
            requireInteraction: false,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [100],
          };

          await registration.showNotification('🔍 DEBUG - Background Update', notificationOptions);
          console.log(`[Notifications] DEBUG notification sent: ${debugMessage}`);
        }
      } catch (error) {
        console.error('[Notifications] Failed to send debug notification:', error);
      }
    }

    this.playSound();
    this.lastNotifications.set('debug', Date.now());
  }
}
