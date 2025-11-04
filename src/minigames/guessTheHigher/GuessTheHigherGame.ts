// GuessTheHigher Minigame - Game Logic
// El jugador adivina si su carta es mayor o menor que la carta oculta

export type GameState = 'transition' | 'waiting' | 'playing' | 'finished';

export interface Card {
  value: number; // 1-10
  revealed: boolean;
}

export interface GuessTheHigherGameState {
  state: GameState;
  score: number;
  timeLeft: number;
  playerCard: Card | null;
  opponentCard: Card | null;
  waitingForChoice: boolean;
  lastGuessCorrect: boolean | null;
}

export class GuessTheHigherGame {
  private state: GameState = 'transition';
  private score: number = 0;
  private timeLeft: number = 30;
  private timerInterval: number | null = null;

  private playerCard: Card | null = null;
  private opponentCard: Card | null = null;
  private waitingForChoice: boolean = false;
  private lastGuessCorrect: boolean | null = null;

  private readonly MAX_TIME = 30; // 30 segundos

  constructor() {
    // Inicializa en estado transition
  }

  start() {
    this.state = 'playing';
    this.timeLeft = this.MAX_TIME;
    this.score = 0;
    this.lastGuessCorrect = null;
    this.startTimer();
    this.dealCards(); // Primera ronda
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

  private finish(): void {
    this.state = 'finished';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private dealCards(): void {
    // Generar cartas (1-10)
    const availableCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Carta del jugador
    const playerIndex = Math.floor(Math.random() * availableCards.length);
    const playerValue = availableCards[playerIndex];
    availableCards.splice(playerIndex, 1);

    // Carta del oponente (de las cartas restantes)
    const opponentIndex = Math.floor(Math.random() * availableCards.length);
    const opponentValue = availableCards[opponentIndex];

    this.playerCard = { value: playerValue, revealed: true };
    this.opponentCard = { value: opponentValue, revealed: false };
    this.waitingForChoice = true;
    this.lastGuessCorrect = null;
  }

  guessHigher(): void {
    if (!this.waitingForChoice || !this.playerCard || !this.opponentCard) return;
    this.makeGuess(true);
  }

  guessLower(): void {
    if (!this.waitingForChoice || !this.playerCard || !this.opponentCard) return;
    this.makeGuess(false);
  }

  private makeGuess(guessHigher: boolean): void {
    if (!this.playerCard || !this.opponentCard) return;

    this.waitingForChoice = false;

    // Revelar carta del oponente
    this.opponentCard.revealed = true;

    // Verificar si es correcto
    const isCorrect =
      (guessHigher && this.playerCard.value > this.opponentCard.value) ||
      (!guessHigher && this.playerCard.value < this.opponentCard.value);

    this.lastGuessCorrect = isCorrect;

    if (isCorrect) {
      // Correcto: duplicar score (o comenzar en 1)
      this.score = this.score === 0 ? 1 : this.score * 2;
    } else {
      // Incorrecto: resetear a 0
      this.score = 0;
    }

    // NO repartir cartas nuevas aquí, el UI lo hará después de la animación
  }

  dealNewCards(): void {
    this.dealCards();
  }

  getState(): GuessTheHigherGameState {
    return {
      state: this.state,
      score: this.score,
      timeLeft: this.timeLeft,
      playerCard: this.playerCard ? { ...this.playerCard } : null,
      opponentCard: this.opponentCard ? { ...this.opponentCard } : null,
      waitingForChoice: this.waitingForChoice,
      lastGuessCorrect: this.lastGuessCorrect,
    };
  }

  setState(newState: GameState) {
    this.state = newState;
  }

  getMaxTime(): number {
    return this.MAX_TIME;
  }
}
