import { LifeStage } from './LifeStage';

// Tiempos de hambre por etapa (en segundos POR ESTRELLA)
// Según ~Docs/Diseño Notion/Diseño - Tiempos (1).csv
// Sistema de 5 estrellas - Tiempos totales: Baby 45min, Child 150min, Young/Adult 180min
// Bebé: 9 min/⭐, Niño: 30 min/⭐, Joven: 36 min/⭐, Adulto: 36 min/⭐
const HUNGER_TIMES = {
  [LifeStage.Egg]: 0,
  [LifeStage.Baby]: 540,    // 9 min por estrella (45min total / 5★)
  [LifeStage.Child]: 1800,  // 30 min por estrella (150min total / 5★)
  [LifeStage.Young]: 2160,  // 36 min por estrella (180min total / 5★)
  [LifeStage.Adult]: 2160,  // 36 min por estrella (180min total / 5★)
  [LifeStage.ReadyToAscend]: 2160,
  [LifeStage.Dead]: 0,
};

// Tiempo hasta muerte por hambre (en minutos según CSV)
// A partir de tener 0 estrellas
const DEATH_BY_HUNGER = {
  [LifeStage.Egg]: 0,
  [LifeStage.Baby]: 600,     // 10 min
  [LifeStage.Child]: 3600,   // 60 min
  [LifeStage.Young]: 7200,   // 120 min
  [LifeStage.Adult]: 7200,   // 120 min
  [LifeStage.ReadyToAscend]: 7200,
  [LifeStage.Dead]: 0,
};

export class Hunger {
  private stars: number = 3; // 0-5 estrellas (5 = satisfecho, 0 = hambriento)
  private timeToNextLevel: number = 0;
  private deathTimer: number = 0;
  private deathThreshold: number = 0;

  constructor(stage: LifeStage) {
    this.timeToNextLevel = HUNGER_TIMES[stage];
  }

  update(deltaTime: number, stage: LifeStage) {
    if (this.stars > 0) {
      this.timeToNextLevel -= deltaTime;

      if (this.timeToNextLevel <= 0) {
        this.stars--;
        this.timeToNextLevel = HUNGER_TIMES[stage];

        // Cuando llega a 0 estrellas, empieza countdown de muerte
        if (this.stars === 0) {
          this.deathThreshold = DEATH_BY_HUNGER[stage];
        }
      }
    } else {
      // Countdown de muerte
      this.deathTimer += deltaTime;
    }
  }

  // Sistema de saciedad por tier (Tarea 4 del documento)
  satiate(satiationStars: number) {
    this.stars = Math.min(5, this.stars + satiationStars);
    this.deathTimer = 0; // Reset death timer
  }

  // Trigger visual (muestra indicador cuando tiene 1 estrella o menos)
  isHungry(): boolean {
    return this.stars <= 1;
  }

  // Mal cuidado (penalización x0.5 cuando tiene 0 estrellas)
  isBadlyCared(): boolean {
    return this.stars === 0;
  }

  isFullySatiated(): boolean {
    return this.stars === 5;
  }

  isDying(): boolean {
    return this.stars === 0 && this.deathTimer >= this.deathThreshold;
  }

  getTimeUntilDeath(): number | null {
    // Retorna segundos hasta la muerte, o null si no está en peligro
    if (this.stars > 0) return null;

    const remaining = this.deathThreshold - this.deathTimer;
    return remaining > 0 ? remaining : 0;
  }

  getTimeToHungry(): number {
    return this.timeToNextLevel;
  }

  getStars(): number {
    return this.stars;
  }

  onStageChange(newStage: LifeStage) {
    this.timeToNextLevel = HUNGER_TIMES[newStage];
  }

  reset() {
    this.stars = 3;
    this.deathTimer = 0;
    this.deathThreshold = 0;
  }

  serialize() {
    return {
      stars: this.stars,
      timeToNextLevel: this.timeToNextLevel,
      deathTimer: this.deathTimer,
      deathThreshold: this.deathThreshold,
    };
  }

  deserialize(data: any) {
    this.stars = data.stars;
    this.timeToNextLevel = data.timeToNextLevel;
    this.deathTimer = data.deathTimer;
    this.deathThreshold = data.deathThreshold;
  }
}
