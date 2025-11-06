// Settings System
// Manages all game configuration (Sleep, Audio, Notifications)
import { Sleep } from './Sleep';
export class Settings {
    constructor() {
        this.hasCompletedInitialSetup = false;
        this.STORAGE_KEY = 'tamagotchi-settings';
        // Defaults
        this.sleep = Sleep.createAwakeWithAutomaticMode();
        this.audio = {
            musicEnabled: true,
            musicVolume: 0.5,
            sfxEnabled: true,
            sfxVolume: 0.5,
            vibrationEnabled: true
        };
        this.notifications = {
            allEnabled: true,
            hungerEnabled: true,
            illnessEnabled: true,
            deathEnabled: true,
            evolutionEnabled: true
        };
        // Try to load from localStorage
        this.load();
    }
    // Audio methods
    setMusicEnabled(enabled) {
        this.audio.musicEnabled = enabled;
        this.save();
    }
    setMusicVolume(volume) {
        this.audio.musicVolume = Math.max(0, Math.min(1, volume));
        this.save();
    }
    setSfxEnabled(enabled) {
        this.audio.sfxEnabled = enabled;
        this.save();
    }
    setSfxVolume(volume) {
        this.audio.sfxVolume = Math.max(0, Math.min(1, volume));
        this.save();
    }
    setVibrationEnabled(enabled) {
        this.audio.vibrationEnabled = enabled;
        this.save();
    }
    // Notification methods
    setAllNotificationsEnabled(enabled) {
        this.notifications.allEnabled = enabled;
        if (!enabled) {
            // Si desactiva todas, desactiva individuales también
            this.notifications.hungerEnabled = false;
            this.notifications.illnessEnabled = false;
            this.notifications.deathEnabled = false;
            this.notifications.evolutionEnabled = false;
        }
        else {
            // Si activa todas, activa individuales también
            this.notifications.hungerEnabled = true;
            this.notifications.illnessEnabled = true;
            this.notifications.deathEnabled = true;
            this.notifications.evolutionEnabled = true;
        }
        this.save();
    }
    setHungerNotificationEnabled(enabled) {
        this.notifications.hungerEnabled = enabled;
        this.updateAllNotificationsState();
        this.save();
    }
    setIllnessNotificationEnabled(enabled) {
        this.notifications.illnessEnabled = enabled;
        this.updateAllNotificationsState();
        this.save();
    }
    setDeathNotificationEnabled(enabled) {
        this.notifications.deathEnabled = enabled;
        this.updateAllNotificationsState();
        this.save();
    }
    setEvolutionNotificationEnabled(enabled) {
        this.notifications.evolutionEnabled = enabled;
        this.updateAllNotificationsState();
        this.save();
    }
    // Update "all enabled" based on individual states
    updateAllNotificationsState() {
        this.notifications.allEnabled =
            this.notifications.hungerEnabled &&
                this.notifications.illnessEnabled &&
                this.notifications.deathEnabled &&
                this.notifications.evolutionEnabled;
    }
    // Check if a specific notification should be sent
    shouldSendNotification(type) {
        if (!this.notifications.allEnabled)
            return false;
        switch (type) {
            case 'hunger':
                return this.notifications.hungerEnabled;
            case 'illness':
                return this.notifications.illnessEnabled;
            case 'death':
                return this.notifications.deathEnabled;
            case 'evolution':
                return this.notifications.evolutionEnabled;
            default:
                return false;
        }
    }
    // Initial setup
    completeInitialSetup(sleepHour, wakeUpHour, automaticMode) {
        this.sleep.setSchedule(sleepHour, wakeUpHour);
        if (automaticMode) {
            this.sleep.enableAutomaticMode();
        }
        else {
            this.sleep.disableAutomaticMode();
        }
        this.hasCompletedInitialSetup = true;
        this.save();
    }
    // Persistence
    save() {
        const data = {
            sleep: this.sleep.serialize(),
            audio: { ...this.audio },
            notifications: { ...this.notifications },
            hasCompletedInitialSetup: this.hasCompletedInitialSetup
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
    load() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (!saved)
            return;
        try {
            const data = JSON.parse(saved);
            // Load sleep
            this.sleep.deserialize(data.sleep);
            // Load audio
            this.audio = { ...data.audio };
            // Load notifications
            this.notifications = { ...data.notifications };
            // Load initial setup flag
            this.hasCompletedInitialSetup = data.hasCompletedInitialSetup || false;
        }
        catch (error) {
            console.error('[Settings] Failed to load settings:', error);
        }
    }
    reset() {
        this.sleep.reset();
        this.audio = {
            musicEnabled: true,
            musicVolume: 0.5,
            sfxEnabled: true,
            sfxVolume: 0.5,
            vibrationEnabled: true
        };
        this.notifications = {
            allEnabled: true,
            hungerEnabled: true,
            illnessEnabled: true,
            deathEnabled: true,
            evolutionEnabled: true
        };
        this.hasCompletedInitialSetup = false;
        this.save();
    }
}
