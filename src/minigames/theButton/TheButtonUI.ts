import { TheButtonGame, TheButtonGameState } from './TheButtonGame';
import { Pet } from '../../core/Pet';
import { LifeStage } from '../../core/LifeStage';
import { InputHelper } from '../../utils/InputHelper';

export class TheButtonUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: TheButtonGame;
  private pet: Pet;

  // Sprites
  private buttonSprite: HTMLImageElement | null = null;
  private buttonPressedSprite: HTMLImageElement | null = null;
  private clockSprite: HTMLImageElement | null = null;
  private petSprite: HTMLImageElement | null = null;
  private eggSprite: HTMLImageElement | null = null;
  private timesUpBackgroundSprite: HTMLImageElement | null = null;
  private timesUpLetterSprite: HTMLImageElement | null = null;

  // Estado visual
  private isButtonPressed: boolean = false;
  private buttonPressTimer: number = 0;
  private transitionStartTime: number = 0;
  private readonly TRANSITION_DURATION = 2000; // 2 segundos de transición
  private gameOverStartTime: number = 0;

  // Callbacks
  onGameEnd?: (scorePercentage: number) => void;
  private hasCalledOnGameEnd: boolean = false;

  constructor(canvas: HTMLCanvasElement, pet: Pet) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.game = new TheButtonGame();
    this.pet = pet;
    this.transitionStartTime = Date.now();

    this.loadSprites();
    this.setupEventListeners();
  }

  private loadSprites(): void {
    // Botón normal
    this.buttonSprite = new Image();
    this.buttonSprite.src = '/assets/minigames/theButton/Button.png';

    // Botón presionado
    this.buttonPressedSprite = new Image();
    this.buttonPressedSprite.src = '/assets/minigames/theButton/Button_pressed.png';

    // Reloj
    this.clockSprite = new Image();
    this.clockSprite.src = '/assets/minigames/theButton/clock.png';

    // Huevo de transición
    this.eggSprite = new Image();
    this.eggSprite.src = '/assets/minigames/egg.png';

    // Times Up animation
    this.timesUpBackgroundSprite = new Image();
    this.timesUpBackgroundSprite.src = '/assets/minigames/TimesUp_Background.png';

    this.timesUpLetterSprite = new Image();
    this.timesUpLetterSprite.src = '/assets/minigames/TIMES UP_letter.png';
  }

  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('click', (e) => {
      const { x, y } = InputHelper.getCanvasCoordinatesFromMouse(e, this.canvas);
      this.handleClick(x, y, e);
    });

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const coords = InputHelper.getCanvasCoordinatesFromTouchEvent(e, this.canvas);
      if (!coords) return;
      this.handleClick(coords.x, coords.y);
    });
  }

  private handleClick(x: number, y: number, e?: MouseEvent): void {
    const state = this.game.getState();

    if (state.state === 'waiting') {
      // Click para empezar el juego
      const startButtonX = this.canvas.width / 2 - 100;
      const startButtonY = 480; // Actualizado para coincidir con el render
      const startButtonW = 200;
      const startButtonH = 60;

      if (x >= startButtonX && x <= startButtonX + startButtonW &&
          y >= startButtonY && y <= startButtonY + startButtonH) {
        if (e) e.stopPropagation(); // Prevenir propagación al GameUI
        this.game.start();
      }
    } else if (state.state === 'playing') {
      // Prevenir propagación durante el juego
      if (e) e.stopPropagation();

      // Click en el botón del juego - ÁREA EXTENDIDA (más fácil de clickear)
      const buttonX = this.canvas.width / 2 - 150; // Extendido 50px a cada lado
      const buttonY = 400; // Extendido 50px hacia arriba
      const buttonW = 300; // Más ancho (era 200)
      const buttonH = 170; // Más alto (era 100)

      if (x >= buttonX && x <= buttonX + buttonW &&
          y >= buttonY && y <= buttonY + buttonH) {
        this.pressButton();
      }
    } else if (state.state === 'finished') {
      // Click para cerrar y ver recompensas
      if (e) e.stopPropagation(); // CRÍTICO: Prevenir propagación al GameUI
      this.handleGameEnd();
    }
  }

  private pressButton(): void {
    this.game.press();
    this.isButtonPressed = true;
    this.buttonPressTimer = Date.now();
  }

  private handleGameEnd(): void {
    // Prevenir múltiples llamadas (doble-click accidental)
    if (this.hasCalledOnGameEnd) return;

    const scorePercentage = this.game.getScorePercentage();
    if (this.onGameEnd) {
      this.hasCalledOnGameEnd = true;
      this.onGameEnd(scorePercentage);
    }
  }

  setPetSprite(sprite: HTMLImageElement | null): void {
    this.petSprite = sprite;
  }

  render(): void {
    const state = this.game.getState();

    // Actualizar estado de botón presionado
    if (this.isButtonPressed && Date.now() - this.buttonPressTimer > 100) {
      this.isButtonPressed = false;
    }

    // Actualizar transición
    if (state.state === 'transition') {
      const elapsed = Date.now() - this.transitionStartTime;
      if (elapsed >= this.TRANSITION_DURATION) {
        this.game.skipTransition();
      }
    }

    // Limpiar canvas solo si NO es transición (la transición tiene su propio fondo negro)
    if (state.state !== 'transition') {
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (state.state === 'transition') {
      this.renderTransitionScreen();
    } else if (state.state === 'waiting') {
      this.renderWaitingScreen();
    } else if (state.state === 'playing') {
      this.renderPlayingScreen(state);
    } else if (state.state === 'finished') {
      this.renderFinishedScreen(state);
    }
  }

  private renderTransitionScreen(): void {
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
    } else {
      // FASE 2: Fondo = pantalla de waiting (el cambio ocurre cuando está todo blanco)
      this.renderWaitingScreen();
    }

    // Franja blanca vertical (crece en fase 1, se encoge en fase 2)
    const whiteHeight = isGrowing
      ? canvasHeight * phaseProgress          // Crece: 0 → 100%
      : canvasHeight * (1 - phaseProgress);   // Se encoge: 100% → 0
    const whiteY = eggY - whiteHeight / 2;

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, whiteY, this.canvas.width, whiteHeight);

    // Huevo negro (crece en fase 1, se encoge en fase 2)
    if (this.eggSprite && this.eggSprite.complete) {
      const eggSize = isGrowing
        ? 200 * phaseProgress           // Crece: 0 → 200px
        : 200 * (1 - phaseProgress);    // Se encoge: 200px → 0

      this.ctx.drawImage(
        this.eggSprite,
        eggX - eggSize / 2,
        eggY - eggSize / 2,
        eggSize,
        eggSize
      );
    }

    this.ctx.restore();
  }

  private renderWaitingScreen(): void {
    this.ctx.save();

    // Título
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('El Botón', this.canvas.width / 2, 150);

    // Instrucciones
    this.ctx.font = '18px Arial';
    this.ctx.fillText('¡Presiona el botón lo más rápido posible!', this.canvas.width / 2, 200);
    this.ctx.fillText('Duración: 30 segundos', this.canvas.width / 2, 230);

    // Mascota en el centro
    if (this.petSprite && this.petSprite.complete) {
      const maxHeight = 150;
      const aspectRatio = this.petSprite.width / this.petSprite.height;
      const petHeight = maxHeight;
      const petWidth = petHeight * aspectRatio;
      const petX = this.canvas.width / 2 - petWidth / 2;
      const petY = 260;
      this.ctx.drawImage(this.petSprite, petX, petY, petWidth, petHeight);
    } else {
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

    // Botón de inicio (más abajo)
    const buttonX = this.canvas.width / 2 - 100;
    const buttonY = 480; // Movido más abajo
    const buttonW = 200;
    const buttonH = 60;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText('¡Empezar!', this.canvas.width / 2, buttonY + 40);

    this.ctx.restore();
  }

  private renderPlayingScreen(state: TheButtonGameState): void {
    this.ctx.save();

    // Timer y Score en la parte superior
    const topY = 40;

    // Timer con icono de reloj - SEPARADOS PARA NO PISARSE
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';

    if (this.clockSprite && this.clockSprite.complete) {
      const clockSize = 30;
      // Reloj más a la izquierda
      this.ctx.drawImage(this.clockSprite, this.canvas.width / 2 - 100, topY - 20, clockSize, clockSize);
    }

    // Texto del timer más a la derecha
    this.ctx.fillText(`${state.timeLeft.toFixed(1)}s`, this.canvas.width / 2 - 25, topY);

    // Score
    this.ctx.font = 'bold 32px Arial';
    this.ctx.fillText(`Score: ${state.score}`, this.canvas.width / 2, topY + 50);

    // Mascota en el centro (más agitada según score)
    if (this.petSprite && this.petSprite.complete) {
      const maxHeight = 120;
      const aspectRatio = this.petSprite.width / this.petSprite.height;
      const petHeight = maxHeight;
      const petWidth = petHeight * aspectRatio;
      const petX = this.canvas.width / 2 - petWidth / 2;
      const petY = 180;

      // Efecto de shake basado en el score
      const shakeAmount = Math.min(state.score * 0.5, 10);
      const offsetX = (Math.random() - 0.5) * shakeAmount;
      const offsetY = (Math.random() - 0.5) * shakeAmount;

      this.ctx.drawImage(this.petSprite, petX + offsetX, petY + offsetY, petWidth, petHeight);
    } else {
      // Fallback to emoji if no sprite (con efecto de shake)
      const shakeAmount = Math.min(state.score * 0.5, 10);
      const offsetX = (Math.random() - 0.5) * shakeAmount;
      const offsetY = (Math.random() - 0.5) * shakeAmount;

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
      this.ctx.fillText(stageEmojis[this.pet.stage], this.canvas.width / 2 + offsetX, 230 + offsetY);
    }

    // Texto "tap tap tap"
    this.ctx.fillStyle = '#666';
    this.ctx.font = 'italic 16px Arial';
    this.ctx.fillText('tap  tap  tap', this.canvas.width / 2, 330);

    // Botón del juego
    const buttonX = this.canvas.width / 2 - 100;
    const buttonY = 400;
    const buttonW = 200;
    const buttonH = 120;

    const currentButtonSprite = this.isButtonPressed ? this.buttonPressedSprite : this.buttonSprite;

    if (currentButtonSprite && currentButtonSprite.complete) {
      this.ctx.drawImage(currentButtonSprite, buttonX, buttonY, buttonW, buttonH);
    } else {
      // Fallback si no carga el sprite
      this.ctx.fillStyle = this.isButtonPressed ? '#333' : '#000';
      this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText('TAP!', this.canvas.width / 2, buttonY + buttonH / 2 + 10);
    }

    // Texto debajo del botón
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.fillText('Tap to count', this.canvas.width / 2, 540);

    this.ctx.restore();
  }

  private renderFinishedScreen(state: TheButtonGameState): void {
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
    const centerY = 200;

    // Background slides from left (0.1s)
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
      } else {
        bgW = bgH * bgAspect;
      }

      this.ctx.drawImage(this.timesUpBackgroundSprite, bgX - bgW / 2, centerY - bgH / 2, bgW, bgH);
    } else {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(bgX - 200, centerY - 60, 400, 120);
    }

    // Letter enters from right with overshoot (0.2s after bg, total 0.3s)
    if (elapsed >= 100) {
      const letterElapsed = elapsed - 100;
      const letterProgress = Math.min(letterElapsed / 200, 1);
      const easeProgress = letterProgress < 1 ?
        1 + 1.7 * Math.pow(letterProgress - 1, 3) + Math.pow(letterProgress - 1, 2) :
        letterProgress;
      const letterX = centerX + canvasWidth * (1 - easeProgress);

      if (this.timesUpLetterSprite && this.timesUpLetterSprite.complete) {
        const letterMaxW = 300;
        const letterMaxH = 100;
        const letterAspect = this.timesUpLetterSprite.width / this.timesUpLetterSprite.height;
        let letterW = letterMaxW;
        let letterH = letterMaxH;

        if (letterAspect > letterMaxW / letterMaxH) {
          letterH = letterW / letterAspect;
        } else {
          letterW = letterH * letterAspect;
        }

        this.ctx.drawImage(this.timesUpLetterSprite, letterX - letterW / 2, centerY - letterH / 2, letterW, letterH);
      } else {
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
      const buttonX = centerX - 100;
      const buttonY = centerY + 200;
      const buttonW = 200;
      const buttonH = 50;

      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText('Ver Recompensas', centerX, buttonY + 33);
    }

    this.ctx.restore();
  }

  reset(): void {
    this.game.reset();
    this.isButtonPressed = false;
    this.buttonPressTimer = 0;
    this.transitionStartTime = Date.now();
  }

  destroy(): void {
    // Cleanup
    this.game.reset();
  }
}
