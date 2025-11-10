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

export interface Particle {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  velocityX: number; // pixels per frame
  velocityY: number;
  lifetime: number; // ms elapsed
  maxLifetime: number; // ms total
  size: number; // tamaño de la estrella
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

  // Preview round (círculos de siguiente ronda durante hammer)
  previewRound: {
    tap1Circle: CircleTarget | null;
    swipeTarget: SwipeTarget | null;
    allCircles: CircleTarget[];
    startTime: number;
  };

  // Particle system (feedback visual)
  particles: Particle[];
}

export class MochiCookingGame {
  private state: MochiCookingPhase = 'waiting';
  private tier: number = 1;
  private score: number = 50; // Inicialización por defecto (tier 1)
  private maxScore: number = 330;

  private roundStep: RoundStep = 'tap1';
  private currentTarget: CircleTarget | null = null;
  private currentSwipe: SwipeTarget | null = null;

  // Todos los círculos de la ronda completa (para mostrar el camino)
  private allCircles: CircleTarget[] = [];

  // Preview Round (para mostrar círculos de siguiente ronda durante hammer)
  private previewRound: {
    tap1Circle: CircleTarget | null;
    swipeTarget: SwipeTarget | null;
    allCircles: CircleTarget[];
    startTime: number; // Timestamp de cuándo empezó el preview (beat 3)
  } = {
    tap1Circle: null,
    swipeTarget: null,
    allCircles: [],
    startTime: 0
  };

  // Flag para evitar regenerar preview múltiples veces
  private previewLoadedForCurrentRound: boolean = false;

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

  // Particle system
  private particles: Particle[] = [];

  // ============ CONFIGURACIÓN BPM ============
  // BPM por tier: más BPM = más rápido = más difícil
  private readonly BPM_BY_TIER = [117, 125, 140];
  // Tier 1: 117 BPM → 513ms/beat (base)
  // Tier 2: 125 BPM → 480ms/beat (ligeramente más rápido)
  // Tier 3: 140 BPM → 429ms/beat (más rápido)

  // Configuración en BEATS (constante para todos los tiers)
  private readonly TAP1_CIRCLE_BEATS = 1;      // Tap1 dura 1 beat
  private readonly TAP2_CIRCLE_BEATS = 2;      // Tap2 dura 2 beats (más tiempo de anticipación)
  private readonly HAMMER_BEATS = 1;           // Martillo dura 1 beat (beat 3)
  private readonly COOLDOWN_BEATS = 1;         // Cooldown 1 beat (beat 4)
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
  private readonly STARTING_SCORE_BY_TIER = [50, 90, 100]; // Tier 1: 5 fallos, Tier 2: 3 fallos, Tier 3: 2 fallos
  private readonly REWARD_PER_STEP = 10;
  private readonly STUN_DURATION = 1000; // 1s
  private readonly FEEDBACK_DURATION = 500; // 0.5s

  private readonly FOLLOW_TOLERANCE_BY_TIER = [0.30, 0.25, 0.20]; // 30%, 25%, 20% (MÁS PERMISIVO para compensar timing rápido)
  private readonly CHANNEL_WIDTH_BY_TIER = [0.18, 0.15, 0.12]; // 18%, 15%, 12% (MÁS PERMISIVO para compensar timing rápido)

  // Geometría (normalizado 0-1, basado en canvas 480x640)
  private readonly MOCHI_RADIUS = 0.3; // Radio de la circunferencia normalizado
  private readonly MOCHI_CENTER_X = 0.5; // Centro X del mochi normalizado
  private readonly MOCHI_CENTER_Y = 400 / 640; // Centro Y del mochi normalizado (~0.625)

  constructor(tier: number = 1) {
    this.tier = Math.max(1, Math.min(3, tier));
    this.maxScore = this.MAX_SCORE_BY_TIER[this.tier - 1];
    this.score = this.STARTING_SCORE_BY_TIER[this.tier - 1];
  }

  start(): void {
    this.state = 'playing';
    this.score = this.STARTING_SCORE_BY_TIER[this.tier - 1];
    this.roundsCompleted = 0;
    this.isStunned = false;
    this.showFeedback = false;
    this.feedbackType = null;
    this.hammerAnimating = false;
    this.previewLoadedForCurrentRound = false;

    // PRIMERA RONDA: Cargar preview inmediatamente y dar 2 beats de anticipación
    const now = Date.now();
    this.loadPreviewRound(now);

    // Empezar en cooldown (beat 4) para dar tiempo de ver los círculos
    this.roundStep = 'cooldown';
    this.stepStartTime = now;

    console.log('[🎮 START] Game started at', now);
  }

