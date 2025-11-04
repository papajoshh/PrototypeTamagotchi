// EdgyBunBun Minigame - Game Logic
// El jugador salta entre plataformas izquierda/derecha subiendo de altura
export class EdgyBunBunGame {
    constructor() {
        this.state = 'transition';
        this.score = 0;
        this.maxHeight = 0;
        this.timeLeft = 60;
        this.levels = new Map();
        this.isFalling = false;
        this.timerInterval = null;
        // Posiciones para animación
        this.jumpStartY = 0;
        this.jumpStartX = 'left';
        this.fallStartY = 0;
        this.fallStartX = 'left';
        this.MAX_TIME = 30; // 30 segundos
        this.STUN_TIME = 2; // 2 segundos de aturdimiento
        this.BUFFER_SIZE = 10; // Niveles por delante a generar
        this.bunBun = {
            x: 'left',
            y: 0,
            canMove: true,
            isStunned: false
        };
        this.generateInitialLevels();
    }
    generateInitialLevels() {
        for (let i = 1; i <= 20; i++) {
            this.levels.set(i, this.generateLevel());
        }
    }
    generateLevel() {
        // Siempre hay al menos 1 plataforma (izquierda o derecha)
        const firstOnLeft = Math.random() > 0.5;
        const level = {
            left: firstOnLeft ? this.generatePlatform(true) : null,
            right: !firstOnLeft ? this.generatePlatform(true) : null
        };
        // 20% de probabilidad de segunda plataforma
        if (Math.random() > 0.8) {
            if (level.left) {
                level.right = this.generatePlatform(false);
            }
            else {
                level.left = this.generatePlatform(false);
            }
        }
        return level;
    }
    generatePlatform(isFirstPlatform) {
        // Si es la primera plataforma del nivel, siempre standard
        if (isFirstPlatform) {
            return { type: 'standard', canLand: true };
        }
        // Segunda plataforma: puede ser standard, stun o soft
        const rand = Math.random();
        if (rand < 0.5) {
            return { type: 'standard', canLand: true };
        }
        else if (rand < 0.75) {
            return { type: 'stun', canLand: true };
        }
        else {
            return { type: 'soft', canLand: false };
        }
    }
    ensureLevelsAvailable() {
        const maxLevel = Math.max(...Array.from(this.levels.keys()));
        const currentLevel = this.bunBun.y;
        // Si nos acercamos al final, generar más niveles
        if (currentLevel > maxLevel - this.BUFFER_SIZE) {
            for (let i = 0; i < 30; i++) {
                this.levels.set(maxLevel + i + 1, this.generateLevel());
            }
        }
        // Limpiar niveles antiguos (20 niveles por debajo)
        const cleanupThreshold = currentLevel - 20;
        for (const key of Array.from(this.levels.keys())) {
            if (key < cleanupThreshold) {
                this.levels.delete(key);
            }
        }
    }
    start() {
        this.state = 'playing';
        this.timeLeft = this.MAX_TIME;
        this.score = 0;
        this.maxHeight = 0;
        this.bunBun = {
            x: 'left',
            y: 0,
            canMove: true,
            isStunned: false
        };
        this.startTimer();
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
    update(deltaTime) {
        // No se necesita update para el timer, usamos setInterval
    }
    jump(side) {
        if (this.state !== 'playing')
            return;
        if (this.bunBun.isStunned)
            return;
        if (!this.bunBun.canMove)
            return;
        if (this.isFalling)
            return;
        // Guardar posición de inicio para animación
        this.jumpStartX = this.bunBun.x;
        this.jumpStartY = this.bunBun.y;
        // SIEMPRE permitir saltar (aunque no haya plataforma) - validación de Unity
        // Saltar al lado indicado (sube 1 nivel)
        this.bunBun.x = side;
        this.bunBun.y++;
        this.ensureLevelsAvailable();
        // NO llamar a handleFall() aquí - la UI lo hará después de la animación de salto
    }
    // Verificar si puede aterrizar en la posición actual
    canLandOnCurrentPosition() {
        const level = this.levels.get(this.bunBun.y);
        if (!level) {
            return false; // No hay nivel generado
        }
        const platform = this.bunBun.x === 'left' ? level.left : level.right;
        if (!platform || !platform.canLand) {
            return false; // No hay plataforma o es soft
        }
        return true; // Puede aterrizar
    }
    // Procesar aterrizaje exitoso
    processLanding() {
        const level = this.levels.get(this.bunBun.y);
        if (!level)
            return;
        const platform = this.bunBun.x === 'left' ? level.left : level.right;
        if (!platform)
            return;
        // Actualizar altura máxima
        if (this.bunBun.y > this.maxHeight) {
            this.maxHeight = this.bunBun.y;
            this.score = this.maxHeight;
        }
        // Aplicar efecto de la plataforma
        if (platform.type === 'stun') {
            this.stun();
        }
    }
    handleFall() {
        this.isFalling = true;
        // Guardar posición de inicio de caída para animación
        this.fallStartY = this.bunBun.y;
        this.fallStartX = this.bunBun.x; // Guardar también la posición X
        const landingLevel = this.findNextLandingLevel();
        this.bunBun.y = landingLevel;
        this.isFalling = false;
    }
    findNextLandingLevel() {
        const currentHeight = this.bunBun.y;
        const onLeft = this.bunBun.x === 'left';
        for (let i = currentHeight - 1; i >= 0; i--) {
            const level = this.levels.get(i);
            if (!level)
                continue;
            if (onLeft && level.left && level.left.canLand) {
                return i;
            }
            if (!onLeft && level.right && level.right.canLand) {
                return i;
            }
        }
        return 0; // Caer al suelo
    }
    stun() {
        this.bunBun.isStunned = true;
        this.bunBun.canMove = false;
        // Recuperarse después de STUN_TIME segundos
        // Nota: El sistema de update no maneja este delay automáticamente,
        // se debe llamar a recover() desde fuera después del tiempo
    }
    recover() {
        this.bunBun.isStunned = false;
        this.bunBun.canMove = true;
    }
    getState() {
        return {
            state: this.state,
            score: this.score,
            maxHeight: this.maxHeight,
            timeLeft: this.timeLeft,
            bunBun: { ...this.bunBun },
            levels: new Map(this.levels),
            isFalling: this.isFalling,
            jumpStartY: this.jumpStartY,
            jumpStartX: this.jumpStartX,
            fallStartY: this.fallStartY,
            fallStartX: this.fallStartX
        };
    }
    setState(newState) {
        this.state = newState;
    }
    getMaxTime() {
        return this.MAX_TIME;
    }
    getStunTime() {
        return this.STUN_TIME;
    }
}
