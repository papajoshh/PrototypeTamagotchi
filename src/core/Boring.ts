import { LifeStage } from './LifeStage';

// Tiempos de aburrimiento por etapa (en segundos POR ESTRELLA)
// Según ~Docs/Diseño Notion/Diseño - Tiempos (1).csv
// Sistema de 5 estrellas - Tiempos totales: Baby 45min, Child 150min, Young/Adult 180min
// Bebé: 9 min/⭐, Niño: 30 min/⭐, Joven: 36 min/⭐, Adulto: 36 min/⭐
const BORING_TIMES = {
  [LifeStage.Egg]: 0,
  [LifeStage.Baby]: 540,    // 9 min por estrella (45min total / 5★)
  [LifeStage.Child]: 1800,  // 30 min por estrella (150min total / 5★)
  [LifeStage.Young]: 2160,  // 36 min por estrella (180min total / 5★)
  [LifeStage.Adult]: 2160,  // 36 min por estrella (180min total / 5★)
  [LifeStage.ReadyToAscend]: 2160,
  [LifeStage.Dead]: 0,
};

export class Boring {
  private stars: number = 3; // 0-5 estrellas (5 = entretenido, 0 = aburrido)
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

  // Minijuegos aportan estrellas según performance (1-3 estrellas)
  entertain(stars: number = 1) {
    this.stars = Math.min(5, this.stars + stars);
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
    return this.stars === 5;
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
