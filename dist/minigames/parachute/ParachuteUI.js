import { ParachuteGame } from './ParachuteGame';
import { LifeStage } from '../../core/LifeStage';
export class ParachuteUI {
    constructor(canvas, pet) {
        // Sprites
        this.eggSprite = null;
        this.clockSprite = null;
        this.petSprite = null;
        this.timesUpBackgroundSprite = null;
        this.timesUpLetterSprite = null;
        // Object sprites
        this.basketSprite = null;
        this.coinSprite = null; // Moneda
        this.starSprite = null; // reeedm
        this.diamondSprite = null; // savings
        this.poopSprite = null;
        this.nukeSprite = null;
        // Animation state
        this.transitionStartTime = 0;
        this.TRANSITION_DURATION = 2000; // 2 segundos
        // Game state
        this.lastFrameTime = 0;
        // Input state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.keysPressed = new Set();
        // Game over animation
        this.gameOverStartTime = 0;
        this.hasCalledOnGameEnd = false;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = new ParachuteGame();
        this.pet = pet;
        this.transitionStartTime = Date.now();
        this.lastFrameTime = Date.now();
        this.loadSprites();
        this.setupEventListeners();
    }
    loadSprites() {
        // Common sprites
        this.eggSprite = new Image();
        this.eggSprite.src = '/assets/minigames/egg.png';
        this.clockSprite = new Image();
        this.clockSprite.src = '/assets/minigames/theButton/clock.png';
        this.timesUpBackgroundSprite = new Image();
        this.timesUpBackgroundSprite.src = '/assets/minigames/TimesUp_Background.png';
        this.timesUpLetterSprite = new Image();
        this.timesUpLetterSprite.src = '/assets/minigames/TIMES UP_letter.png';
        // Object sprites
        this.basketSprite = new Image();
        this.basketSprite.src = '/assets/minigames/Parachute/Canasta.png';
        this.coinSprite = new Image();
        this.coinSprite.src = '/assets/minigames/Parachute/Moneda.png';
        this.starSprite = new Image();
        this.starSprite.src = '/assets/minigames/Parachute/redeem.png';
        this.diamondSprite = new Image();
        this.diamondSprite.src = '/assets/minigames/Parachute/savings.png';
        this.poopSprite = new Image();
        this.poopSprite.src = '/assets/minigames/Parachute/Caca.png';
        this.nukeSprite = new Image();
        this.nukeSprite.src = '/assets/minigames/Parachute/NUKE.png';
    }
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleMouseDown(x, y);
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            this.handleMouseMove(x);
        });
        this.canvas.addEventListener('mouseup', () => {
            this.handleMouseUp();
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.handleMouseUp();
        });
        // Touch events (for mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.handleMouseDown(x, y);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            this.handleMouseMove(x);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleMouseUp();
        });
        // Keyboard controls (arrow keys) - continuous movement
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    handleMouseDown(x, y) {
        const state = this.game.getState();
        if (state.state === 'waiting') {
            // Click to start
            const buttonX = this.canvas.width / 2 - 100;
            const buttonY = 480;
            const buttonW = 200;
            const buttonH = 60;
            if (x >= buttonX && x <= buttonX + buttonW &&
                y >= buttonY && y <= buttonY + buttonH) {
                this.game.start();
            }
        }
        else if (state.state === 'playing') {
            this.isDragging = true;
            this.lastMouseX = x;
        }
        else if (state.state === 'finished') {
            this.handleGameEnd();
        }
    }
    handleMouseMove(x) {
        const state = this.game.getState();
        if (state.state === 'playing' && this.isDragging) {
            // Seguir directamente la posición del cursor (más velocidad)
            const targetX = x / this.canvas.width; // Normalizado 0-1
            const currentX = state.playerX;
            // Mover hacia el target con interpolación muy rápida
            const deltaX = (targetX - currentX) * 0.4; // 40% del camino cada frame = muy rápido y smooth
            const deltaTime = (Date.now() - this.lastFrameTime) / 1000;
            this.game.movePlayer(deltaX, deltaTime);
            this.lastMouseX = x;
        }
    }
    handleMouseUp() {
        this.isDragging = false;
    }
    handleKeyDown(e) {
        // Solo trackear teclas de flecha
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.keysPressed.add(e.key);
        }
    }
    handleKeyUp(e) {
        // Remover tecla cuando se suelta
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.keysPressed.delete(e.key);
        }
    }
    updateKeyboardMovement(deltaTime) {
        const state = this.game.getState();
        if (state.state !== 'playing')
            return;
        // Movimiento continuo basado en teclas presionadas
        let direction = 0;
        if (this.keysPressed.has('ArrowLeft'))
            direction -= 1;
        if (this.keysPressed.has('ArrowRight'))
            direction += 1;
        if (direction !== 0) {
            // Movimiento MUY rápido y smooth (doble de velocidad)
            const moveSpeed = 1.6; // Velocidad por segundo (0-1) - DOBLE velocidad
            this.game.movePlayer(direction * moveSpeed * deltaTime, deltaTime);
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
        const now = Date.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        const state = this.game.getState();
        // Update keyboard movement (smooth continuous movement)
        this.updateKeyboardMovement(deltaTime);
        // Update game logic
        this.game.update(deltaTime);
        // Clear canvas
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (state.state === 'transition') {
            this.renderTransitionScreen();
            this.updateTransition();
        }
        else if (state.state === 'waiting') {
            this.renderWaitingScreen();
        }
        else if (state.state === 'playing') {
            this.renderPlayingScreen(state, deltaTime);
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
            // FASE 2: Fondo = pantalla de waiting
            this.renderWaitingScreen();
        }
        // Franja blanca vertical (crece en fase 1, se encoge en fase 2)
        const whiteHeight = isGrowing
            ? canvasHeight * phaseProgress
            : canvasHeight * (1 - phaseProgress);
        const whiteY = eggY - whiteHeight / 2;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, whiteY, this.canvas.width, whiteHeight);
        // Huevo negro (crece en fase 1, se encoge en fase 2)
        if (this.eggSprite && this.eggSprite.complete && this.eggSprite.naturalWidth > 0) {
            const eggSize = isGrowing
                ? 200 * phaseProgress
                : 200 * (1 - phaseProgress);
            this.ctx.drawImage(this.eggSprite, eggX - eggSize / 2, eggY - eggSize / 2, eggSize, eggSize);
        }
        this.ctx.restore();
    }
    updateTransition() {
        const elapsed = Date.now() - this.transitionStartTime;
        if (elapsed >= this.TRANSITION_DURATION) {
            this.game.setState('waiting');
        }
    }
    renderWaitingScreen() {
        this.ctx.save();
        // Fondo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Título
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Parachute', this.canvas.width / 2, 80);
        // Instrucciones
        this.ctx.font = '18px Arial';
        this.ctx.fillText('¡Arrastra o usa flechas para mover!', this.canvas.width / 2, 130);
        this.ctx.fillText('Recoge monedas y evita las cacas', this.canvas.width / 2, 160);
        this.ctx.fillText('Duración: 30 segundos', this.canvas.width / 2, 190);
        // Mascota en el centro
        if (this.petSprite && this.petSprite.complete && this.petSprite.naturalWidth > 0) {
            const maxHeight = 120;
            const aspectRatio = this.petSprite.width / this.petSprite.height;
            const petHeight = maxHeight;
            const petWidth = petHeight * aspectRatio;
            const petX = this.canvas.width / 2 - petWidth / 2;
            const petY = 220;
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
            this.ctx.fillText(stageEmojis[this.pet.stage], this.canvas.width / 2, 280);
        }
        // Botón de inicio
        const buttonX = this.canvas.width / 2 - 100;
        const buttonY = 480;
        const buttonW = 200;
        const buttonH = 60;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('¡Empezar!', this.canvas.width / 2, buttonY + 40);
        this.ctx.restore();
    }
    renderPlayingScreen(state, deltaTime) {
        this.ctx.save();
        // Fondo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Preparar flash blanco y BOOOM (se renderizarán al final)
        // El flash dura todo el stun hasta que queda 1 segundo
        let showBoomAndFlash = false;
        let flashAlpha = 0;
        if (state.isStunned && state.stunTimeLeft > 1) {
            // Flash visible mientras stunTimeLeft > 1
            // Alpha máximo al inicio, se mantiene y empieza a fade cuando se acerca a 1s
            const timeUntilFadeStart = state.stunTimeLeft - 1;
            flashAlpha = Math.min(timeUntilFadeStart / 0.5, 0.8); // Max 0.8 alpha, fade en los últimos 0.5s
            showBoomAndFlash = true;
        }
        else if (state.showWhiteFlash) {
            // Limpiar flag si aún está activo
            this.game.clearWhiteFlash();
        }
        // Score y Timer en la parte superior
        const topY = 40;
        // Timer con icono de reloj
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        if (this.clockSprite && this.clockSprite.complete && this.clockSprite.naturalWidth > 0) {
            const clockSize = 30;
            this.ctx.drawImage(this.clockSprite, this.canvas.width / 2 - 100, topY - 20, clockSize, clockSize);
        }
        const timerText = state.isStunned
            ? `${state.timeLeft.toFixed(1)}s (STUN!)`
            : `${state.timeLeft.toFixed(1)}s`;
        this.ctx.fillText(timerText, this.canvas.width / 2 - 25, topY);
        // Score
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillText(`Score: ${state.score}`, this.canvas.width / 2, topY + 50);
        // Render falling objects
        state.fallingObjects.forEach(obj => {
            if (!obj.collected) {
                this.renderFallingObject(obj);
            }
        });
        // Render player (basket con mascota)
        this.renderPlayer(state);
        // Render score popups
        this.renderScorePopups(state);
        // Flash blanco y BOOOM text (renderizado AL FINAL encima de todo)
        if (showBoomAndFlash) {
            // Flash blanco
            this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            // BOOOM text encima del flash
            this.ctx.save();
            this.ctx.globalAlpha = flashAlpha;
            this.ctx.font = 'bold 120px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            // Outline negro grueso
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 10;
            this.ctx.strokeText('BOOOM!', centerX, centerY);
            // Texto rojo
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillText('BOOOM!', centerX, centerY);
            this.ctx.restore();
        }
        this.ctx.restore();
    }
    renderFallingObject(obj) {
        const objectSize = 50;
        const x = obj.x * this.canvas.width;
        const y = obj.y * this.canvas.height;
        let sprite = null;
        switch (obj.type) {
            case 'coin':
                sprite = this.coinSprite;
                break;
            case 'star':
                sprite = this.starSprite;
                break;
            case 'diamond':
                sprite = this.diamondSprite;
                break;
            case 'poop':
                sprite = this.poopSprite;
                break;
            case 'bomb':
                sprite = this.nukeSprite;
                break;
        }
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            const aspectRatio = sprite.width / sprite.height;
            let w = objectSize;
            let h = objectSize;
            if (aspectRatio > 1) {
                h = w / aspectRatio;
            }
            else {
                w = h * aspectRatio;
            }
            this.ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
        }
        else {
            // Fallback: draw colored circle (cuando el sprite no existe o no se cargó)
            this.ctx.fillStyle = obj.type === 'poop' || obj.type === 'bomb' ? '#8B4513' : '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(x, y, objectSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    renderPlayer(state) {
        const playerY = this.canvas.height * 0.85; // Posición fija en la parte inferior
        const playerX = state.playerX * this.canvas.width;
        const playerSize = 80;
        // Render basket
        if (this.basketSprite && this.basketSprite.complete && this.basketSprite.naturalWidth > 0) {
            const aspectRatio = this.basketSprite.width / this.basketSprite.height;
            let w = playerSize;
            let h = playerSize;
            if (aspectRatio > 1) {
                h = w / aspectRatio;
            }
            else {
                w = h * aspectRatio;
            }
            this.ctx.drawImage(this.basketSprite, playerX - w / 2, playerY - h / 2, w, h);
        }
        else {
            // Fallback: draw rect
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(playerX - playerSize / 2, playerY - 20, playerSize, 40);
        }
        // Render pet below basket (smaller)
        if (this.petSprite && this.petSprite.complete && this.petSprite.naturalWidth > 0) {
            const petSize = 40;
            const aspectRatio = this.petSprite.width / this.petSprite.height;
            let w = petSize;
            let h = petSize;
            if (aspectRatio > 1) {
                h = w / aspectRatio;
            }
            else {
                w = h * aspectRatio;
            }
            this.ctx.drawImage(this.petSprite, playerX - w / 2, playerY + 10, w, h);
        }
        else {
            // Fallback: usar el mismo emoji que en el main room
            const stageEmojis = {
                [LifeStage.Egg]: '🥚',
                [LifeStage.Baby]: '🐣',
                [LifeStage.Child]: '🐥',
                [LifeStage.Young]: '🦆',
                [LifeStage.Adult]: '🦢',
                [LifeStage.ReadyToAscend]: '✨',
                [LifeStage.Dead]: '💀',
            };
            this.ctx.font = '35px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(stageEmojis[this.pet.stage], playerX, playerY + 30);
        }
        // Stun indicator (below player, not overlapping timer)
        if (state.isStunned) {
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = '#FF0000';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`STUN! (${state.stunTimeLeft.toFixed(1)}s)`, playerX, playerY + 60);
        }
    }
    renderScorePopups(state) {
        const now = Date.now();
        state.scorePopups.forEach(popup => {
            const elapsed = now - popup.spawnTime;
            const progress = Math.min(elapsed / 1000, 1); // 1 segundo de duración
            // Movement: start from collection point, move up 60px
            const startY = popup.y * this.canvas.height;
            const moveDistance = 60;
            const currentY = startY - (moveDistance * progress);
            // Fade out
            const alpha = 1 - progress;
            // Color based on value
            const isPositive = popup.value > 0;
            const color = isPositive ? '#00FF00' : '#FF0000';
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = color;
            this.ctx.textAlign = 'center';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            const text = isPositive ? `+${popup.value}` : `${popup.value}`;
            const x = popup.x * this.canvas.width;
            // Stroke (outline) for visibility
            this.ctx.strokeText(text, x, currentY);
            this.ctx.fillText(text, x, currentY);
            this.ctx.restore();
        });
    }
    renderFinishedScreen(state) {
        this.ctx.save();
        // Fondo blanco completo
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // ============ Animación Times Up ============
        const elapsed = Date.now() - (this.gameOverStartTime || Date.now());
        if (!this.gameOverStartTime) {
            this.gameOverStartTime = Date.now();
        }
        const canvasWidth = this.canvas.width;
        const centerX = canvasWidth / 2;
        const centerY = 200;
        // Background entra desde la izquierda (0.1s)
        const bgProgress = Math.min(elapsed / 100, 1);
        const bgX = centerX - canvasWidth * (1 - bgProgress);
        if (this.timesUpBackgroundSprite && this.timesUpBackgroundSprite.complete && this.timesUpBackgroundSprite.naturalWidth > 0) {
            const bgMaxW = 400;
            const bgMaxH = 120;
            const bgAspect = this.timesUpBackgroundSprite.width / this.timesUpBackgroundSprite.height;
            let bgW = bgMaxW;
            let bgH = bgMaxH;
            if (bgAspect > bgMaxW / bgMaxH) {
                bgH = bgW / bgAspect;
            }
            else {
                bgW = bgH * bgAspect;
            }
            this.ctx.drawImage(this.timesUpBackgroundSprite, bgX - bgW / 2, centerY - bgH / 2, bgW, bgH);
        }
        // Letter entra desde la derecha con overshoot (0.2s después del bg)
        if (elapsed >= 100) {
            const letterElapsed = elapsed - 100;
            const letterProgress = Math.min(letterElapsed / 200, 1);
            const easeProgress = letterProgress < 1
                ? 1 + 1.7 * Math.pow(letterProgress - 1, 3) + Math.pow(letterProgress - 1, 2)
                : letterProgress;
            const letterX = centerX + canvasWidth * (1 - easeProgress);
            if (this.timesUpLetterSprite && this.timesUpLetterSprite.complete && this.timesUpLetterSprite.naturalWidth > 0) {
                const letterMaxW = 400;
                const letterMaxH = 120;
                const letterAspect = this.timesUpLetterSprite.width / this.timesUpLetterSprite.height;
                let letterW = letterMaxW;
                let letterH = letterMaxH;
                if (letterAspect > letterMaxW / letterMaxH) {
                    letterH = letterW / letterAspect;
                }
                else {
                    letterW = letterH * letterAspect;
                }
                this.ctx.drawImage(this.timesUpLetterSprite, letterX - letterW / 2, centerY - letterH / 2, letterW, letterH);
            }
        }
        // Score y premios aparecen después de 300ms
        if (elapsed >= 300) {
            // Score final
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${state.score}`, centerX, centerY + 100);
            // Mostrar premios ganados
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
        this.lastFrameTime = Date.now();
        this.isDragging = false;
        this.hasCalledOnGameEnd = false;
        this.gameOverStartTime = 0;
        this.keysPressed.clear(); // Limpiar teclas presionadas
    }
    destroy() {
        this.game.reset();
    }
}
