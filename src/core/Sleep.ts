// Sleep System - Port from Unity
// Controls sleep/wake state and automatic/manual modes

export interface SleepData {
  sleepHour: number; // 0-23
  wakeUpHour: number; // 0-23
  isAutomatic: boolean;
  lightsOn: boolean;
  isSleeping: boolean;
}

export class Sleep {
  private _isSleeping: boolean = false;
  private _isAutomatic: boolean = false;
  private _sleepHour: number = 22; // 22:00 (10 PM)
  private _wakeUpHour: number = 7; // 7:00 (7 AM)
  private _lightsOn: boolean = true;

  // Despertar temporal en modo automático
  private _temporaryWakeUp: boolean = false;
  private _temporaryWakeUpTime: number = 0;
  private readonly TEMPORARY_WAKE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

  // Getters
  get isSleeping(): boolean {
    return this._isSleeping;
  }

  get isAwake(): boolean {
    return !this._isSleeping;
  }

  get isAutomatic(): boolean {
    return this._isAutomatic;
  }

  get isManual(): boolean {
    return !this._isAutomatic;
  }

  get sleepHour(): number {
    return this._sleepHour;
  }

  get wakeUpHour(): number {
    return this._wakeUpHour;
  }

  get lightsOn(): boolean {
    return this._lightsOn;
  }

  // Static factories (igual que Unity)
  static createAwakeWithAutomaticMode(): Sleep {
    const sleep = new Sleep();
    sleep._isSleeping = false;
    sleep._isAutomatic = true;
    sleep._lightsOn = true;
    return sleep;
  }

  static createAwakeWithManualMode(): Sleep {
    const sleep = new Sleep();
    sleep._isSleeping = false;
    sleep._isAutomatic = false;
    sleep._lightsOn = true;
    return sleep;
  }

  // Time Pass - Core logic (llamado cada frame en GameLoop)
  timePass(realNow: Date): void {
    if (!this._isAutomatic) return;

    const currentHour = realNow.getHours();
    const shouldBeSleeping = this.isInSleepPeriod(currentHour);

    // Verificar si el despertar temporal ha expirado
    if (this._temporaryWakeUp) {
      const now = Date.now();
      const elapsedTime = now - this._temporaryWakeUpTime;

      if (elapsedTime >= this.TEMPORARY_WAKE_DURATION) {
        // El tiempo de despertar temporal expiró
        this._temporaryWakeUp = false;
        console.log(`[Sleep] Temporary wake-up expired after ${this.TEMPORARY_WAKE_DURATION / 1000}s, returning to automatic schedule`);
      }
    }

    // En modo automático, el horario controla TODO (sueño Y luces)
    // EXCEPTO si hay un despertar temporal activo
    const wasSleeping = this._isSleeping;

    if (this._temporaryWakeUp && shouldBeSleeping) {
      // Despertar temporal durante hora de dormir: mantener despierto
      this._isSleeping = false;
      this._lightsOn = true;
    } else {
      // Comportamiento normal: seguir el horario
      this._isSleeping = shouldBeSleeping;
      this._lightsOn = !shouldBeSleeping;
    }

    // Debug log cuando cambia el estado
    if (wasSleeping !== this._isSleeping) {
      const reason = this._temporaryWakeUp ? ' (temporary wake-up)' : '';
      console.log(`[Sleep] Auto mode: ${this._isSleeping ? 'Going to sleep' : 'Waking up'} at ${currentHour}:00 (schedule: sleep ${this._sleepHour}:00, wake ${this._wakeUpHour}:00)${reason}`);
    }
  }

  // Verifica si una hora está en el período de sueño
  isInSleepPeriod(hour: number): boolean {
    if (this._wakeUpHour < this._sleepHour) {
      // Dormir cruza medianoche (ej: 22:00 a 7:00)
      return hour >= this._sleepHour || hour < this._wakeUpHour;
    } else {
      // Dormir dentro del mismo día (raro pero posible)
      return hour >= this._sleepHour && hour < this._wakeUpHour;
    }
  }

  // Schedule configuration
  setSchedule(sleepHour: number, wakeUpHour: number): void {
    if (sleepHour < 0 || sleepHour > 23) {
      throw new Error('Sleep hour must be between 0 and 23');
    }
    if (wakeUpHour < 0 || wakeUpHour > 23) {
      throw new Error('Wake up hour must be between 0 and 23');
    }

    this._sleepHour = sleepHour;
    this._wakeUpHour = wakeUpHour;
  }

  // Mode control
  enableAutomaticMode(): void {
    this._isAutomatic = true;
  }

  disableAutomaticMode(): void {
    this._isAutomatic = false;
  }

  toggleMode(): void {
    this._isAutomatic = !this._isAutomatic;
  }

  // Lights control (Manual mode)
  turnOnLights(): void {
    this._lightsOn = true;
    if (this.isManual) {
      this._isSleeping = false;
    }
  }

  turnOffLights(): void {
    this._lightsOn = false;
    if (this.isManual) {
      this._isSleeping = true;
    }
  }

  toggleLights(): void {
    if (this._lightsOn) {
      this.turnOffLights();
    } else {
      this.turnOnLights();
    }
  }

  // Wake up (manual override)
  wakeUp(): void {
    if (this.isAutomatic) {
      // En modo automático: activar despertar temporal
      this._temporaryWakeUp = true;
      this._temporaryWakeUpTime = Date.now();
      this._isSleeping = false;
      this._lightsOn = true;
      console.log(`[Sleep] Temporary wake-up activated for ${this.TEMPORARY_WAKE_DURATION / 1000}s`);
    } else {
      // En modo manual, enciende luces y despierta permanentemente
      this.turnOnLights();
    }
  }

  // Sleep manually
  sleep(): void {
    if (this.isManual) {
      this.turnOffLights();
    }
  }

  // Renovar el despertar temporal (llamar cuando hay interacción del usuario)
  refreshTemporaryWakeUp(): void {
    if (this._temporaryWakeUp) {
      this._temporaryWakeUpTime = Date.now();
      console.log(`[Sleep] Temporary wake-up refreshed (user interaction detected)`);
    }
  }

  // Serialization
  serialize(): SleepData {
    return {
      sleepHour: this._sleepHour,
      wakeUpHour: this._wakeUpHour,
      isAutomatic: this._isAutomatic,
      lightsOn: this._lightsOn,
      isSleeping: this._isSleeping
    };
  }

  deserialize(data: SleepData): void {
    this._sleepHour = data.sleepHour;
    this._wakeUpHour = data.wakeUpHour;
    this._isAutomatic = data.isAutomatic;
    this._lightsOn = data.lightsOn;
    this._isSleeping = data.isSleeping;
  }

  // Reset to defaults
  reset(): void {
    this._isSleeping = false;
    this._isAutomatic = false;
    this._sleepHour = 22;
    this._wakeUpHour = 7;
    this._lightsOn = true;
  }
}
