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
  roundStartTime: number; // Tiempo de inicio de la ronda completa (NO se resetea en cada step)
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

  // All circles path (para mostrar el camino completo)
  allCircles: CircleTarget[];
}

export class MochiCookingGame {
  private state: MochiCookingPhase = 'waiting';
  private tier: number = 1;
  private score: number = 30;
  private maxScore: number = 330;

  private roundStep: RoundStep = 'tap1';
  private currentTarget: CircleTarget | null = null;
  private currentSwipe: SwipeTarget | null = null;

  // Todos los círculos de la ronda completa (para mostrar el camino)
  private allCircles: CircleTarget[] = [];

  private stepStartTime: number = 0;
  private roundStartTime: number = 0; // Tiempo de inicio de toda la ronda (tap1 start)
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

  // ============ CONFIGURACIÓN BPM ============
  // BPM por tier: más BPM = más rápido = más difícil
  private readonly BPM_BY_TIER = [117, 150, 180];
  // Tier 1: 117 BPM → 513ms/beat (obligatorio por diseño)
  // Tier 2: 150 BPM → 400ms/beat (más rápido)
  // Tier 3: 180 BPM → 333ms/beat (muy rápido)

  // Configuración en BEATS (constante para todos los tiers)
  private readonly TAP1_CIRCLE_BEATS = 1;      // Tap1 dura 1 beat
  private readonly TAP2_CIRCLE_BEATS = 2;      // Tap2 dura 2 beats (más tiempo de anticipación)
  private readonly HAMMER_BEATS = 2;           // Martillo dura 2 beats
  private readonly COOLDOWN_BEATS = 0;         // Cooldown 0 beats (nueva ronda inmediata)
  private readonly SWIPE_MOVE_BEATS = 0.6;     // Drag dura 60% de 1 beat

  // Getters dinámicos basados en tier
  private get bpm(): number {
    return this.BPM_BY_TIER[this.tier - 1];
  }

  private get beatDuration(): number {
    return 60000 / this.bpm;
  }

  // Otros parámetros (no dependen de BPM)
  private readonly PENALTY_BY_TIER = [10, 30, 50];
  private readonly MAX_SCORE_BY_TIER = [250, 320, 390];
  private readonly REWARD_PER_STEP = 10;
  private readonly STUN_DURATION = 1000; // 1s
  private readonly FEEDBACK_DURATION = 500; // 0.5s

  private readonly FOLLOW_TOLERANCE_BY_TIER = [0.20, 0.17, 0.15]; // 20%, 17%, 15% (más permisivo en tier bajo)
  private readonly CHANNEL_WIDTH_BY_TIER = [0.12, 0.10, 0.08]; // 12%, 10%, 8% (más permisivo en tier bajo)

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
      // Animación de golpe: usa HAMMER_DURATION (Tier 1: 2 beats = 1026ms)
      const hammerDuration = this.getHammerDuration();
      const hammerElapsed = now - this.stepStartTime;

