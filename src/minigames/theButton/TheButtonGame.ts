export type GameState = 'transition' | 'waiting' | 'playing' | 'finished';

export interface TheButtonGameState {
  score: number;
  timeLeft: number;
  state: GameState;
  maxTime: number;
  maxExpectedScore: number;
}

export class TheButtonGame {
  private score: number = 0;
  private timeLeft: number = 30;
  private state: GameState = 'transition';
  private readonly maxTime: number = 30;
  private readonly maxExpectedScore: number = 40;
  private timerInterval: number | null = null;

  getState(): TheButtonGameState {
    return {
      score: this.score,
      timeLeft: this.timeLeft,
      state: this.state,
      maxTime: this.maxTime,
      maxExpectedScore: this.maxExpectedScore
    };
  }

  start(): void {
    this.score = 0;
    this.timeLeft = this.maxTime;
    this.state = 'playing';
    this.startTimer();
  }

  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = window.setInterval(() => {
      this.timeLeft -= 0.1;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.finish();
      }
    }, 100);
  }

  press(): number {
    if (this.state !== 'playing') return this.score;

    // Lógica de probabilidad: 100 - (score * 0.4)%
    const random = Math.random() * 100;
    const successChance = 100 - (this.score * 0.4);

    if (random < successChance) {
      this.score++;
    } else {
      this.score = 0;
    }

    return this.score;
  }

  finish(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.state = 'finished';
  }

  reset(): void {
    this.score = 0;
    this.timeLeft = this.maxTime;
    this.state = 'transition';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  skipTransition(): void {
    this.state = 'waiting';
  }

  getScorePercentage(): number {
    return (this.score / this.maxExpectedScore) * 100;
  }

  // Calcula las recompensas basadas en el score final
  calculateRewards(): { tier1: number; tier2: number; tier3: number } {
    const percentage = this.getScorePercentage();

    // Siempre tier 1
    let tier1 = 1;
    let tier2 = 0;
    let tier3 = 0;

    if (percentage >= 30 && percentage < 70) {
      // 30-70%: tier 1 + tier 2
      tier2 = 1;
    } else if (percentage >= 70) {
      // >=70%: tier 1 + tier 3
      tier3 = 1;
    }

    return { tier1, tier2, tier3 };
  }
}
