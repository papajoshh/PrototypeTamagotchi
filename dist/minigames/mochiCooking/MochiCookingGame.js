export class MochiCookingGame {
    constructor(tier = 1) {
        this.state = 'waiting';
        this.tier = 1;
        this.score = 30;
        this.maxScore = 330;
        this.roundStep = 'tap1';
        this.currentTarget = null;
        this.currentSwipe = null;
        this.stepStartTime = 0;
        this.circleProgress = 0;
        this.roundsCompleted = 0;
        this.isStunned = false;
        this.stunEndTime = 0;
        this.showFeedback = false;
        this.feedbackType = null;
        this.feedbackStartTime = 0;
        this.hammerAngle = 0;
        this.hammerAnimating = false;
        this.hammerHitProgress = 0; // 0-1 para animación de golpe
        // Configuración por tier
        this.CIRCLE_DURATION_BY_TIER = [2000, 1500, 1000]; // 2s, 1.5s, 1s
        this.COOLDOWN_BY_TIER = [1000, 500, 250]; // ms
        this.PENALTY_BY_TIER = [10, 30, 50];
        this.MAX_SCORE_BY_TIER = [330, 430, 510];
        this.REWARD_PER_STEP = 10;
        this.STUN_DURATION = 1000; // 1s
        this.FEEDBACK_DURATION = 500; // 0.5s
        // Geometría
        this.MOCHI_RADIUS = 0.3; // Radio de la circunferencia normalizado
        this.tier = Math.max(1, Math.min(3, tier));
        this.maxScore = this.MAX_SCORE_BY_TIER[this.tier - 1];
    }
    start() {
        this.state = 'playing';
        this.score = 30;
        this.roundsCompleted = 0;
        this.roundStep = 'tap1';
        this.isStunned = false;
        this.showFeedback = false;
        this.feedbackType = null;
        this.hammerAnimating = false;
        this.startNewStep('tap1');
    }
    update(deltaTime) {
        if (this.state !== 'playing')
            return;
        const now = Date.now();
        // Update feedback
        if (this.showFeedback && now - this.feedbackStartTime > this.FEEDBACK_DURATION) {
            this.showFeedback = false;
            this.feedbackType = null;
        }
        // Update stun
        if (this.isStunned && now >= this.stunEndTime) {
            this.isStunned = false;
            this.startNewStep('tap1');
            return;
        }
        if (this.isStunned)
            return;
        // Update hammer hit animation
        if (this.hammerAnimating) {
            // Animación de golpe: 300ms
            const hammerElapsed = now - this.stepStartTime;
            if (hammerElapsed < 300) {
                // Progreso del golpe (0 -> 1 -> 0)
                const rawProgress = hammerElapsed / 300;
                this.hammerHitProgress = rawProgress < 0.5
                    ? rawProgress * 2 // 0 -> 1 en primera mitad
                    : 2 - rawProgress * 2; // 1 -> 0 en segunda mitad
            }
            else {
                this.hammerAnimating = false;
                this.hammerHitProgress = 0;
                this.roundStep = 'cooldown';
                this.stepStartTime = now;
            }
            return;
        }
        // Update cooldown
        if (this.roundStep === 'cooldown') {
            const cooldownTime = this.COOLDOWN_BY_TIER[this.tier - 1];
            if (now - this.stepStartTime >= cooldownTime) {
                // Check win condition
                if (this.score >= this.maxScore) {
                    this.state = 'finished';
                    return;
                }
                this.startNewStep('tap1');
            }
            return;
        }
        // Update circle progress
        if (this.roundStep === 'tap1' || this.roundStep === 'tap2_drag') {
            const elapsed = now - this.stepStartTime;
            const circleDuration = this.CIRCLE_DURATION_BY_TIER[this.tier - 1];
            this.circleProgress = Math.min(elapsed / circleDuration, 1);
            // Auto-fail if circle completes without tap
            if (this.circleProgress >= 1 && !this.isStunned) {
                this.handleMiss();
            }
        }
    }
    startNewStep(step) {
        this.roundStep = step;
        this.stepStartTime = Date.now();
        this.circleProgress = 0;
        if (step === 'tap1') {
            this.currentTarget = this.generateRandomCircleTarget();
            this.currentSwipe = null;
        }
        else if (step === 'tap2_drag') {
            this.currentSwipe = this.generateSwipeTarget();
            this.currentTarget = this.currentSwipe.startCircle;
        }
    }
    generateRandomCircleTarget() {
        const angle = Math.random() * Math.PI * 2;
        return {
            angle,
            x: 0.5 + Math.cos(angle) * this.MOCHI_RADIUS,
            y: 0.5 + Math.sin(angle) * this.MOCHI_RADIUS
        };
    }
    generateSwipeTarget() {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const startAngle = Math.random() * Math.PI * 2;
        const startCircle = {
            angle: startAngle,
            x: 0.5 + Math.cos(startAngle) * this.MOCHI_RADIUS,
            y: 0.5 + Math.sin(startAngle) * this.MOCHI_RADIUS
        };
        // Calcular ángulo final basado en dirección
        const directionAngles = {
            'N': -Math.PI / 2,
            'NE': -Math.PI / 4,
            'E': 0,
            'SE': Math.PI / 4,
            'S': Math.PI / 2,
            'SW': 3 * Math.PI / 4,
            'W': Math.PI,
            'NW': -3 * Math.PI / 4
        };
        const endAngle = startAngle + Math.PI; // Lado opuesto
        const endCircle = {
            angle: endAngle,
            x: 0.5 + Math.cos(endAngle) * this.MOCHI_RADIUS,
            y: 0.5 + Math.sin(endAngle) * this.MOCHI_RADIUS
        };
        return {
            startCircle,
            direction,
            endCircle
        };
    }
    handleTap(x, y) {
        if (this.state !== 'playing' || this.isStunned || this.hammerAnimating)
            return;
        if (this.roundStep === 'cooldown')
            return;
        const now = Date.now();
        const elapsed = now - this.stepStartTime;
        // Check if tap is within timing window (not too early, not too late)
        if (this.circleProgress < 0.2 || this.circleProgress >= 1) {
            this.handleMiss();
            return;
        }
        // Check if tap is near target
        const distance = Math.sqrt(Math.pow(x - this.currentTarget.x, 2) +
            Math.pow(y - this.currentTarget.y, 2));
        if (distance > 0.15) { // Tolerancia de 15% del canvas
            this.handleMiss();
            return;
        }
        // Success!
        this.handleHit();
        if (this.roundStep === 'tap1') {
            this.startNewStep('tap2_drag');
        }
    }
    handleSwipe(startX, startY, endX, endY) {
        if (this.state !== 'playing' || this.isStunned || this.hammerAnimating)
            return;
        if (this.roundStep !== 'tap2_drag')
            return;
        // Check timing
        if (this.circleProgress < 0.2 || this.circleProgress >= 1) {
            this.handleMiss();
            return;
        }
        // Check if swipe starts near target
        const startDistance = Math.sqrt(Math.pow(startX - this.currentSwipe.startCircle.x, 2) +
            Math.pow(startY - this.currentSwipe.startCircle.y, 2));
        if (startDistance > 0.15) {
            this.handleMiss();
            return;
        }
        // Check swipe direction
        const swipeAngle = Math.atan2(endY - startY, endX - startX);
        const expectedAngle = this.getDirectionAngle(this.currentSwipe.direction);
        const angleDiff = Math.abs(swipeAngle - expectedAngle);
        // Tolerancia de 45 grados (PI/4)
        if (angleDiff > Math.PI / 4 && angleDiff < 2 * Math.PI - Math.PI / 4) {
            this.handleMiss();
            return;
        }
        // Check if swipe passes through center and reaches opposite side
        const swipeLength = Math.sqrt(Math.pow(endX - startX, 2) +
            Math.pow(endY - startY, 2));
        if (swipeLength < this.MOCHI_RADIUS * 1.5) { // Debe cruzar el diámetro
            this.handleMiss();
            return;
        }
        // Success!
        this.handleHit();
        this.completeRound();
    }
    getDirectionAngle(direction) {
        const angles = {
            'N': -Math.PI / 2,
            'NE': -Math.PI / 4,
            'E': 0,
            'SE': Math.PI / 4,
            'S': Math.PI / 2,
            'SW': 3 * Math.PI / 4,
            'W': Math.PI,
            'NW': -3 * Math.PI / 4
        };
        return angles[direction];
    }
    handleHit() {
        this.score += this.REWARD_PER_STEP;
        this.score = Math.min(this.score, this.maxScore);
    }
    handleMiss() {
        const penalty = this.PENALTY_BY_TIER[this.tier - 1];
        this.score -= penalty;
        // Show feedback
        this.showFeedback = true;
        this.feedbackType = 'AUCH';
        this.feedbackStartTime = Date.now();
        if (this.score <= 0) {
            this.score = 0;
            this.state = 'finished';
            return;
        }
        // Stun
        this.isStunned = true;
        this.stunEndTime = Date.now() + this.STUN_DURATION;
    }
    completeRound() {
        this.roundsCompleted++;
        // Show feedback
        this.showFeedback = true;
        this.feedbackType = 'YES';
        this.feedbackStartTime = Date.now();
        // Start hammer animation
        this.roundStep = 'hammer';
        this.hammerAnimating = true;
        this.hammerAngle = this.currentTarget.angle;
        this.stepStartTime = Date.now();
    }
    getState() {
        return {
            state: this.state,
            tier: this.tier,
            score: this.score,
            maxScore: this.maxScore,
            roundStep: this.roundStep,
            currentTarget: this.currentTarget,
            currentSwipe: this.currentSwipe,
            stepStartTime: this.stepStartTime,
            circleProgress: this.circleProgress,
            roundsCompleted: this.roundsCompleted,
            isStunned: this.isStunned,
            stunEndTime: this.stunEndTime,
            showFeedback: this.showFeedback,
            feedbackType: this.feedbackType,
            feedbackStartTime: this.feedbackStartTime,
            hammerAngle: this.hammerAngle,
            hammerAnimating: this.hammerAnimating,
            hammerHitProgress: this.hammerHitProgress
        };
    }
    reset() {
        this.state = 'waiting';
        this.score = 30;
        this.roundsCompleted = 0;
        this.roundStep = 'tap1';
        this.currentTarget = null;
        this.currentSwipe = null;
        this.isStunned = false;
        this.showFeedback = false;
        this.feedbackType = null;
        this.hammerAnimating = false;
    }
}
