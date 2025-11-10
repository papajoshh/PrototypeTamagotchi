// Minijuego de Mimitos
// Tap rápido sobre la mascota durante 5 segundos

export type MimitosGamePhase = 'playing' | 'finished';

export interface MimitosGameState {
  phase: MimitosGamePhase;
  timeLeft: number;
  tapsCount: number;
}

export class MimitosGame {
  private phase: MimitosGamePhase = 'playing';
  private timeLeft: number = 5; // 5 segundos
  private readonly maxTime: number = 5;
  private tapsCount: number = 0;

  constructor() {
    // Empieza directamente en 'playing'
    this.phase = 'playing';
    this.timeLeft = this.maxTime;
    this.tapsCount = 0;
    console.log('[MimitosGame] Started!');
  }

  start() {
    // Ya no es necesario, empieza automáticamente
    console.log('[MimitosGame] Already started in constructor');
  }

  update(deltaTime: number) {
    if (this.phase === 'playing') {
      this.timeLeft -= deltaTime;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.phase = 'finished';
        console.log(`[MimitosGame] Finished! Total taps: ${this.tapsCount}`);
      }
    }
  }

  tap() {
    if (this.phase === 'playing') {
      this.tapsCount++;
    }
  }

  getState(): MimitosGameState {
    return {
      phase: this.phase,
      timeLeft: this.timeLeft,
      tapsCount: this.tapsCount,
    };
  }

  getTapsCount(): number {
    return this.tapsCount;
  }

  getTimeProgress(): number {
    return this.timeLeft / this.maxTime;
  }

  reset() {
    this.phase = 'playing';
    this.timeLeft = this.maxTime;
    this.tapsCount = 0;
  }
}
