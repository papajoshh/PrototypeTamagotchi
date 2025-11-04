// GuessTheHigher Minigame - Game Logic
// El jugador adivina si su carta es mayor o menor que la carta oculta
export class GuessTheHigherGame {
    constructor() {
        this.state = 'transition';
        this.score = 0;
        this.timeLeft = 30;
        this.timerInterval = null;
        this.playerCard = null;
        this.opponentCard = null;
        this.waitingForChoice = false;
        this.lastGuessCorrect = null;
        this.MAX_TIME = 30; // 30 segundos
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
    startTimer() {
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
    finish() {
        this.state = 'finished';
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    dealCards() {
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
    guessHigher() {
        if (!this.waitingForChoice || !this.playerCard || !this.opponentCard)
            return;
        this.makeGuess(true);
    }
    guessLower() {
        if (!this.waitingForChoice || !this.playerCard || !this.opponentCard)
            return;
        this.makeGuess(false);
    }
    makeGuess(guessHigher) {
        if (!this.playerCard || !this.opponentCard)
            return;
        this.waitingForChoice = false;
        // Revelar carta del oponente
        this.opponentCard.revealed = true;
        // Verificar si es correcto
        const isCorrect = (guessHigher && this.playerCard.value > this.opponentCard.value) ||
            (!guessHigher && this.playerCard.value < this.opponentCard.value);
        this.lastGuessCorrect = isCorrect;
        if (isCorrect) {
            // Correcto: duplicar score (o comenzar en 1)
            this.score = this.score === 0 ? 1 : this.score * 2;
        }
        else {
            // Incorrecto: resetear a 0
            this.score = 0;
        }
        // NO repartir cartas nuevas aquí, el UI lo hará después de la animación
    }
    dealNewCards() {
        this.dealCards();
    }
    getState() {
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
    setState(newState) {
        this.state = newState;
    }
    getMaxTime() {
        return this.MAX_TIME;
    }
}
