import { LifeStage } from './LifeStage';

// Tiempo hasta muerte por enfermedad (según CSV)
// A partir de que aparece la enfermedad
const TIME_TO_DEATH_BY_ILLNESS = {
  [LifeStage.Egg]: 0,
  [LifeStage.Baby]: 600,    // 10 min
  [LifeStage.Child]: 1800,  // 30 min
  [LifeStage.Young]: 3600,  // 60 min
  [LifeStage.Adult]: 3600,  // 60 min
  [LifeStage.ReadyToAscend]: 3600,
  [LifeStage.Dead]: 0,
};

export class Illness {
  private isIll: boolean = false;
  private timeSinceIll: number = 0;
  private currentStage: LifeStage = LifeStage.Baby;

  update(deltaTime: number) {
    if (this.isIll) {
      this.timeSinceIll += deltaTime;
    }
  }

  getIll(stage: LifeStage = LifeStage.Baby) {
    this.isIll = true;
    this.timeSinceIll = 0;
    this.currentStage = stage;
  }

  cure() {
    this.isIll = false;
    this.timeSinceIll = 0;
  }

  cancelIllness() {
    // Llamado cuando se limpia la caca antes de que pase el tiempo
    // No hace nada si ya está enfermo
  }

  isCurrentlyIll(): boolean {
    return this.isIll;
  }

  isDying(): boolean {
    return this.isIll && this.timeSinceIll >= TIME_TO_DEATH_BY_ILLNESS[this.currentStage];
  }

  getTimeUntilDeath(): number | null {
    // Retorna segundos hasta la muerte, o null si no está enfermo
    if (!this.isIll) return null;

    const remaining = TIME_TO_DEATH_BY_ILLNESS[this.currentStage] - this.timeSinceIll;
    return remaining > 0 ? remaining : 0;
  }

  serialize() {
    return {
      isIll: this.isIll,
      timeSinceIll: this.timeSinceIll,
      currentStage: this.currentStage,
    };
  }

  deserialize(data: any) {
    this.isIll = data.isIll;
    this.timeSinceIll = data.timeSinceIll;
    if (data.currentStage !== undefined) {
      this.currentStage = data.currentStage;
    }
  }
}
