import { SimonDiceGame } from './SimonDiceGame';
import { LifeStage } from '../../core/LifeStage';
export class SimonDiceUI {
    constructor(canvas, pet) {
        // Sprites
        this.eggSprite = null;
        this.clockSprite = null;
        this.petSprite = null;
        // Button sprites
        this.cloudSprite = null;
        this.starSprite = null;
        this.panelSprite = null;
        this.buttonBackgroundSprite = null;
        // UI sprites
        this.sequenceBubbleSprite = null;
        this.timesUpBackgroundSprite = null;
        this.timesUpLetterSprite = null;
        // Animation state
        this.transitionStartTime = 0;
        this.TRANSITION_DURATION = 2000; // 2 segundos
        this.countdownTimer = 0;
        this.countdownPhase = 'instruction';
        this.countdownPhaseStartTime = 0;
        this.shuffleAnimationProgress = 0;
        this.isShuffling = false;
        this.shuffleStartTime = 0;
        this.SHUFFLE_DURATION = 1000; // 1 segundo de animación
        this.postShuffleTimer = 0;
        this.sequenceDisplayTimer = 0;
        this.errorPauseTimer = 0;
        this.successPauseTimer = 0;
        // Button animation state
        this.buttonPressedType = null;
        this.buttonPressStartTime = 0;
        this.BUTTON_PRESS_DURATION = 200; // ms
        // Game over animation
        this.gameOverStartTime = 0;
        this.GAME_OVER_DURATION = 2300; // 2.3s total
        this.hasCalledOnGameEnd = false;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = new SimonDiceGame();
        this.pet = pet;
        this.transitionStartTime = Date.now();
        this.loadSprites();
        this.setupEventListeners();
    }
    loadSprites() {
        // Egg and common sprites
        this.eggSprite = new Image();
        this.eggSprite.src = '/assets/minigames/egg.png';
        this.clockSprite = new Image();
        this.clockSprite.src = '/assets/minigames/theButton/clock.png';
        // Button sprites
        this.cloudSprite = new Image();
        this.cloudSprite.src = '/assets/minigames/SimonDice/Cloud_black.png';
        this.starSprite = new Image();
        this.starSprite.src = '/assets/minigames/SimonDice/Star_black.png';
        this.panelSprite = new Image();
        this.panelSprite.src = '/assets/minigames/SimonDice/Panal_black.png';
        this.buttonBackgroundSprite = new Image();
        this.buttonBackgroundSprite.src = '/assets/minigames/SimonDice/BackgroundButton.png';
        // UI sprites
        this.sequenceBubbleSprite = new Image();
        this.sequenceBubbleSprite.src = '/assets/minigames/SimonDice/Bubble Sequence.png';
        this.timesUpBackgroundSprite = new Image();
        this.timesUpBackgroundSprite.src = '/assets/minigames/SimonDice/TimesUp_Background.png';
        this.timesUpLetterSprite = new Image();
        this.timesUpLetterSprite.src = '/assets/minigames/SimonDice/TIMES UP_letter.png';
    }
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleClick(x, y);
        });
    }
    handleClick(x, y) {
        const state = this.game.getState();
        if (state.state === 'waitingForInput') {
            // Check which button was clicked
            const buttonY = 450;
            const buttonHeight = 100;
            const buttonWidth = 100;
            // Get button positions (left to right: 0, 1, 2)
            const positions = [90, 190, 290]; // X positions for buttons
            // Find which button type is at each position
            const buttonAtPosition = {
                [state.buttonPositions.cloud]: 'cloud',
                [state.buttonPositions.star]: 'star',
                [state.buttonPositions.panel]: 'panel'
            };
            for (let i = 0; i < 3; i++) {
                const buttonX = positions[i];
                if (x >= buttonX && x <= buttonX + buttonWidth &&
                    y >= buttonY && y <= buttonY + buttonHeight) {
                    const clickedButton = buttonAtPosition[i];
                    this.game.pressButton(clickedButton);
                    this.buttonPressedType = clickedButton;
                    this.buttonPressStartTime = Date.now();
                    break;
                }
            }
        }
        else if (state.state === 'finished') {
            this.handleGameEnd();
        }
    }
    handleGameEnd() {
        if (this.hasCalledOnGameEnd)
            return;
        const scorePercentage = this.game.getScorePercentage();
        if (this.onGameEnd) {
            this.hasCalledOnGameEnd = true;
            this.onGameEnd(scorePercentage);
        }
    }
    setPetSprite(sprite) {
        this.petSprite = sprite;
    }
    render() {
        const state = this.game.getState();
        // Clear canvas
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (state.state === 'transition') {
            this.renderTransitionScreen();
            this.updateTransition();
        }
        else if (state.state === 'countdown') {
            this.renderCountdownScreen();
            this.updateCountdown();
        }
        else if (state.state === 'showingSequence') {
            this.renderPlayingScreen(state);
            this.updateShowingSequence(state);
        }
        else if (state.state === 'waitingForInput' || state.state === 'processingInput') {
            this.renderPlayingScreen(state);
            this.updateButtonPress();
        }
        else if (state.state === 'finished') {
            this.renderFinishedScreen(state);
        }
    }
    renderTransitionScreen() {
        this.ctx.save();
        const elapsed = Date.now() - this.transitionStartTime;
        const progress = Math.min(elapsed / this.TRANSITION_DURATION, 1);
        const eggX = this.canvas.width / 2;
        const eggY = this.canvas.height / 2;
        const canvasHeight = this.canvas.height;
        // Dos fases: 0-0.5 = crecer, 0.5-1.0 = encoger
        const isGrowing = progress < 0.5;
        const phaseProgress = isGrowing ? progress * 2 : (progress - 0.5) * 2;
        // Renderizar fondo base según la fase
        if (isGrowing) {
            // FASE 1: Fondo negro
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        else {
            // FASE 2: Fondo = pantalla de countdown (el cambio ocurre cuando está todo blanco)
            this.renderCountdownScreen();
        }
        // Franja blanca vertical (crece en fase 1, se encoge en fase 2)
        const whiteHeight = isGrowing
            ? canvasHeight * phaseProgress // Crece: 0 → 100%
            : canvasHeight * (1 - phaseProgress); // Se encoge: 100% → 0
        const whiteY = eggY - whiteHeight / 2;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, whiteY, this.canvas.width, whiteHeight);
        // Huevo negro (crece en fase 1, se encoge en fase 2)
        if (this.eggSprite && this.eggSprite.complete) {
            const eggSize = isGrowing
                ? 200 * phaseProgress // Crece: 0 → 200px
                : 200 * (1 - phaseProgress); // Se encoge: 200px → 0
            this.ctx.drawImage(this.eggSprite, eggX - eggSize / 2, eggY - eggSize / 2, eggSize, eggSize);
        }
        this.ctx.restore();
    }
    updateTransition() {
        const elapsed = Date.now() - this.transitionStartTime;
        if (elapsed >= this.TRANSITION_DURATION) {
            this.game.start();
            this.countdownPhaseStartTime = Date.now();
        }
    }
    renderCountdownScreen() {
        this.ctx.save();
        // Fondo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Título
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Simón Dice', this.canvas.width / 2, 80);
        // Mascota en el centro
        if (this.petSprite && this.petSprite.complete) {
            const maxHeight = 120;
            const aspectRatio = this.petSprite.width / this.petSprite.height;
            const petHeight = maxHeight;
            const petWidth = petHeight * aspectRatio;
            const petX = this.canvas.width / 2 - petWidth / 2;
            const petY = 150;
            this.ctx.drawImage(this.petSprite, petX, petY, petWidth, petHeight);
        }
        else {
            // Fallback to emoji
            this.ctx.font = '80px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const stageEmojis = {
                [LifeStage.Egg]: '🥚',
                [LifeStage.Baby]: '🐣',
                [LifeStage.Child]: '🐥',
                [LifeStage.Young]: '🦆',
                [LifeStage.Adult]: '🦢',
                [LifeStage.ReadyToAscend]: '✨',
                [LifeStage.Dead]: '💀',
            };
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(stageEmojis[this.pet.stage], this.canvas.width / 2, 210);
        }
        // Countdown text/instruction
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#000';
        if (this.countdownPhase === 'instruction') {
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText('Ojito con los', this.canvas.width / 2, 320);
            this.ctx.fillText('botones de abajo', this.canvas.width / 2, 355);
        }
        else if (this.countdownPhase === '3' || this.countdownPhase === '2' || this.countdownPhase === '1') {
            this.ctx.font = 'bold 80px Arial';
            this.ctx.fillText(this.countdownPhase, this.canvas.width / 2, 350);
        }
        else if (this.countdownPhase === 'vamo') {
            this.ctx.font = 'bold 60px Arial';
            this.ctx.fillText('¡VAMO!', this.canvas.width / 2, 350);
        }
        // Botones en la parte inferior (preview sin funcionalidad)
        this.renderButtons({}, true);
        this.ctx.restore();
    }
    updateCountdown() {
        const elapsed = Date.now() - this.countdownPhaseStartTime;
        if (this.countdownPhase === 'instruction' && elapsed >= 2000) {
            this.countdownPhase = '3';
            this.countdownPhaseStartTime = Date.now();
        }
        else if (this.countdownPhase === '3' && elapsed >= 1000) {
            this.countdownPhase = '2';
            this.countdownPhaseStartTime = Date.now();
        }
        else if (this.countdownPhase === '2' && elapsed >= 1000) {
            this.countdownPhase = '1';
            this.countdownPhaseStartTime = Date.now();
        }
        else if (this.countdownPhase === '1' && elapsed >= 1000) {
            this.countdownPhase = 'vamo';
            this.countdownPhaseStartTime = Date.now();
        }
        else if (this.countdownPhase === 'vamo' && elapsed >= 500) {
            this.countdownPhase = 'done';
            this.game.startGameplay();
            this.shuffleStartTime = Date.now();
            this.isShuffling = true;
        }
    }
    renderPlayingScreen(state) {
        this.ctx.save();
        // Fondo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Timer y Score en la parte superior
        const topY = 40;
        // Timer con icono de reloj
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        if (this.clockSprite && this.clockSprite.complete) {
            const clockSize = 30;
            this.ctx.drawImage(this.clockSprite, this.canvas.width / 2 - 100, topY - 20, clockSize, clockSize);
        }
        this.ctx.fillText(`${state.timeLeft.toFixed(1)}s`, this.canvas.width / 2 - 25, topY);
        // Score con multiplicador
        this.ctx.font = 'bold 32px Arial';
        const scoreText = state.scoreMultiplier > 1 ? `Score: ${state.score} (x${state.scoreMultiplier})` : `Score: ${state.score}`;
        this.ctx.fillText(scoreText, this.canvas.width / 2, topY + 50);
        // Sequence panel (siempre visible durante input)
        if (state.state === 'waitingForInput' || state.state === 'processingInput') {
            this.renderSequencePanel(state);
        }
        // Mascota en el centro
        if (this.petSprite && this.petSprite.complete) {
            const maxHeight = 100;
            const aspectRatio = this.petSprite.width / this.petSprite.height;
            const petHeight = maxHeight;
            const petWidth = petHeight * aspectRatio;
            const petX = this.canvas.width / 2 - petWidth / 2;
            const petY = 220;
            this.ctx.drawImage(this.petSprite, petX, petY, petWidth, petHeight);
        }
        else {
            // Fallback to emoji
            this.ctx.font = '60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const stageEmojis = {
                [LifeStage.Egg]: '🥚',
                [LifeStage.Baby]: '🐣',
                [LifeStage.Child]: '🐥',
                [LifeStage.Young]: '🦆',
                [LifeStage.Adult]: '🦢',
                [LifeStage.ReadyToAscend]: '✨',
                [LifeStage.Dead]: '💀',
            };
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(stageEmojis[this.pet.stage], this.canvas.width / 2, 270);
        }
        // Botones en la parte inferior
        this.renderButtons(state, false);
        this.ctx.restore();
    }
    renderSequencePanel(state) {
        this.ctx.save();
        // Panel de secuencia (arriba del pet)
        const panelX = this.canvas.width / 2 - 150;
        const panelY = 130;
        const panelW = 300;
        const panelH = 60;
        // Bubble background
        if (this.sequenceBubbleSprite && this.sequenceBubbleSprite.complete) {
            this.ctx.drawImage(this.sequenceBubbleSprite, panelX, panelY, panelW, panelH);
        }
        else {
            this.ctx.fillStyle = '#f0f0f0';
            this.ctx.fillRect(panelX, panelY, panelW, panelH);
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(panelX, panelY, panelW, panelH);
        }
        // Draw sequence icons
        const iconSize = 40;
        const iconSpacing = 80;
        const startX = panelX + 30;
        const iconY = panelY + 10;
        for (let i = 0; i < state.currentSequence.length; i++) {
            const buttonType = state.currentSequence[i];
            const sprite = this.getSpriteForButton(buttonType);
            const iconX = startX + i * iconSpacing;
            if (sprite && sprite.complete) {
                this.ctx.drawImage(sprite, iconX, iconY, iconSize, iconSize);
            }
        }
        this.ctx.restore();
    }
    renderButtons(state, isPreview) {
        this.ctx.save();
        const buttonY = 450;
        const buttonSize = 100;
        const positions = [90, 190, 290]; // X positions for buttons (left, center, right)
        // Get which button is at each position
        const buttonAtPosition = isPreview ? {
            0: 'cloud',
            1: 'star',
            2: 'panel'
        } : {
            [state.buttonPositions.cloud]: 'cloud',
            [state.buttonPositions.star]: 'star',
            [state.buttonPositions.panel]: 'panel'
        };
        for (let i = 0; i < 3; i++) {
            const buttonX = positions[i];
            const buttonType = buttonAtPosition[i];
            // Apply shuffle animation if active
            let finalX = buttonX;
            let scale = 1;
            let rotation = 0;
            if (this.isShuffling && !isPreview) {
                // Animate shuffle (simplificado sin tween)
                const progress = this.shuffleAnimationProgress;
                scale = 0.8 + 0.2 * Math.sin(progress * Math.PI);
                rotation = progress * 360 * (i % 2 === 0 ? 1 : -1);
            }
            // Apply button press animation
            if (this.buttonPressedType === buttonType && !isPreview) {
                const elapsed = Date.now() - this.buttonPressStartTime;
                if (elapsed < this.BUTTON_PRESS_DURATION) {
                    scale = 1.2 - (elapsed / this.BUTTON_PRESS_DURATION) * 0.2;
                }
            }
            this.ctx.save();
            this.ctx.translate(finalX + buttonSize / 2, buttonY + buttonSize / 2);
            this.ctx.rotate((rotation * Math.PI) / 180);
            this.ctx.scale(scale, scale);
            // Button background
            if (this.buttonBackgroundSprite && this.buttonBackgroundSprite.complete) {
                this.ctx.drawImage(this.buttonBackgroundSprite, -buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize);
            }
            else {
                this.ctx.fillStyle = '#e0e0e0';
                this.ctx.fillRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize);
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize);
            }
            // Button icon (visible if revealed or preview)
            const isRevealed = isPreview || state.revealedButtons?.includes(buttonType);
            if (isRevealed) {
                const sprite = this.getSpriteForButton(buttonType);
                const iconSize = 60;
                if (sprite && sprite.complete) {
                    this.ctx.drawImage(sprite, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
                }
            }
            this.ctx.restore();
        }
        this.ctx.restore();
    }
    getSpriteForButton(buttonType) {
        switch (buttonType) {
            case 'cloud': return this.cloudSprite;
            case 'star': return this.starSprite;
            case 'panel': return this.panelSprite;
            default: return null;
        }
    }
    updateShowingSequence(state) {
        // Handle shuffle animation
        if (this.isShuffling) {
            const elapsed = Date.now() - this.shuffleStartTime;
            this.shuffleAnimationProgress = Math.min(elapsed / this.SHUFFLE_DURATION, 1);
            if (elapsed >= this.SHUFFLE_DURATION) {
                this.isShuffling = false;
                this.postShuffleTimer = Date.now();
            }
        }
        else if (this.postShuffleTimer > 0) {
            // Post-shuffle delay
            const elapsed = Date.now() - this.postShuffleTimer;
            const delayMs = this.game.getPostShuffleDelay() * 1000;
            if (elapsed >= delayMs) {
                this.postShuffleTimer = 0;
                this.sequenceDisplayTimer = Date.now();
            }
        }
        else if (this.sequenceDisplayTimer > 0) {
            // Sequence display time
            const elapsed = Date.now() - this.sequenceDisplayTimer;
            const displayTimeMs = this.game.getSequenceDisplayTime() * state.currentSequence.length * 1000;
            if (elapsed >= displayTimeMs) {
                this.sequenceDisplayTimer = 0;
                this.game.finishShowingSequence();
            }
        }
    }
    updateButtonPress() {
        const elapsed = Date.now() - this.buttonPressStartTime;
        if (elapsed >= this.BUTTON_PRESS_DURATION) {
            this.buttonPressedType = null;
        }
    }
    renderFinishedScreen(state) {
        this.ctx.save();
        // Fondo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Game over animation
        const elapsed = Date.now() - (this.gameOverStartTime || Date.now());
        if (!this.gameOverStartTime) {
            this.gameOverStartTime = Date.now();
        }
        const canvasWidth = this.canvas.width;
        const centerX = canvasWidth / 2;
        const centerY = this.canvas.height / 2;
        // Background slides from left (0.1s)
        const bgProgress = Math.min(elapsed / 100, 1);
        const bgX = centerX - canvasWidth * (1 - bgProgress);
        if (this.timesUpBackgroundSprite && this.timesUpBackgroundSprite.complete) {
            this.ctx.drawImage(this.timesUpBackgroundSprite, bgX - 200, centerY - 100, 400, 200);
        }
        else {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(bgX - 200, centerY - 100, 400, 200);
        }
        // Letter enters from right with overshoot (0.2s after bg, total 0.3s)
        if (elapsed >= 100) {
            const letterElapsed = elapsed - 100;
            const letterProgress = Math.min(letterElapsed / 200, 1);
            // Ease out back for overshoot
            const easeProgress = letterProgress < 1 ?
                1 + 1.7 * Math.pow(letterProgress - 1, 3) + Math.pow(letterProgress - 1, 2) :
                letterProgress;
            const letterX = centerX + canvasWidth * (1 - easeProgress);
            if (this.timesUpLetterSprite && this.timesUpLetterSprite.complete) {
                this.ctx.drawImage(this.timesUpLetterSprite, letterX - 150, centerY - 60, 300, 120);
            }
            else {
                this.ctx.fillStyle = '#000';
                this.ctx.font = 'bold 48px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("TIME'S UP", letterX, centerY);
            }
        }
        // Score y recompensas debajo
        if (elapsed >= 300) {
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Score: ${state.score}`, centerX, centerY + 100);
            const rewards = this.game.calculateRewards();
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            let rewardY = centerY + 140;
            if (rewards.tier1 > 0) {
                this.ctx.fillText(`⭐ Ingrediente Básico x${rewards.tier1}`, centerX, rewardY);
                rewardY += 25;
            }
            if (rewards.tier2 > 0) {
                this.ctx.fillText(`⭐⭐ Ingrediente Medio x${rewards.tier2}`, centerX, rewardY);
                rewardY += 25;
            }
            if (rewards.tier3 > 0) {
                this.ctx.fillText(`⭐⭐⭐ Ingrediente Premium x${rewards.tier3}`, centerX, rewardY);
                rewardY += 25;
            }
            // Botón "Ver Recompensas"
            const buttonY = centerY + 180;
            const buttonW = 200;
            const buttonH = 50;
            const buttonX = centerX - buttonW / 2;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText('Ver Recompensas', centerX, buttonY + 33);
        }
        this.ctx.restore();
    }
    reset() {
        this.game.reset();
        this.transitionStartTime = Date.now();
        this.countdownPhase = 'instruction';
        this.countdownPhaseStartTime = 0;
        this.isShuffling = false;
        this.shuffleAnimationProgress = 0;
        this.postShuffleTimer = 0;
        this.sequenceDisplayTimer = 0;
        this.buttonPressedType = null;
        this.gameOverStartTime = 0;
        this.hasCalledOnGameEnd = false;
    }
    destroy() {
        this.game.reset();
    }
}
