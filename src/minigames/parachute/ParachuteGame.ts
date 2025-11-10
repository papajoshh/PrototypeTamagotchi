// Parachute Minigame - Game Logic
// El jugador mueve una canasta horizontalmente para recoger objetos buenos y evitar malos

export type ObjectType = 'coin' | 'star' | 'diamond' | 'poop' | 'bomb';
export type GameState = 'transition' | 'waiting' | 'playing' | 'finished';

export interface FallingObject {
  id: number;
  type: ObjectType;
  x: number; // Posición X
  y: number; // Posición Y (0 = top, aumenta hacia abajo)
  fallSpeed: number; // px/s
  collected: boolean;
}

export interface ScorePopup {
  id: number;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  value: number; // +1, +3, +5
  spawnTime: number; // timestamp
}

export interface ParachuteGameState {
  state: GameState;
  score: number;
  timeLeft: number;
  playerX: number; // Posición del jugador (0-1, normalizada)
  isStunned: boolean;
  stunTimeLeft: number;
  fallingObjects: FallingObject[];
  showWhiteFlash: boolean;
  scorePopups: ScorePopup[];
}

export class ParachuteGame {
  private state: GameState = 'transition';
  private score: number = 0;
  private timeLeft: number = 60;
  private timerInterval: number | null = null;

  private playerX: number = 0.5; // Centro (0-1)
  private isStunned: boolean = false;
  private stunTimeLeft: number = 0;

  private fallingObjects: FallingObject[] = [];
  private nextObjectId: number = 0;
  private lastSpawnTime: number = 0;
  private gameStartTime: number = 0;

  private showWhiteFlash: boolean = false;

  private scorePopups: ScorePopup[] = [];
  private nextPopupId: number = 0;

  // Configuración
  private readonly MAX_TIME = 30; // 30 segundos
  private readonly PLAYER_SPEED = 25.0; // Velocidad de movimiento (0-1 por segundo) - MUY rápido
  private readonly COLLECTION_MARGIN = 0.08; // Margen de recogida (0-1)
  private readonly COLLECTION_HEIGHT = 0.85; // Altura de recogida (0-1, más cerca del fondo)

  // Velocidades de caída (px/s en canvas 640 de altura) - MÁS RÁPIDO = MÁS VALOR
  private readonly COIN_FALL_SPEED = 320;   // +1 punto = MÁS LENTO
  private readonly STAR_FALL_SPEED = 360;   // +3 puntos = MEDIO
  private readonly DIAMOND_FALL_SPEED = 400; // +5 puntos = MÁS RÁPIDO
  private readonly POOP_FALL_SPEED = 440;   // 2x más rápido
  private readonly BOMB_FALL_SPEED = 533;   // RÁPIDO (1.2 segundos de arriba a abajo: 640px / 1.2s = 533px/s)

  // Valores
  private readonly COIN_VALUE = 1;
  private readonly STAR_VALUE = 3;
  private readonly DIAMOND_VALUE = 5;
  private readonly BOMB_PENALTY = 5;

  // Stun durations
  private readonly POOP_STUN_DURATION = 2; // segundos
  private readonly BOMB_STUN_DURATION = 3; // segundos

  // Spawn settings - RITMO FRENÉTICO
  private readonly INITIAL_SPAWN_DELAY = 0.8; // segundos (antes 1.5)
  private readonly MIN_SPAWN_DELAY = 0.2; // segundos (antes 0.4)
  private readonly GOOD_OBJECT_RATIO = 0.7; // 70% buenos

  // Probabilidades (objetos buenos)
  private readonly COIN_PROBABILITY = 0.5;
  private readonly STAR_PROBABILITY = 0.3;
  private readonly DIAMOND_PROBABILITY = 0.2;

  // Probabilidades (objetos malos)
  private readonly POOP_PROBABILITY = 0.75;
  private readonly BOMB_PROBABILITY = 0.25;

  constructor() {}

  start() {
    this.state = 'playing';
    this.timeLeft = this.MAX_TIME;
    this.score = 0;
    this.playerX = 0.5;
    this.isStunned = false;
    this.stunTimeLeft = 0;
    this.fallingObjects = [];
    this.nextObjectId = 0;
    this.gameStartTime = Date.now();
    this.lastSpawnTime = this.gameStartTime;
    this.showWhiteFlash = false;
    this.scorePopups = [];
    this.nextPopupId = 0;
    this.startTimer();
  }

  private startTimer(): void {
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

  private finish(): void {
    this.state = 'finished';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  update(deltaTime: number) {
    if (this.state !== 'playing') return;

    // Update stun
    if (this.isStunned) {
      this.stunTimeLeft -= deltaTime;
      if (this.stunTimeLeft <= 0) {
        this.stunTimeLeft = 0;
        this.isStunned = false;
      }
    }

    // Update falling objects
    for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
      const obj = this.fallingObjects[i];
      obj.y += obj.fallSpeed * deltaTime;

      // Check collection (solo en un rango estrecho alrededor de la altura de recogida)
      if (!obj.collected && obj.y >= this.COLLECTION_HEIGHT && obj.y <= this.COLLECTION_HEIGHT + 0.05) {
        const distance = Math.abs(obj.x - this.playerX);
        if (distance <= this.COLLECTION_MARGIN) {
          this.collectObject(obj);
        }
      }

      // Remove if below screen (y > 1.2)
      if (obj.y > 1.2) {
        this.fallingObjects.splice(i, 1);
      }
    }

    // Spawn new objects
    this.trySpawnObject();

    // Update score popups (remove old ones after 1s)
    const now = Date.now();
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const popup = this.scorePopups[i];
      if (now - popup.spawnTime > 1000) {
        this.scorePopups.splice(i, 1);
      }
    }

    // Clear white flash after a short time
    if (this.showWhiteFlash) {
      // La UI manejará esto con un timer
    }
  }

