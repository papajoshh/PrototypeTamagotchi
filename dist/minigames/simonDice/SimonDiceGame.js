// SimonDice Minigame - Game Logic
// El jugador debe repetir una secuencia de 3 botones (Cloud, Star, Panel)
export class SimonDiceGame {
    constructor() {
        this.state = 'transition';
        this.score = 0;
        this.timeLeft = 60;
        this.timerInterval = null;
        this.currentSequence = [];
        this.currentInputIndex = 0;
        this.correctStreakCount = 0;
        this.scoreMultiplier = 1;
        // Button positions (0=left, 1=center, 2=right)
        this.buttonPositions = {
            cloud: 0,
            star: 1,
            panel: 2
        };
        this.revealedButtons = [];
        // Countdown state
        this.countdownValue = 3;
        this.isShowingInstruction = true;
        this.MAX_TIME = 30; // 30 segundos
        this.BASE_SCORE = 1;
        this.SEQUENCE_DISPLAY_TIME = 0.3; // segundos por botón (0.9s total)
        this.POST_SHUFFLE_DELAY = 2; // segundos después del shuffle
        this.ERROR_PAUSE_DURATION = 1; // segundos de pausa tras error
    }
    start() {
        this.state = 'countdown';
        this.timeLeft = this.MAX_TIME;
        this.score = 0;
        this.correctStreakCount = 0;
        this.scoreMultiplier = 1;
        this.countdownValue = 3;
        this.isShowingInstruction = true;
    }
    // Llamado desde UI cuando termina el countdown
    startGameplay() {
        this.state = 'showingSequence';
        this.startTimer();
        this.generateNewSequence();
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
    generateNewSequence() {
        // Shuffle button positions
        this.shuffleButtonPositions();
        // Generate sequence of 3 unique buttons (no repetition)
        const availableButtons = ['cloud', 'star', 'panel'];
        this.currentSequence = [];
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * availableButtons.length);
            this.currentSequence.push(availableButtons[randomIndex]);
            availableButtons.splice(randomIndex, 1);
        }
        this.currentInputIndex = 0;
        this.revealedButtons = [];
    }
    shuffleButtonPositions() {
        // Create array [0, 1, 2] and shuffle it
        const positions = [0, 1, 2];
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        // Assign shuffled positions to buttons
        this.buttonPositions.cloud = positions[0];
        this.buttonPositions.star = positions[1];
        this.buttonPositions.panel = positions[2];
    }
    // Llamado desde UI cuando termina la animación de shuffle + delay
    finishShowingSequence() {
        this.state = 'waitingForInput';
    }
    // Press button by TYPE (not position)
    pressButton(buttonType) {
        if (this.state !== 'waitingForInput')
            return false;
        this.state = 'processingInput';
        const expectedButton = this.currentSequence[this.currentInputIndex];
        if (buttonType === expectedButton) {
            // Correct input
            this.revealedButtons.push(buttonType);
            this.currentInputIndex++;
            if (this.currentInputIndex >= this.currentSequence.length) {
                // Sequence completed successfully
                this.onSequenceSuccess();
            }
            else {
                // Wait for next input
                this.state = 'waitingForInput';
            }
            return true;
        }
        else {
            // Wrong input - don't change state, let UI handle the pause
            this.onSequenceError();
            return false;
        }
    }
    onSequenceSuccess() {
        // Update score
        this.score += this.BASE_SCORE * this.scoreMultiplier;
        this.correctStreakCount++;
        // Check for multiplier
        if (this.correctStreakCount >= 5) {
            this.scoreMultiplier = 2;
        }
        // Start new sequence after small delay (handled by UI)
        // Don't change state here - UI will handle the success pause and then call startNewSequenceAfterSuccess
    }
    startNewSequenceAfterSuccess() {
        this.state = 'showingSequence';
        this.generateNewSequence();
    }
    onSequenceError() {
        // Reset streak and multiplier
        this.correctStreakCount = 0;
        this.scoreMultiplier = 1;
        // Show new sequence after error pause (handled by UI)
        // Don't change state here - UI will handle the error pause and then call startNewSequenceAfterError
    }
    startNewSequenceAfterError() {
        this.state = 'showingSequence';
        this.generateNewSequence();
    }
    getState() {
        return {
            state: this.state,
            score: this.score,
            timeLeft: this.timeLeft,
            currentSequence: [...this.currentSequence],
            currentInputIndex: this.currentInputIndex,
            correctStreakCount: this.correctStreakCount,
            scoreMultiplier: this.scoreMultiplier,
            buttonPositions: { ...this.buttonPositions },
            revealedButtons: [...this.revealedButtons],
            countdownValue: this.countdownValue,
            isShowingInstruction: this.isShowingInstruction
        };
    }
    setState(newState) {
        this.state = newState;
    }
    setCountdownValue(value) {
        this.countdownValue = value;
    }
    setShowingInstruction(value) {
        this.isShowingInstruction = value;
    }
    getMaxTime() {
        return this.MAX_TIME;
    }
    getSequenceDisplayTime() {
        return this.SEQUENCE_DISPLAY_TIME;
    }
    getPostShuffleDelay() {
        return this.POST_SHUFFLE_DELAY;
    }
    getErrorPauseDuration() {
        return this.ERROR_PAUSE_DURATION;
    }
    calculateRewards() {
        const maxExpectedScore = 5;
        const scorePercentage = (this.score / maxExpectedScore) * 100;
        let tier1 = 0;
        let tier2 = 0;
        let tier3 = 0;
        // Siempre obtienes Tier 1
        tier1 = 1;
        // Si score >= 30% y < 70%, obtienes Tier 2 extra
        if (scorePercentage >= 30 && scorePercentage < 70) {
            tier2 = 1;
        }
        // Si score >= 70%, obtienes Tier 3 extra (en lugar de Tier 2)
        if (scorePercentage >= 70) {
            tier3 = 1;
        }
        return { tier1, tier2, tier3 };
    }
    getScorePercentage() {
        const maxExpectedScore = 5;
        return (this.score / maxExpectedScore) * 100;
    }
    reset() {
        this.state = 'transition';
        this.score = 0;
        this.timeLeft = this.MAX_TIME;
        this.correctStreakCount = 0;
        this.scoreMultiplier = 1;
        this.currentSequence = [];
        this.currentInputIndex = 0;
        this.revealedButtons = [];
        this.countdownValue = 3;
        this.isShowingInstruction = true;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}
