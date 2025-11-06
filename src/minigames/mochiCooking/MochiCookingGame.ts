// MochiCooking Minigame - Game Logic
export type MochiCookingPhase = 'waiting' | 'playing' | 'finished';
export type RoundStep = 'tap1' | 'tap2_drag' | 'hammer' | 'cooldown' | 'stunned';
export type SwipeDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface CircleTarget {
  angle: number; // Ángulo en radianes alrededor del mochi
  x: number; // Posición normalizada 0-1
  y: number; // Posición normalizada 0-1
}

export interface SwipeTarget {
  startCircle: CircleTarget;
  direction: SwipeDirection;
  endCircle: CircleTarget;
}

export interface MochiCookingGameState {
  state: MochiCookingPhase;
  tier: number; // 1, 2, 3
  score: number; // Barra de progreso
  maxScore: number; // Objetivo para ganar

  // Round actual
  roundStep: RoundStep;
  currentTarget: CircleTarget | null;
  currentSwipe: SwipeTarget | null;

  // Timing
  stepStartTime: number;
  circleProgress: number; // 0-1, 1 = círculo cerrado completamente

  // Estado
  roundsCompleted: number;
  isStunned: boolean;
  stunEndTime: number;

  // Feedback
  showFeedback: boolean;
  feedbackType: 'YES' | 'AUCH' | null;
  feedbackStartTime: number;

  // Hammer animation
  hammerAngle: number;
  hammerAnimating: boolean;
  hammerHitProgress: number; // 0-1

  // Swipe tracking
  swipeMoveProgress: number; // 0-1, progreso del movimiento automático del círculo
  isFollowing: boolean; // Si el jugador está siguiendo el círculo actualmente
}

export class MochiCookingGame {
  private state: MochiCookingPhase = 'waiting';
  private tier: number = 1;
  private score: number = 30;
  private maxScore: number = 330;

  private roundStep: RoundStep = 'tap1';
  private currentTarget: CircleTarget | null = null;
  private currentSwipe: SwipeTarget | null = null;

  private stepStartTime: number = 0;
  private circleProgress: number = 0;

  private roundsCompleted: number = 0;
  private isStunned: boolean = false;
  private stunEndTime: number = 0;

  private showFeedback: boolean = false;
  private feedbackType: 'YES' | 'AUCH' | null = null;
  private feedbackStartTime: number = 0;

  private hammerAngle: number = 0;
  private hammerAnimating: boolean = false;
  private hammerHitProgress: number = 0; // 0-1 para animación de golpe

  // Swipe tracking
  private swipeMoveProgress: number = 0; // 0-1, progreso del movimiento del círculo
  private isFollowing: boolean = false; // Si el jugador está siguiendo

  // Configuración por tier
  private readonly CIRCLE_DURATION_BY_TIER = [2000, 1500, 1000]; // 2s, 1.5s, 1s
  private readonly COOLDOWN_BY_TIER = [1000, 500, 250]; // ms
  private readonly PENALTY_BY_TIER = [10, 30, 50];
  private readonly MAX_SCORE_BY_TIER = [330, 430, 510];
  private readonly REWARD_PER_STEP = 10;
  private readonly STUN_DURATION = 1000; // 1s
  private readonly FEEDBACK_DURATION = 500; // 0.5s
  private readonly SWIPE_MOVE_DURATION_BY_TIER = [2000, 1500, 1000]; // Duración del movimiento del círculo
  private readonly FOLLOW_TOLERANCE = 0.15; // Distancia máxima del dedo al círculo

  // Geometría (normalizado 0-1, basado en canvas 480x640)
  private readonly MOCHI_RADIUS = 0.3; // Radio de la circunferencia normalizado
  private readonly MOCHI_CENTER_X = 0.5; // Centro X del mochi normalizado
  private readonly MOCHI_CENTER_Y = 400 / 640; // Centro Y del mochi normalizado (~0.625)

  constructor(tier: number = 1) {
    this.tier = Math.max(1, Math.min(3, tier));
    this.maxScore = this.MAX_SCORE_BY_TIER[this.tier - 1];
  }

