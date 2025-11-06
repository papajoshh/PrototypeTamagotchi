import { EdgyBunBunGame } from './EdgyBunBunGame';
import { LifeStage } from '../../core/LifeStage';
export class EdgyBunBunUI {
    constructor(canvas, pet) {
        // Sprites
        this.petSprite = null;
        this.eggSprite = null;
        this.platformSprite = null;
        this.stunPlatformSprite = null;
        this.softPlatformSprite = null;
        this.timesUpBackgroundSprite = null;
        this.timesUpLetterSprite = null;
        // Animación de transición
        this.transitionStartTime = 0;
        this.TRANSITION_DURATION = 2000; // 2 segundos
        // Estado visual
        this.jumpAnimationProgress = 0;
        this.fallAnimationProgress = 0;
        this.isJumping = false;
        this.isFalling = false;
        this.stunTimer = 0;
        this.gameOverStartTime = 0;
        // Posiciones para animación
        this.previousY = 0;
        this.previousX = 'left';
        // Cámara suave
        this.cameraY = 0; // Posición actual de cámara (interpolada)
        this.hasCalledOnGameEnd = false;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = new EdgyBunBunGame();
        this.pet = pet;
        this.transitionStartTime = Date.now();
        this.loadSprites();
        this.setupEventListeners();
    }
    loadSprites() {
        // Plataformas
        this.platformSprite = new Image();
        this.platformSprite.src = '/assets/minigames/EdgyBunBun/Platform.png';
        this.stunPlatformSprite = new Image();
        this.stunPlatformSprite.src = '/assets/minigames/EdgyBunBun/Stun_platform.png';
        this.softPlatformSprite = new Image();
        this.softPlatformSprite.src = '/assets/minigames/EdgyBunBun/Transparent_platform.png';
        // Huevo para transición
        this.eggSprite = new Image();
        this.eggSprite.src = '/assets/minigames/egg.png';
        // Times Up animation
        this.timesUpBackgroundSprite = new Image();
        this.timesUpBackgroundSprite.src = '/assets/minigames/TimesUp_Background.png';
        this.timesUpLetterSprite = new Image();
        this.timesUpLetterSprite.src = '/assets/minigames/TIMES UP_letter.png';
    }
    setupEventListeners() {
        // Click/tap en mitades de la pantalla
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        // Control con teclado (flechas izquierda/derecha)
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
    handleClick(e) {
        const state = this.game.getState();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (state.state === 'waiting') {
            // Click en botón de inicio
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
            // Click en mitades de pantalla para saltar
            const side = x < this.canvas.width / 2 ? 'left' : 'right';
            this.jump(side);
        }
        else if (state.state === 'finished') {
            // Click en botón "Ver Recompensas"
            const panelY = 150;
            const panelH = 300;
            const buttonX = this.canvas.width / 2 - 100;
            const buttonY = panelY + panelH - 80; // Sincronizado con renderFinishedScreen
            const buttonW = 200;
            const buttonH = 50;
            if (x >= buttonX && x <= buttonX + buttonW &&
                y >= buttonY && y <= buttonY + buttonH) {
                this.handleGameEnd();
            }
        }
    }
    handleGameEnd() {
        // Prevenir múltiples llamadas
        if (this.hasCalledOnGameEnd)
            return;
        const state = this.game.getState();
        const maxExpectedScore = 85;
        const scorePercentage = Math.min((state.score / maxExpectedScore) * 100, 100);
        if (this.onGameEnd) {
            this.hasCalledOnGameEnd = true;
            this.onGameEnd(scorePercentage);
        }
    }
    handleKeyDown(e) {
        const state = this.game.getState();
        // Solo procesar teclas durante el juego
        if (state.state !== 'playing')
            return;
        // Flechas izquierda/derecha
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.jump('left');
        }
        else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.jump('right');
        }
    }
    jump(side) {
        const state = this.game.getState();
        if (!state.bunBun.canMove || this.isJumping || this.isFalling)
            return;
        // Guardar posición anterior para animación
        this.previousY = state.bunBun.y;
        this.previousX = state.bunBun.x;
        this.game.jump(side);
        this.isJumping = true;
        this.jumpAnimationProgress = 0;
        // Animación de salto
        const animateDuration = 180; // 180ms (0.18 segundos)
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            this.jumpAnimationProgress = Math.min(elapsed / animateDuration, 1);
            if (this.jumpAnimationProgress < 1) {
                requestAnimationFrame(animate);
            }
            else {
                this.isJumping = false;
                // Después de completar el salto, verificar si puede aterrizar
                if (this.game.canLandOnCurrentPosition()) {
                    // Aterrizaje exitoso
                    this.game.processLanding();
                    const newState = this.game.getState();
                    // Si está aturdido, iniciar timer de stun
                    if (newState.bunBun.isStunned) {
                        this.startStunTimer();
                    }
                }
                else {
                    // No puede aterrizar → caer hasta la siguiente plataforma sólida
                    this.game.handleFall();
                    // Animar caída
                    this.animateFall();
                }
            }
        };
        animate();
    }
    animateFall() {
        // Las posiciones de inicio de caída ya están guardadas en el estado del juego
        this.isFalling = true;
        this.fallAnimationProgress = 0;
        const state = this.game.getState();
        // Calcular distancia de caída (en niveles)
        const fallDistance = state.fallStartY - state.bunBun.y;
        // Velocidad base: 80ms por nivel (mucho más rápida)
        const fallTimePerLevel = 80; // ms por nivel
        const animateDuration = fallDistance * fallTimePerLevel;
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const linearProgress = Math.min(elapsed / animateDuration, 1);
            // Aplicar ease-in cuadrático para simular gravedad (acelera mientras cae)
            // progress² hace que empiece lento y termine rápido
            this.fallAnimationProgress = linearProgress * linearProgress;
            if (linearProgress < 1) {
                requestAnimationFrame(animate);
            }
            else {
                this.isFalling = false;
                this.fallAnimationProgress = 1; // Asegurar que llega al final
                // handleFall() ya ha calculado la plataforma sólida correcta,
                // así que siempre aterrizamos en una plataforma válida aquí.
                // Solo procesamos el aterrizaje.
                this.game.processLanding();
                const newState = this.game.getState();
                // Si aterrizó en plataforma stun, aplicar efecto
                if (newState.bunBun.isStunned) {
                    this.startStunTimer();
                }
            }
        };
        animate();
    }
    startStunTimer() {
        this.stunTimer = this.game.getStunTime();
        const interval = setInterval(() => {
            this.stunTimer -= 0.1;
            if (this.stunTimer <= 0) {
                clearInterval(interval);
                this.game.recover();
            }
        }, 100);
    }
    setPetSprite(sprite) {
        this.petSprite = sprite;
    }
    update(deltaTime) {
        this.game.update(deltaTime);
    }
    render() {
        const state = this.game.getState();
        // Verificar transición automáticamente
        if (state.state === 'transition') {
            const elapsed = Date.now() - this.transitionStartTime;
            if (elapsed >= this.TRANSITION_DURATION) {
                this.game.setState('waiting');
            }
        }
        // Limpiar canvas solo si NO es transición (la transición tiene su propio fondo)
        if (state.state !== 'transition') {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        if (state.state === 'transition') {
            this.renderTransitionScreen();
        }
        else if (state.state === 'waiting') {
            this.renderWaitingScreen();
        }
        else if (state.state === 'playing') {
            this.renderPlayingScreen(state);
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
    renderWaitingScreen() {
        this.ctx.save();
        // Fondo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Título
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Edgy BunBun', this.canvas.width / 2, 150);
        // Instrucciones
        this.ctx.font = '18px Arial';
        this.ctx.fillText('¡Salta entre plataformas!', this.canvas.width / 2, 200);
        this.ctx.fillText('Tap izquierda/derecha para saltar', this.canvas.width / 2, 230);
        // Mascota en el centro
        if (this.petSprite && this.petSprite.complete) {
            const maxHeight = 150;
            const aspectRatio = this.petSprite.width / this.petSprite.height;
            const petHeight = maxHeight;
            const petWidth = petHeight * aspectRatio;
            const petX = this.canvas.width / 2 - petWidth / 2;
            const petY = 260;
            this.ctx.drawImage(this.petSprite, petX, petY, petWidth, petHeight);
        }
        else {
            // Fallback to emoji if no sprite
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
            this.ctx.fillText(stageEmojis[this.pet.stage], this.canvas.width / 2, 310);
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
    renderPlayingScreen(state) {
        this.ctx.save();
        // Fondo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Timer y Score en la parte superior
        const topY = 40;
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`⏱️ ${state.timeLeft.toFixed(1)}s`, this.canvas.width / 2 - 120, topY);
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillText(`Score: ${state.score}`, this.canvas.width / 2 + 120, topY);
        // Renderizar plataformas y mascota
        this.renderGameArea(state);
        // Indicadores de tap
        this.ctx.fillStyle = '#ccc';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('TAP', this.canvas.width / 4, this.canvas.height - 20);
        this.ctx.fillText('TAP', (this.canvas.width * 3) / 4, this.canvas.height - 20);
        // Indicador de stun
        if (state.bunBun.isStunned && this.stunTimer > 0) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#f00';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('STUNNED!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`${this.stunTimer.toFixed(1)}s`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
        this.ctx.restore();
    }
    renderGameArea(state) {
        // Área de juego: 480x400px (dejando espacio para UI arriba y abajo)
        const gameAreaY = 80;
        const gameAreaHeight = 480;
        const platformHeight = 40;
        const platformSpacing = 70; // Espacio vertical entre plataformas
        const platformWidth = 150; // Reducido para evitar choque en el centro
        const maxVisibleLevels = 10;
        // Calcular posición Y animada actual del BunBun
        let currentBunBunY = state.bunBun.y;
        let isAnimating = false;
        if (this.isJumping && this.jumpAnimationProgress < 1) {
            // Durante salto: interpolar entre posición inicial y final
            const startY = state.jumpStartY;
            const targetY = state.bunBun.y;
            currentBunBunY = startY + (targetY - startY) * this.jumpAnimationProgress;
            isAnimating = true;
        }
        else if (this.isFalling && this.fallAnimationProgress < 1) {
            // Durante caída: interpolar entre posición inicial de caída y final
            const startY = state.fallStartY;
            const targetY = state.bunBun.y;
            currentBunBunY = startY + (targetY - startY) * this.fallAnimationProgress;
            isAnimating = true;
        }
        // Cámara smooth: seguir directamente durante animaciones, suave cuando está parado
        if (isAnimating) {
            // Durante animaciones: seguir EXACTAMENTE la posición del BunBun (sin lag)
            this.cameraY = currentBunBunY;
        }
        else {
            // Cuando está parado: movimiento suave con interpolación
            const smoothFactor = 0.3;
            this.cameraY += (currentBunBunY - this.cameraY) * smoothFactor;
        }
        // Calcular rango de niveles visibles usando la posición CONTINUA de la cámara
        // No usar Math.floor para evitar saltos discretos
        const minLevel = Math.max(0, Math.floor(this.cameraY - 3));
        const maxLevel = minLevel + maxVisibleLevels;
        // Renderizar plataformas
        for (let i = minLevel; i <= maxLevel; i++) {
            const level = state.levels.get(i);
            if (!level)
                continue;
            // Usar la diferencia CONTINUA entre el nivel y la cámara (sin redondear)
            // Esto hace que las plataformas se muevan pixel a pixel suavemente
            const levelY = gameAreaY + gameAreaHeight - ((i - this.cameraY) * platformSpacing) - platformHeight;
            // Plataforma izquierda
            if (level.left) {
                this.renderPlatform(80, levelY, platformWidth, platformHeight, level.left.type, 'left');
            }
            // Plataforma derecha
            if (level.right) {
                this.renderPlatform(this.canvas.width - 80 - platformWidth, levelY, platformWidth, platformHeight, level.right.type, 'right');
            }
        }
        // Renderizar BunBun con animación
        this.renderBunBun(state, minLevel, gameAreaY, gameAreaHeight, platformSpacing);
    }
    renderPlatform(x, y, w, h, type, side) {
        let sprite = this.platformSprite;
        if (type === 'stun') {
            sprite = this.stunPlatformSprite;
        }
        else if (type === 'soft') {
            sprite = this.softPlatformSprite;
        }
        if (sprite && sprite.complete) {
            this.ctx.save();
            // Flipear horizontalmente para el lado izquierdo
            if (side === 'left') {
                this.ctx.translate(x + w, y);
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(sprite, 0, 0, w, h);
            }
            else {
                this.ctx.drawImage(sprite, x, y, w, h);
            }
            this.ctx.restore();
        }
        else {
            // Fallback si no carga el sprite
            if (type === 'stun') {
                this.ctx.fillStyle = '#f00';
            }
            else if (type === 'soft') {
                this.ctx.fillStyle = '#888';
            }
            else {
                this.ctx.fillStyle = '#000';
            }
            this.ctx.fillRect(x, y, w, h);
        }
    }
    renderBunBun(state, minLevel, gameAreaY, gameAreaHeight, platformSpacing) {
        const maxHeight = 80;
        const platformWidth = 150;
        const platformHeight = 40;
        // Determinar dimensiones (sprite o emoji)
        let petWidth, petHeight;
        if (this.petSprite && this.petSprite.complete) {
            const aspectRatio = this.petSprite.width / this.petSprite.height;
            petHeight = maxHeight;
            petWidth = petHeight * aspectRatio;
        }
        else {
            // Para emoji, usar tamaño fijo
            petWidth = maxHeight;
            petHeight = maxHeight;
        }
        // Calcular posiciones finales (destino) usando posición CONTINUA de la cámara
        const targetLevelY = gameAreaY + gameAreaHeight - ((state.bunBun.y - this.cameraY) * platformSpacing) - platformHeight;
        let targetPetX;
        if (state.bunBun.x === 'left') {
            targetPetX = 80 + platformWidth / 2 - petWidth / 2;
        }
        else {
            targetPetX = this.canvas.width - 80 - platformWidth + platformWidth / 2 - petWidth / 2;
        }
        const targetPetY = targetLevelY - petHeight;
        // Calcular posiciones iniciales (origen) usando las posiciones guardadas en el estado
        let startPetX;
        const startX = this.isJumping ? state.jumpStartX : (this.isFalling ? state.fallStartX : state.bunBun.x);
        const startY = this.isJumping ? state.jumpStartY : (this.isFalling ? state.fallStartY : state.bunBun.y);
        if (startX === 'left') {
            startPetX = 80 + platformWidth / 2 - petWidth / 2;
        }
        else {
            startPetX = this.canvas.width - 80 - platformWidth + platformWidth / 2 - petWidth / 2;
        }
        // Usar posición CONTINUA de la cámara para calcular startLevelY también
        const startLevelY = gameAreaY + gameAreaHeight - ((startY - this.cameraY) * platformSpacing) - platformHeight;
        const startPetY = startLevelY - petHeight;
        // Interpolación durante animaciones
        let petX = targetPetX;
        let petY = targetPetY;
        if (this.isJumping && this.jumpAnimationProgress < 1) {
            // Interpolar posición desde origen a destino
            petX = startPetX + (targetPetX - startPetX) * this.jumpAnimationProgress;
            petY = startPetY + (targetPetY - startPetY) * this.jumpAnimationProgress;
            // Agregar arco parabólico (hacia arriba)
            const jumpHeight = 30;
            const arcProgress = Math.sin(this.jumpAnimationProgress * Math.PI);
            petY -= jumpHeight * arcProgress;
        }
        else if (this.isFalling && this.fallAnimationProgress < 1) {
            // Durante la caída, interpolar desde la posición del salto fallido hasta la plataforma de aterrizaje
            petX = startPetX + (targetPetX - startPetX) * this.fallAnimationProgress;
            petY = startPetY + (targetPetY - startPetY) * this.fallAnimationProgress;
            // Sin arco durante caída, solo movimiento directo
        }
        // Renderizar sprite o emoji
        if (this.petSprite && this.petSprite.complete) {
            this.ctx.drawImage(this.petSprite, petX, petY, petWidth, petHeight);
        }
        else {
            // Fallback to emoji
            this.ctx.save();
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
            this.ctx.fillText(stageEmojis[this.pet.stage], petX + petWidth / 2, petY + petHeight / 2);
            this.ctx.restore();
        }
    }
    renderFinishedScreen(state) {
        this.ctx.save();
        // Fondo blanco completo (animación Times Up)
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
        if (this.timesUpBackgroundSprite && this.timesUpBackgroundSprite.complete) {
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
            if (this.timesUpLetterSprite && this.timesUpLetterSprite.complete) {
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
            // Score final (altura)
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${state.score}`, centerX, centerY + 100);
            // Calcular premios según porcentaje
            const maxExpectedScore = 85;
            const scorePercentage = Math.min((state.score / maxExpectedScore) * 100, 100);
            // Calcular recompensas
            const rewards = {
                tier1: 0,
                tier2: 0,
                tier3: 0
            };
            if (scorePercentage < 30) {
                rewards.tier1 = 1;
            }
            else if (scorePercentage < 70) {
                rewards.tier1 = 1;
                rewards.tier2 = 1;
            }
            else {
                rewards.tier1 = 1;
                rewards.tier3 = 1;
            }
            // Mostrar premios ganados (centrados)
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
            // Botón para continuar (centrado)
            const buttonX = centerX - 100;
            const buttonY = centerY + 200;
            const buttonW = 200;
            const buttonH = 50;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Ver Recompensas', centerX, buttonY + 33);
        }
        this.ctx.restore();
    }
    cleanup() {
        // Limpiar event listeners si es necesario
    }
}
