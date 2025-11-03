import { LifeStage } from './LifeStage';

// Tiempos de aburrimiento por etapa (en segundos POR ESTRELLA)
// Según ~Docs/Diseño Notion/Diseño - Tiempos (1).csv
// Mismo que hambre: Bebé: 15 min/⭐, Niño: 50 min/⭐, Joven: 60 min/⭐, Adulto: 60 min/⭐
const BORING_TIMES = {
  [LifeStage.Egg]: 0,
  [LifeStage.Baby]: 900,    // 15 min por estrella
  [LifeStage.Child]: 3000,  // 50 min por estrella
  [LifeStage.Young]: 3600,  // 60 min por estrella
  [LifeStage.Adult]: 3600,  // 60 min por estrella
  [LifeStage.ReadyToAscend]: 3600,
  [LifeStage.Dead]: 0,
};

export class Boring {
  private stars: number = 3; // 0-3 estrellas (3 = entretenido, 0 = aburrido)
  private timeToNextLevel: number = 0;

  constructor(stage: LifeStage) {
    this.timeToNextLevel = BORING_TIMES[stage];
  }

  update(deltaTime: number, stage: LifeStage) {
    if (this.stars > 0) {
      this.timeToNextLevel -= deltaTime;

      if (this.timeToNextLevel <= 0) {
        this.stars--;
        this.timeToNextLevel = BORING_TIMES[stage];
      }
    }
  }

  // Cada minijuego aporta 1 estrella
  entertain() {
    this.stars = Math.min(3, this.stars + 1);
  }

  // Trigger visual (muestra indicador cuando tiene 1 estrella o menos)
  isBored(): boolean {
    return this.stars <= 1;
  }

  // Mal cuidado (penalización x0.5 cuando tiene 0 estrellas)
  isBadlyCared(): boolean {
    return this.stars === 0;
  }

  isFullyEntertained(): boolean {
    return this.stars === 3;
  }

  getStars(): number {
    return this.stars;
  }

  onStageChange(newStage: LifeStage) {
    this.timeToNextLevel = BORING_TIMES[newStage];
  }

  reset() {
    this.stars = 3;
  }

  serialize() {
    return {
      stars: this.stars,
      timeToNextLevel: this.timeToNextLevel,
    };
  }

  deserialize(data: any) {
    this.stars = data.stars;
    this.timeToNextLevel = data.timeToNextLevel;
  }
}