  update(deltaTime: number): void {
    if (this.state !== 'playing') return;

    const now = Date.now();

    // Update feedback
    if (this.showFeedback && now - this.feedbackStartTime > this.FEEDBACK_DURATION) {
      this.showFeedback = false;
      this.feedbackType = null;
    }

    // Update particles
    this.updateParticles();

    // Update stun
    if (this.isStunned && now >= this.stunEndTime) {
      this.isStunned = false;

      // Al recuperarse del stun, dar 2 beats de anticipación como en start()
      this.loadPreviewRound(now);
      this.roundStep = 'cooldown';
      this.stepStartTime = now;
      this.previewLoadedForCurrentRound = false;
      return;
    }

    if (this.isStunned) return;

    // Update hammer hit animation
    if (this.hammerAnimating) {
      // Animación de golpe: usa HAMMER_DURATION (Tier 1: 1 beat = 513ms)
      const hammerDuration = this.getHammerDuration();
      const hammerElapsed = now - this.stepStartTime;

      // CARGAR PREVIEW ROUND al inicio del martillo (beat 3) - SOLO UNA VEZ
      if (!this.previewLoadedForCurrentRound) {
        this.loadPreviewRound(now);
        this.previewLoadedForCurrentRound = true;
      }

      if (hammerElapsed < hammerDuration) {
        // Progreso del golpe (0 -> 1 -> 0) - UN solo golpe
        const rawProgress = hammerElapsed / hammerDuration;
        this.hammerHitProgress = rawProgress < 0.5
          ? rawProgress * 2  // 0 -> 1 en primera mitad
          : 2 - rawProgress * 2; // 1 -> 0 en segunda mitad
      } else {
        console.log('[🔨 HAMMER END] Cooldown starts at', now);
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
        console.log('[❄️ COOLDOWN END] at', now);
        // Activar preview round (convertirlo en active round)
        this.activatePreviewRound();
      }
      return;
    }

    // Update circle progress
    if (this.roundStep === 'tap1') {
      // ⚠️ IMPORTANTE: Usar roundStartTime (inicio del preview) en lugar de stepStartTime
      // para mantener continuidad visual con los 2 beats del preview
      const elapsed = now - this.roundStartTime;
      const circleDuration = 2 * this.beatDuration; // 2 beats totales (preview)
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
          const endCircle = this.currentSwipe!.endCircle;
          this.handleHit(endCircle.x, endCircle.y);
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

    } else if (step === 'tap2_drag') {
      this.currentTarget = this.currentSwipe!.startCircle;
      // allCircles ya está seteado desde tap1
    }
  }

  // Carga la preview round (círculos de siguiente ronda) durante beat 3 (primer beat del martillo)
  private loadPreviewRound(now: number): void {
    // Generar nueva ronda completa
    const tap1Circle = this.generateRandomCircleTarget();
    const swipeTarget = this.generateSwipeTargetWithMinDistance(tap1Circle);

    // Guardar en preview
    this.previewRound.tap1Circle = tap1Circle;
    this.previewRound.swipeTarget = swipeTarget;
    this.previewRound.allCircles = [
      tap1Circle,
      swipeTarget.startCircle,
      swipeTarget.endCircle
    ];
    this.previewRound.startTime = now; // Timestamp de cuándo empezó el preview (beat 3)

    console.log('[📦 PREVIEW LOAD] at', now, `tap1:(${tap1Circle.x.toFixed(2)}, ${tap1Circle.y.toFixed(2)})`);
  }

  // Activa la preview round (la convierte en active round) al final del cooldown (beat 5)
  private activatePreviewRound(): void {
    if (!this.previewRound.tap1Circle) {
      console.error('[❌ ERROR] No preview loaded to activate!');
      return;
    }

    const now = Date.now();
    console.log('[▶️ ACTIVATE] Tap1 starts at', now, `tap1:(${this.previewRound.tap1Circle.x.toFixed(2)}, ${this.previewRound.tap1Circle.y.toFixed(2)})`);

    // Mover preview a active
    this.currentTarget = this.previewRound.tap1Circle;
    this.currentSwipe = this.previewRound.swipeTarget;
    this.allCircles = this.previewRound.allCircles;

    // ⚠️ CRÍTICO: Mantener continuidad temporal del preview
    const previewStartTime = this.previewRound.startTime;

    // Limpiar preview
    this.previewRound.tap1Circle = null;
    this.previewRound.swipeTarget = null;
    this.previewRound.allCircles = [];
    this.previewRound.startTime = 0;

    // Iniciar tap1 step
    this.roundStep = 'tap1';
    this.stepStartTime = now;

    // ⬅️ CAMBIO PRINCIPAL: Usar preview startTime para continuidad visual de anillos
    this.roundStartTime = previewStartTime;

    this.circleProgress = 0;
    this.swipeMoveProgress = 0;
    this.isFollowing = false;
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
        break;
      }
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
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
    console.log(`[👆 TAP] x:${x.toFixed(2)} y:${y.toFixed(2)} step:${this.roundStep} progress:${this.circleProgress.toFixed(2)}`);