  start(): void {
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

  update(deltaTime: number): void {
    if (this.state !== 'playing') return;

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

    if (this.isStunned) return;

    // Update hammer hit animation
    if (this.hammerAnimating) {
      // Animación de golpe: 300ms
      const hammerElapsed = now - this.stepStartTime;
      if (hammerElapsed < 300) {
        // Progreso del golpe (0 -> 1 -> 0)
        const rawProgress = hammerElapsed / 300;
        this.hammerHitProgress = rawProgress < 0.5
          ? rawProgress * 2  // 0 -> 1 en primera mitad
          : 2 - rawProgress * 2; // 1 -> 0 en segunda mitad
      } else {
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
    if (this.roundStep === 'tap1') {
      const elapsed = now - this.stepStartTime;
      const circleDuration = this.CIRCLE_DURATION_BY_TIER[this.tier - 1];
      this.circleProgress = Math.min(elapsed / circleDuration, 1);

      // Auto-fail if circle completes without tap
      if (this.circleProgress >= 1 && !this.isStunned) {
        this.handleMiss();
      }
    } else if (this.roundStep === 'tap2_drag') {
      const elapsed = now - this.stepStartTime;
      const circleDuration = this.CIRCLE_DURATION_BY_TIER[this.tier - 1];

      if (!this.isFollowing) {
        // Fase 1: Círculo estático encogiendo (como tap1)
        this.circleProgress = Math.min(elapsed / circleDuration, 1);

        // Auto-fail if circle completes without tapping
        if (this.circleProgress >= 1 && !this.isStunned) {
          console.log('[Swipe] FAIL: Never tapped to start movement');
          this.handleMiss();
          return;
        }
      } else {
        // Fase 2: Círculo moviéndose (ya fue pulsado correctamente)
        // El stepStartTime se resetea cuando empiezas a seguir
        const moveElapsed = now - this.stepStartTime;
        const swipeMoveDuration = this.SWIPE_MOVE_DURATION_BY_TIER[this.tier - 1];
        this.swipeMoveProgress = Math.min(moveElapsed / swipeMoveDuration, 1);

        // Auto-success if movement completes
        if (this.swipeMoveProgress >= 1 && !this.isStunned) {
          console.log('[Swipe] SUCCESS: Completed follow');
          this.handleHit();
          this.completeRound();
          return;
        }
      }
    }
  }

  private startNewStep(step: RoundStep): void {
    this.roundStep = step;
    this.stepStartTime = Date.now();
    this.circleProgress = 0;
    this.swipeMoveProgress = 0;
    this.isFollowing = false;

    if (step === 'tap1') {
      this.currentTarget = this.generateRandomCircleTarget();
      this.currentSwipe = null;
    } else if (step === 'tap2_drag') {
      this.currentSwipe = this.generateSwipeTarget();
      this.currentTarget = this.currentSwipe.startCircle;
    }
  }

  private generateRandomCircleTarget(): CircleTarget {
    const angle = Math.random() * Math.PI * 2;
    return {
      angle,
      x: this.MOCHI_CENTER_X + Math.cos(angle) * this.MOCHI_RADIUS,
      y: this.MOCHI_CENTER_Y + Math.sin(angle) * this.MOCHI_RADIUS
    };
  }

  private generateSwipeTarget(): SwipeTarget {
    const directions: SwipeDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const direction = directions[Math.floor(Math.random() * directions.length)];

    const startAngle = Math.random() * Math.PI * 2;
    const startCircle: CircleTarget = {
      angle: startAngle,
      x: this.MOCHI_CENTER_X + Math.cos(startAngle) * this.MOCHI_RADIUS,
      y: this.MOCHI_CENTER_Y + Math.sin(startAngle) * this.MOCHI_RADIUS
    };

    // Calcular ángulo final basado en dirección
    const directionAngles: Record<SwipeDirection, number> = {
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
    const endCircle: CircleTarget = {
      angle: endAngle,
      x: this.MOCHI_CENTER_X + Math.cos(endAngle) * this.MOCHI_RADIUS,
      y: this.MOCHI_CENTER_Y + Math.sin(endAngle) * this.MOCHI_RADIUS
    };

    return {
      startCircle,
      direction,
      endCircle
    };
  }

  handleTap(x: number, y: number): void {
    if (this.state !== 'playing' || this.isStunned || this.hammerAnimating) return;
    if (this.roundStep === 'cooldown') return;

    const now = Date.now();
    const elapsed = now - this.stepStartTime;

    // Check if tap is within timing window (not too early, not too late)
    if (this.circleProgress < 0.2 || this.circleProgress >= 1) {
      this.handleMiss();
      return;
    }

    // Check if tap is near target
    const distance = Math.sqrt(
      Math.pow(x - this.currentTarget!.x, 2) +
      Math.pow(y - this.currentTarget!.y, 2)
    );

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

  // Método para verificar si el jugador está siguiendo el círculo en movimiento
  updateFollowing(fingerX: number, fingerY: number, isPressed: boolean): void {
    if (this.state !== 'playing' || this.isStunned || this.hammerAnimating) return;
    if (this.roundStep !== 'tap2_drag') return;

    if (!isPressed) {
      // Si soltó el dedo mientras seguía, falla
      if (this.isFollowing) {
        console.log('[Follow] FAIL: Released finger too early');
        this.handleMiss();
      }
      this.isFollowing = false;
      return;
    }

    if (!this.isFollowing) {
      // FASE 1: Tap inicial para empezar el movimiento (como tap1)
      // Validar timing
      if (this.circleProgress < 0.2 || this.circleProgress >= 1) {
        console.log(`[Tap2] FAIL: Bad timing (progress: ${this.circleProgress.toFixed(2)})`);
        this.handleMiss();
        return;
      }

      // Validar distancia al círculo de inicio
      const startCircle = this.currentSwipe!.startCircle;
      const distance = Math.sqrt(
        Math.pow(fingerX - startCircle.x, 2) +
        Math.pow(fingerY - startCircle.y, 2)
      );

      console.log(`[Tap2] Distance: ${distance.toFixed(3)} (max: 0.15)`);

      if (distance > 0.15) {
        console.log('[Tap2] FAIL: Tap too far from circle');
        this.handleMiss();
        return;
      }

      // SUCCESS: Empezar a seguir
      console.log('[Tap2] SUCCESS: Started following');
      this.isFollowing = true;
      this.stepStartTime = Date.now(); // Resetear timer para la fase de movimiento
      this.swipeMoveProgress = 0;
      this.handleHit(); // Suma puntos por el tap inicial
    } else {
      // FASE 2: Seguir el círculo mientras se mueve
      const currentCirclePos = this.getCurrentCirclePosition();

      const distance = Math.sqrt(
        Math.pow(fingerX - currentCirclePos.x, 2) +
        Math.pow(fingerY - currentCirclePos.y, 2)
      );

      console.log(`[Follow] Finger: (${fingerX.toFixed(2)}, ${fingerY.toFixed(2)}), Circle: (${currentCirclePos.x.toFixed(2)}, ${currentCirclePos.y.toFixed(2)}), Distance: ${distance.toFixed(3)}`);

      if (distance > this.FOLLOW_TOLERANCE) {
        // Se alejó demasiado del círculo
        console.log('[Follow] FAIL: Lost track of circle');
        this.handleMiss();
      }
    }
  }

  // Calcula la posición actual del círculo basado en el progreso del movimiento
  private getCurrentCirclePosition(): { x: number, y: number } {
    if (!this.currentSwipe) {
      return { x: 0.5, y: 0.5 };
    }

    const start = this.currentSwipe.startCircle;
    const end = this.currentSwipe.endCircle;
    const progress = this.swipeMoveProgress;

    // Interpolación lineal entre start y end
    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress
    };
  }

  private getDirectionAngle(direction: SwipeDirection): number {
    const angles: Record<SwipeDirection, number> = {
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

  private handleHit(): void {
    this.score += this.REWARD_PER_STEP;
    this.score = Math.min(this.score, this.maxScore);
  }

  private handleMiss(): void {
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

  private completeRound(): void {
    this.roundsCompleted++;

    // Show feedback
    this.showFeedback = true;
    this.feedbackType = 'YES';
    this.feedbackStartTime = Date.now();

    // Start hammer animation
    this.roundStep = 'hammer';
    this.hammerAnimating = true;
    this.hammerAngle = this.currentTarget!.angle;
    this.stepStartTime = Date.now();
  }

  getState(): MochiCookingGameState {
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
      hammerHitProgress: this.hammerHitProgress,
      swipeMoveProgress: this.swipeMoveProgress,
      isFollowing: this.isFollowing
    };
  }

  reset(): void {
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
