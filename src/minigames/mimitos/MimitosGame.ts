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
  private finishedScreenDelay: number = 0; // Delay antes de permitir cerrar
  private readonly FINISHED_DELAY: number = 0.5; // 0.5 segundos de delay

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
        this.finishedScreenDelay = this.FINISHED_DELAY; // Iniciar delay
        console.log(`[MimitosGame] Finished! Total taps: ${this.tapsCount}`);
      }
    } else if (this.phase === 'finished' && this.finishedScreenDelay > 0) {
      // Contar delay antes de permitir cerrar
      this.finishedScreenDelay -= deltaTime;
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

  canClose(): boolean {
    // Solo se puede cerrar si está en finished Y el delay ha terminado
    return this.phase === 'finished' && this.finishedScreenDelay <= 0;
  }

  reset() {
    this.phase = 'playing';
    this.timeLeft = this.maxTime;
    this.tapsCount = 0;
    this.finishedScreenDelay = 0;
  }
}