    if (this.state !== 'playing' || this.isStunned || this.hammerAnimating) {
      console.log(`[❌ BLOCKED] state:${this.state} stunned:${this.isStunned} hammer:${this.hammerAnimating}`);
      return;
    }

    // ⚡ EARLY TAP: Permitir taps durante cooldown (anticipación)
    if (this.roundStep === 'cooldown') {
      this.handleEarlyTap(x, y);
      return;
    }

    const now = Date.now();
    const elapsed = now - this.stepStartTime;

    // Check if tap is within timing window (not too early, not too late)
    if (this.circleProgress < 0.2 || this.circleProgress >= 1) {
      console.log(`[⏱️ TIMING MISS] progress:${this.circleProgress.toFixed(2)} (need 0.2-1.0)`);
      this.handleMiss();
      return;
    }

    // Check if tap is near target
    const distance = Math.sqrt(
      Math.pow(x - this.currentTarget!.x, 2) +
      Math.pow(y - this.currentTarget!.y, 2)
    );

    console.log(`[📍 DISTANCE] ${distance.toFixed(3)} target:(${this.currentTarget!.x.toFixed(2)}, ${this.currentTarget!.y.toFixed(2)})`);

    if (distance > 0.15) { // Tolerancia de 15% del canvas
      console.log('[🎯 POSITION MISS] Too far from target');
      this.handleMiss();
      return;
    }

    // Success!
    console.log('[✨ HIT SUCCESS]');
    this.handleHit(this.currentTarget!.x, this.currentTarget!.y);