      if (hammerElapsed < hammerDuration) {
        // Progreso del golpe (0 -> 1 -> 0) - dos golpes en la duración
        // Primer golpe: 0-50% del tiempo, segundo golpe: 50-100% del tiempo
        const rawProgress = (hammerElapsed % (hammerDuration / 2)) / (hammerDuration / 2);
        this.hammerHitProgress = rawProgress < 0.5
          ? rawProgress * 2  // 0 -> 1 en primera mitad de cada golpe
          : 2 - rawProgress * 2; // 1 -> 0 en segunda mitad de cada golpe
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
      const cooldownTime = this.getCooldownDuration();
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
      const circleDuration = this.getCircleDuration();
      this.circleProgress = Math.min(elapsed / circleDuration, 1);

      // Auto-fail if circle completes without tap
      if (this.circleProgress >= 1 && !this.isStunned) {
        this.handleMiss();
      }
    } else if (this.roundStep === 'tap2_drag') {
      const elapsed = now - this.stepStartTime;
      const circleDuration = this.getCircleDuration();

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
        const swipeMoveDuration = this.getSwipeMoveDuration();
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
      // Guardar tiempo de inicio de la ronda completa
      this.roundStartTime = Date.now();

      // Generar ronda completa (tap1 + tap2_drag) con separación mínima
      this.currentTarget = this.generateRandomCircleTarget();
      this.currentSwipe = this.generateSwipeTargetWithMinDistance(this.currentTarget);

      // Guardar todos los círculos para mostrarlos
      this.allCircles = [
        this.currentTarget,
        this.currentSwipe.startCircle,
        this.currentSwipe.endCircle
      ];

      console.log('[Generation] tap1:', this.currentTarget.angle, 'tap2_start:', this.currentSwipe.startCircle.angle, 'tap2_end:', this.currentSwipe.endCircle.angle);
    } else if (step === 'tap2_drag') {
      this.currentTarget = this.currentSwipe!.startCircle;
      // allCircles ya está seteado desde tap1
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

  private generateSwipeTargetWithMinDistance(tap1Circle: CircleTarget): SwipeTarget {
    const MIN_ANGULAR_DISTANCE = Math.PI / 3; // 60 grados mínimo de separación (1.047 rad ≈ 60°)
    const directions: SwipeDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const direction = directions[Math.floor(Math.random() * directions.length)];

    let startAngle: number;
    let endAngle: number;
    let attempts = 0;
    const maxAttempts = 50;

    // Generar startCircle y endCircle que estén alejados de tap1 Y entre sí
    do {
      startAngle = Math.random() * Math.PI * 2;
      endAngle = startAngle + Math.PI; // Lado opuesto

      // Validar que startCircle está alejado de tap1
      const startToTap1 = this.getAngularDifference(startAngle, tap1Circle.angle);
      // Validar que endCircle está alejado de tap1
      const endToTap1 = this.getAngularDifference(endAngle, tap1Circle.angle);

      // TODOS deben estar separados mínimo 60°
      if (startToTap1 >= MIN_ANGULAR_DISTANCE && endToTap1 >= MIN_ANGULAR_DISTANCE) {
        console.log(`[Generation] Valid config found after ${attempts + 1} attempts`);
        console.log(`  tap1: ${(tap1Circle.angle * 180 / Math.PI).toFixed(1)}°`);
        console.log(`  tap2_start: ${(startAngle * 180 / Math.PI).toFixed(1)}° (dist: ${(startToTap1 * 180 / Math.PI).toFixed(1)}°)`);
        console.log(`  tap2_end: ${(endAngle * 180 / Math.PI).toFixed(1)}° (dist: ${(endToTap1 * 180 / Math.PI).toFixed(1)}°)`);
        break;
      }
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      console.warn('[Generation] Could not find perfectly separated circles, using last attempt');
    }

    const startCircle: CircleTarget = {
      angle: startAngle,
      x: this.MOCHI_CENTER_X + Math.cos(startAngle) * this.MOCHI_RADIUS,
      y: this.MOCHI_CENTER_Y + Math.sin(startAngle) * this.MOCHI_RADIUS
    };

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

  // Calcula la diferencia angular más corta entre dos ángulos (0 a π)
  private getAngularDifference(angle1: number, angle2: number): number {
    let diff = Math.abs(angle1 - angle2);
    // Normalizar a rango [0, 2π]
    while (diff > Math.PI * 2) diff -= Math.PI * 2;
    // Tomar el camino más corto
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff;
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

      // Obtener tolerancias según tier
      const followTolerance = this.FOLLOW_TOLERANCE_BY_TIER[this.tier - 1];
      const channelWidth = this.CHANNEL_WIDTH_BY_TIER[this.tier - 1];

      // Validar que sigue el círculo (permisivo según tier)
      if (distance > followTolerance) {
        console.log(`[Follow] FAIL: Lost track of circle (distance: ${distance.toFixed(3)}, max: ${followTolerance})`);
        this.handleMiss();
        return;
      }

      // Validar que NO se sale del canal (estricto según tier)
      const channelDistance = this.getPerpendicularDistanceToChannel(fingerX, fingerY);
      console.log(`[Channel] Perpendicular distance: ${channelDistance.toFixed(3)} (max: ${channelWidth})`);

      if (channelDistance > channelWidth) {
        console.log('[Channel] FAIL: Out of channel');
        this.handleMiss();
      }
    }
  }

  // Calcula la distancia perpendicular del punto al canal (línea recta entre start y end)
  private getPerpendicularDistanceToChannel(fingerX: number, fingerY: number): number {
    if (!this.currentSwipe) {
      return 0;
    }

    const start = this.currentSwipe.startCircle;
    const end = this.currentSwipe.endCircle;

    // Vector del canal (start -> end)
    const channelDx = end.x - start.x;
    const channelDy = end.y - start.y;
    const channelLength = Math.sqrt(channelDx * channelDx + channelDy * channelDy);

    if (channelLength === 0) {
      return 0; // Canal de longitud 0
    }

    // Vector normalizado del canal
    const channelNormX = channelDx / channelLength;
    const channelNormY = channelDy / channelLength;

    // Vector desde start hasta el dedo
    const fingerDx = fingerX - start.x;
    const fingerDy = fingerY - start.y;

    // Proyección del dedo sobre el canal (producto punto)
    const projection = fingerDx * channelNormX + fingerDy * channelNormY;

    // Punto más cercano en el canal
    const closestX = start.x + channelNormX * projection;
    const closestY = start.y + channelNormY * projection;

    // Distancia perpendicular (del dedo al punto más cercano)
    const perpDistance = Math.sqrt(
      Math.pow(fingerX - closestX, 2) +
      Math.pow(fingerY - closestY, 2)
    );

    return perpDistance;
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

  // ============ GETTERS PÚBLICOS PARA UI ============

  getBPM(): number {
    return this.bpm;
  }

  getBeatDuration(): number {
    return this.beatDuration;
  }

  getRoundStartTime(): number {
    return this.roundStartTime;
  }

  // Duraciones calculadas dinámicamente basadas en BPM y beats
  getCircleDuration(): number {
    return Math.round(this.beatDuration * this.TAP1_CIRCLE_BEATS);
  }

  getTap2CircleDuration(): number {
    return Math.round(this.beatDuration * this.TAP2_CIRCLE_BEATS);
  }

  getHammerDuration(): number {
    return Math.round(this.beatDuration * this.HAMMER_BEATS);
  }

  getCooldownDuration(): number {
    return Math.round(this.beatDuration * this.COOLDOWN_BEATS);
  }

  getSwipeMoveDuration(): number {
    return Math.round(this.beatDuration * this.SWIPE_MOVE_BEATS);
  }

  // Getters de beats (para renderizado de círculos)
  getTap1CircleBeats(): number {
    return this.TAP1_CIRCLE_BEATS;
  }

  getTap2CircleBeats(): number {
    return this.TAP2_CIRCLE_BEATS;
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
      roundStartTime: this.roundStartTime,
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
      isFollowing: this.isFollowing,
      allCircles: this.allCircles
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