  private trySpawnObject() {
    const now = Date.now();
    const gameProgress = 1 - (this.timeLeft / this.MAX_TIME); // 0 al inicio, 1 al final

    // Calculate spawn delay (decreases over time)
    const currentSpawnDelay = this.INITIAL_SPAWN_DELAY -
      (this.INITIAL_SPAWN_DELAY - this.MIN_SPAWN_DELAY) * gameProgress;

    if ((now - this.lastSpawnTime) / 1000 >= currentSpawnDelay) {
      this.spawnObject();
      this.lastSpawnTime = now;
    }
  }

  private spawnObject() {
    const isGood = Math.random() < this.GOOD_OBJECT_RATIO;
    let type: ObjectType;
    let fallSpeed: number;

    if (isGood) {
      // Spawn good object
      const rand = Math.random();
      if (rand < this.COIN_PROBABILITY) {
        type = 'coin';
        fallSpeed = this.COIN_FALL_SPEED;
      } else if (rand < this.COIN_PROBABILITY + this.STAR_PROBABILITY) {
        type = 'star';
        fallSpeed = this.STAR_FALL_SPEED;
      } else {
        type = 'diamond';
        fallSpeed = this.DIAMOND_FALL_SPEED;
      }
    } else {
      // Spawn bad object
      const rand = Math.random();
      if (rand < this.POOP_PROBABILITY) {
        type = 'poop';
        fallSpeed = this.POOP_FALL_SPEED;
      } else {
        type = 'bomb';
        fallSpeed = this.BOMB_FALL_SPEED;
      }
    }

    const obj: FallingObject = {
      id: this.nextObjectId++,
      type,
      x: Math.random(), // Random X position (0-1)
      y: -0.1, // Start above screen
      fallSpeed: fallSpeed / 640, // Normalize to 0-1 per second
      collected: false
    };

    this.fallingObjects.push(obj);
  }

  private collectObject(obj: FallingObject) {
    // ⛔ Si está stunneado, NO puede recoger NADA (ni bueno ni malo)
    if (this.isStunned) {
      return;
    }

    obj.collected = true;

    let scoreValue = 0;

    switch (obj.type) {
      case 'coin':
        this.score += this.COIN_VALUE;
        scoreValue = this.COIN_VALUE;
        break;
      case 'star':
        this.score += this.STAR_VALUE;
        scoreValue = this.STAR_VALUE;
        break;
      case 'diamond':
        this.score += this.DIAMOND_VALUE;
        scoreValue = this.DIAMOND_VALUE;
        break;
      case 'poop':
        this.isStunned = true;
        this.stunTimeLeft = this.POOP_STUN_DURATION;
        break;
      case 'bomb':
        this.isStunned = true;
        this.stunTimeLeft = this.BOMB_STUN_DURATION;
        this.score = Math.max(0, this.score - this.BOMB_PENALTY);
        scoreValue = -this.BOMB_PENALTY;
        this.showWhiteFlash = true;
        break;
    }

    // Create score popup for good/bad objects
    if (scoreValue !== 0) {
      this.scorePopups.push({
        id: this.nextPopupId++,
        x: obj.x,
        y: obj.y,
        value: scoreValue,
        spawnTime: Date.now()
      });
    }
  }

  movePlayer(deltaX: number, deltaTime: number) {
    if (this.isStunned) return;

    this.playerX += deltaX * this.PLAYER_SPEED * deltaTime;
    this.playerX = Math.max(0, Math.min(1, this.playerX)); // Clamp 0-1
  }

  clearWhiteFlash() {
    this.showWhiteFlash = false;
  }

  getState(): ParachuteGameState {
    return {
      state: this.state,
      score: this.score,
      timeLeft: this.timeLeft,
      playerX: this.playerX,
      isStunned: this.isStunned,
      stunTimeLeft: this.stunTimeLeft,
      fallingObjects: [...this.fallingObjects],
      showWhiteFlash: this.showWhiteFlash,
      scorePopups: [...this.scorePopups]
    };
  }

  setState(newState: GameState) {
    this.state = newState;
  }

  calculateRewards(): { tier1: number; tier2: number; tier3: number } {
    const maxExpectedScore = 120;
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

  getScorePercentage(): number {
    const maxExpectedScore = 120;
    return (this.score / maxExpectedScore) * 100;
  }

  reset() {
    this.state = 'transition';
    this.score = 0;
    this.timeLeft = this.MAX_TIME;
    this.playerX = 0.5;
    this.isStunned = false;
    this.stunTimeLeft = 0;
    this.fallingObjects = [];
    this.nextObjectId = 0;
    this.showWhiteFlash = false;
    this.scorePopups = [];
    this.nextPopupId = 0;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