    if (this.roundStep === 'tap1') {
      this.startNewStep('tap2_drag');
    }
  }

  // Maneja taps anticipados durante cooldown (sobre preview round)
  private handleEarlyTap(x: number, y: number): void {
    if (!this.previewRound.tap1Circle) {
      console.log('[⚠️ EARLY TAP] No preview loaded yet');
      return;
    }

    // Calcular progreso del preview (0-1 durante los 2 beats de cooldown)
    const previewElapsed = Date.now() - this.previewRound.startTime;
    const previewDuration = 2 * this.beatDuration; // 2 beats
    const previewProgress = Math.min(1, previewElapsed / previewDuration);

    console.log(`[⚡ EARLY TAP] Checking preview tap1:(${this.previewRound.tap1Circle.x.toFixed(2)}, ${this.previewRound.tap1Circle.y.toFixed(2)}) progress:${previewProgress.toFixed(2)}`);

    // Validar timing: Permitir early tap desde 20% del preview en adelante
    if (previewProgress < 0.2) {
      console.log('[⏱️ EARLY TIMING MISS] Too early (need 20%+ of preview)');
      this.handleMiss();
      return;
    }

    // Validar distancia al tap1 del preview
    const distance = Math.sqrt(
      Math.pow(x - this.previewRound.tap1Circle.x, 2) +
      Math.pow(y - this.previewRound.tap1Circle.y, 2)
    );

    console.log(`[📍 EARLY DISTANCE] ${distance.toFixed(3)}`);

    if (distance > 0.15) {
      console.log('[🎯 EARLY POSITION MISS] Too far from preview target');
      this.handleMiss();
      return;
    }

    // ✅ Early tap válido! Activar preview y avanzar directamente a tap2_drag
    console.log('[⚡ EARLY HIT SUCCESS] Activating preview early and skipping to tap2_drag!');
    this.handleHit(this.previewRound.tap1Circle.x, this.previewRound.tap1Circle.y);
    this.activatePreviewRound();

    // Verificar victoria antes de continuar
    if (this.score >= this.maxScore) {
      console.log('[🏆 VICTORY] Max score reached via early tap!');
      this.state = 'finished';
      return;
    }

    // El early tap COMPLETA el tap1, avanzar directamente a tap2_drag
    this.startNewStep('tap2_drag');
  }

  // Método para verificar si el jugador está siguiendo el círculo en movimiento
  updateFollowing(fingerX: number, fingerY: number, isPressed: boolean): void {
    if (this.state !== 'playing' || this.isStunned || this.hammerAnimating) return;
    if (this.roundStep !== 'tap2_drag') return;

    if (!isPressed) {
      // Si soltó el dedo mientras seguía, falla
      if (this.isFollowing) {
        this.handleMiss();
      }
      this.isFollowing = false;
      return;
    }

    if (!this.isFollowing) {
      // FASE 1: Tap inicial para empezar el movimiento (como tap1)
      // Validar timing
      if (this.circleProgress < 0.2 || this.circleProgress >= 1) {
        this.handleMiss();
        return;
      }

      // Validar distancia al círculo de inicio
      const startCircle = this.currentSwipe!.startCircle;
      const distance = Math.sqrt(
        Math.pow(fingerX - startCircle.x, 2) +
        Math.pow(fingerY - startCircle.y, 2)
      );


      if (distance > 0.15) {
        this.handleMiss();
        return;
      }

      // SUCCESS: Empezar a seguir
      this.isFollowing = true;
      this.stepStartTime = Date.now(); // Resetear timer para la fase de movimiento
      this.swipeMoveProgress = 0;
      this.handleHit(startCircle.x, startCircle.y); // Suma puntos por el tap inicial (startCircle ya declarado arriba)
    } else {
      // FASE 2: Seguir el círculo mientras se mueve
      const currentCirclePos = this.getCurrentCirclePosition();

      const distance = Math.sqrt(
        Math.pow(fingerX - currentCirclePos.x, 2) +
        Math.pow(fingerY - currentCirclePos.y, 2)
      );


      // Obtener tolerancias según tier
      const followTolerance = this.FOLLOW_TOLERANCE_BY_TIER[this.tier - 1];
      const channelWidth = this.CHANNEL_WIDTH_BY_TIER[this.tier - 1];

      // Validar que sigue el círculo (permisivo según tier)
      if (distance > followTolerance) {
        this.handleMiss();
        return;
      }

      // Validar que NO se sale del canal (estricto según tier)
      const channelDistance = this.getPerpendicularDistanceToChannel(fingerX, fingerY);

      if (channelDistance > channelWidth) {
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

  private handleHit(x?: number, y?: number): void {
    this.score += this.REWARD_PER_STEP;
    this.score = Math.min(this.score, this.maxScore);

    // Disparar partículas si se proporciona posición
    if (x !== undefined && y !== undefined) {
      this.spawnParticles(x, y);
    }
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

  // Sistema de partículas: explosión desde un punto
  private spawnParticles(x: number, y: number): void {
    const particleCount = 10; // 10 partículas por explosión
    const angleStep = (Math.PI * 2) / particleCount;

    for (let i = 0; i < particleCount; i++) {
      const angle = angleStep * i + Math.random() * 0.3; // Variación aleatoria
      const speed = 0.003 + Math.random() * 0.002; // Velocidad variable (0-1 normalized)

      this.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        lifetime: 0,
        maxLifetime: 500, // 500ms de vida
        size: 8 + Math.random() * 6 // Tamaño variable 8-14px
      });
    }
  }

  private updateParticles(): void {
    const now = Date.now();

    // Actualizar y filtrar partículas
    this.particles = this.particles.filter(particle => {
      particle.lifetime += 16; // ~16ms por frame (60fps)

      // Mover partícula
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;

      // Eliminar si expiró
      return particle.lifetime < particle.maxLifetime;
    });
  }

  private completeRound(): void {
    this.roundsCompleted++;

    const now = Date.now();
    console.log('[✅ COMPLETE] Hammer starts at', now);

    // Show feedback
    this.showFeedback = true;
    this.feedbackType = 'YES';
    this.feedbackStartTime = now;

    // Start hammer animation
    this.roundStep = 'hammer';
    this.hammerAnimating = true;
    this.hammerAngle = this.currentTarget!.angle;
    this.stepStartTime = now;

    // Reset preview flag para que se cargue preview de siguiente ronda
    this.previewLoadedForCurrentRound = false;
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

  // Calcular beat actual desde el inicio de la ronda completa (para debug)
  getCurrentBeat(): number {
    if (!this.roundStartTime) return 0;
    const elapsed = Date.now() - this.roundStartTime;
    return elapsed / this.beatDuration;
  }

  // Calcular beat actual desde el inicio del step (para debug)
  getCurrentStepBeat(): number {
    if (!this.stepStartTime) return 0;
    const elapsed = Date.now() - this.stepStartTime;
    return elapsed / this.beatDuration;
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
      allCircles: this.allCircles,
      previewRound: this.previewRound,
      particles: this.particles
    };
  }

  reset(): void {
    this.state = 'waiting';
    this.score = this.STARTING_SCORE_BY_TIER[this.tier - 1];
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
