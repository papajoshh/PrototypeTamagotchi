// GuessTheHigher Minigame - UI Rendering
import { Pet } from '../../core/Pet';
import { GuessTheHigherGame, GuessTheHigherGameState } from './GuessTheHigherGame';
import { LifeStage } from '../../core/LifeStage';
import { InputHelper } from '../../utils/InputHelper';

export class GuessTheHigherUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: GuessTheHigherGame;
  private pet: Pet;

  // Sprites
  private petSprite: HTMLImageElement | null = null;
  private eggSprite: HTMLImageElement | null = null;
  private cardBackSprite: HTMLImageElement | null = null;
  private cardFrontSprite: HTMLImageElement | null = null;
  private higherButtonSprite: HTMLImageElement | null = null;
  private lowerButtonSprite: HTMLImageElement | null = null;
  private dealerTableSprite: HTMLImageElement | null = null;
  private timesUpBackgroundSprite: HTMLImageElement | null = null;
  private timesUpLetterSprite: HTMLImageElement | null = null;

  // Animación de transición
  private transitionStartTime: number = 0;
  private readonly TRANSITION_DURATION = 2000; // 2 segundos

  // Animación de carta revelada
  private revealingCard: boolean = false;
  private revealAnimationProgress: number = 0;

  // Animación de game over
  private gameOverStartTime: number = 0;

  // Callbacks
  onGameEnd?: (scorePercentage: number) => void;
  private hasCalledOnGameEnd: boolean = false;

  constructor(canvas: HTMLCanvasElement, pet: Pet) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.game = new GuessTheHigherGame();
    this.pet = pet;
    this.transitionStartTime = Date.now();

    this.loadSprites();
    this.setupEventListeners();
  }

  private loadSprites(): void {
    // Cartas
    this.cardBackSprite = new Image();
    this.cardBackSprite.src = '/assets/minigames/GuessTheHigher/Card.png';

    this.cardFrontSprite = new Image();
    this.cardFrontSprite.src = '/assets/minigames/GuessTheHigher/Card with number.png';

    // Botones
    this.higherButtonSprite = new Image();
    this.higherButtonSprite.src = '/assets/minigames/GuessTheHigher/Higher.png';

    this.lowerButtonSprite = new Image();
    this.lowerButtonSprite.src = '/assets/minigames/GuessTheHigher/Lower.png';

    // Mesa dealer
    this.dealerTableSprite = new Image();
    this.dealerTableSprite.src = '/assets/minigames/GuessTheHigher/Mesita.png';

    // Huevo para transición
    this.eggSprite = new Image();
    this.eggSprite.src = '/assets/minigames/egg.png';

    // Times Up animation
    this.timesUpBackgroundSprite = new Image();
    this.timesUpBackgroundSprite.src = '/assets/minigames/TimesUp_Background.png';

    this.timesUpLetterSprite = new Image();
    this.timesUpLetterSprite.src = '/assets/minigames/TIMES UP_letter.png';
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => {
      const { x, y } = InputHelper.getCanvasCoordinatesFromMouse(e, this.canvas);
      e.stopPropagation(); // Prevenir propagación al GameUI
      this.handleClick(x, y);
    });

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevenir propagación al GameUI
      const coords = InputHelper.getCanvasCoordinatesFromTouchEvent(e, this.canvas);
      if (!coords) return;
      this.handleClick(coords.x, coords.y);
    });
  }

  private handleClick(x: number, y: number): void {
    const state = this.game.getState();

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
    } else if (state.state === 'playing' && state.waitingForChoice) {

      // Botones Higher/Lower
      const buttonY = 520;
      const buttonH = 60;

      // Botón Lower (izquierda)
      const lowerButtonX = 100;
      const lowerButtonW = 80;
      if (x >= lowerButtonX && x <= lowerButtonX + lowerButtonW &&
          y >= buttonY && y <= buttonY + buttonH) {
        this.game.guessLower();
        this.animateReveal();
      }

      // Botón Higher (derecha)
      const higherButtonX = this.canvas.width - 100 - 80;
      const higherButtonW = 80;
      if (x >= higherButtonX && x <= higherButtonX + higherButtonW &&
          y >= buttonY && y <= buttonY + buttonH) {
        this.game.guessHigher();
        this.animateReveal();
      }
    } else if (state.state === 'finished') {
      // Click en botón "Ver Recompensas"
      const buttonX = this.canvas.width / 2 - 100;
      const buttonY = 400; // Coincide exactamente con renderizado (centerY + 200)
      const buttonW = 200;
      const buttonH = 50;

      if (x >= buttonX && x <= buttonX + buttonW &&
          y >= buttonY && y <= buttonY + buttonH) {
        this.handleGameEnd();
      }
    }
  }

  private animateReveal(): void {
    this.revealingCard = true;
    this.revealAnimationProgress = 0;

    const animateDuration = 600; // 600ms para flip
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      this.revealAnimationProgress = Math.min(elapsed / animateDuration, 1);

      if (this.revealAnimationProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.revealingCard = false;

        // Después de la animación, esperar 1.5s y repartir nuevas cartas
        setTimeout(() => {
          if (this.game.getState().state === 'playing') {
            this.game.dealNewCards();
          }
        }, 1500);
      }
    };

    animate();
  }

  private handleGameEnd(): void {
    if (this.hasCalledOnGameEnd) return;

    const state = this.game.getState();
    const maxExpectedScore = 50;
    const scorePercentage = Math.min((state.score / maxExpectedScore) * 100, 100);

    if (this.onGameEnd) {
      this.hasCalledOnGameEnd = true;
      this.onGameEnd(scorePercentage);
    }
  }

  setPetSprite(sprite: HTMLImageElement): void {
    this.petSprite = sprite;
  }

  render(): void {
    const state = this.game.getState();

    // Verificar transición automáticamente
    if (state.state === 'transition') {
      const elapsed = Date.now() - this.transitionStartTime;
      if (elapsed >= this.TRANSITION_DURATION) {
        this.game.setState('waiting');
      }
    }

    // Limpiar fondo si no es transición
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
      // FASE 2: Fondo = pantalla de waiting
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

    // Fondo blanco
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Título
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Higher or Lower', this.canvas.width / 2, 120);

    // Instrucciones
    this.ctx.font = '18px Arial';
    this.ctx.fillText('Adivina si tu carta es mayor', this.canvas.width / 2, 200);
    this.ctx.fillText('o menor que la carta oculta', this.canvas.width / 2, 230);

    // Sprite de la mascota (o emoji)
    if (this.petSprite && this.petSprite.complete) {
      const maxHeight = 150;
      const aspectRatio = this.petSprite.width / this.petSprite.height;
      const petHeight = maxHeight;
      const petWidth = petHeight * aspectRatio;
      const petX = this.canvas.width / 2 - petWidth / 2;
      const petY = 260;
      this.ctx.drawImage(this.petSprite, petX, petY, petWidth, petHeight);
    } else {
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
    this.ctx.textAlign = 'center';
    this.ctx.fillText('¡Empezar!', this.canvas.width / 2, buttonY + 40);

    this.ctx.restore();
  }

  private renderPlayingScreen(state: GuessTheHigherGameState): void {
    this.ctx.save();

    // Timer (arriba izquierda)
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${Math.ceil(state.timeLeft)}s`, 20, 40);

    // Score (arriba derecha)
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Score: ${state.score}`, this.canvas.width - 20, 40);

    // Mesa dealer (centro superior)
    if (this.dealerTableSprite && this.dealerTableSprite.complete) {
      const tableWidth = 120;
      const tableHeight = 80;
      const tableX = this.canvas.width / 2 - tableWidth / 2;
      const tableY = 80;
      this.ctx.drawImage(this.dealerTableSprite, tableX, tableY, tableWidth, tableHeight);
    }

    // Carta del jugador (izquierda) - Más arriba para no colisionar con mascota
    if (state.playerCard) {
      this.renderCard(
        state.playerCard,
        120,
        180, // Subida de 280 a 180 (100px más arriba)
        100,
        140,
        false // No está siendo revelada
      );
    }

    // Carta del oponente (derecha) - Más arriba para no colisionar con mascota
    if (state.opponentCard) {
      this.renderCard(
        state.opponentCard,
        this.canvas.width - 120 - 100,
        180, // Subida de 280 a 180 (100px más arriba)
        100,
        140,
        this.revealingCard // Animación de reveal
      );
    }

    // Sprite de la mascota (centro)
    this.renderPet();

    // Botones Lower y Higher
    this.renderButtons(state);

    // Feedback visual (correcto/incorrecto) - Más arriba para mejor visibilidad
    if (state.lastGuessCorrect !== null && !state.waitingForChoice) {
      const feedbackText = state.lastGuessCorrect ? '✓ Correcto' : '✗ Incorrecto';

      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(feedbackText, this.canvas.width / 2, 150); // Subido de 240 a 150
    }

    this.ctx.restore();
  }

  private renderCard(
    card: { value: number; revealed: boolean },
    x: number,
    y: number,
    w: number,
    h: number,
    animating: boolean
  ): void {
    this.ctx.save();

    if (animating && this.revealAnimationProgress < 1) {
      // Animación de flip: escalar en X para simular rotación
      const scaleX = Math.abs(Math.cos(this.revealAnimationProgress * Math.PI));
      this.ctx.translate(x + w / 2, y + h / 2);
      this.ctx.scale(scaleX, 1);
      this.ctx.translate(-(x + w / 2), -(y + h / 2));

      // Cambiar sprite a mitad de la animación
      const showFront = this.revealAnimationProgress > 0.5;
      if (showFront) {
        // Carta revelada
        if (this.cardFrontSprite && this.cardFrontSprite.complete) {
          this.ctx.drawImage(this.cardFrontSprite, x, y, w, h);
        } else {
          this.ctx.fillStyle = '#fff';
          this.ctx.fillRect(x, y, w, h);
          this.ctx.strokeStyle = '#000';
          this.ctx.strokeRect(x, y, w, h);
        }

        // Número
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(card.value.toString(), x + w / 2, y + h / 2);
      } else {
        // Carta boca abajo
        if (this.cardBackSprite && this.cardBackSprite.complete) {
          this.ctx.drawImage(this.cardBackSprite, x, y, w, h);
        } else {
          this.ctx.fillStyle = '#333';
          this.ctx.fillRect(x, y, w, h);
        }
      }
    } else {
      // Sin animación
      if (card.revealed) {
        // Carta revelada
        if (this.cardFrontSprite && this.cardFrontSprite.complete) {
          this.ctx.drawImage(this.cardFrontSprite, x, y, w, h);
        } else {
          this.ctx.fillStyle = '#fff';
          this.ctx.fillRect(x, y, w, h);
          this.ctx.strokeStyle = '#000';
          this.ctx.strokeRect(x, y, w, h);
        }

        // Número
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(card.value.toString(), x + w / 2, y + h / 2);
      } else {
        // Carta boca abajo
        if (this.cardBackSprite && this.cardBackSprite.complete) {
          this.ctx.drawImage(this.cardBackSprite, x, y, w, h);
        } else {
          this.ctx.fillStyle = '#333';
          this.ctx.fillRect(x, y, w, h);
        }
      }
    }

    this.ctx.restore();
  }

  private renderPet(): void {
    if (this.petSprite && this.petSprite.complete) {
      const maxHeight = 100;
      const aspectRatio = this.petSprite.width / this.petSprite.height;
      const petHeight = maxHeight;
      const petWidth = petHeight * aspectRatio;
      const petX = this.canvas.width / 2 - petWidth / 2;
      const petY = 320;
      this.ctx.drawImage(this.petSprite, petX, petY, petWidth, petHeight);
    } else {
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
      this.ctx.fillText(stageEmojis[this.pet.stage], this.canvas.width / 2, 370);
    }
  }

  private renderButtons(state: GuessTheHigherGameState): void {
    const buttonY = 520;
    const buttonH = 60;

    // Botón Lower (izquierda)
    const lowerButtonX = 100;
    const lowerButtonW = 80;

    if (this.lowerButtonSprite && this.lowerButtonSprite.complete) {
      this.ctx.drawImage(this.lowerButtonSprite, lowerButtonX, buttonY, lowerButtonW, buttonH);
    } else {
      this.ctx.fillStyle = state.waitingForChoice ? '#000' : '#888';
      this.ctx.fillRect(lowerButtonX, buttonY, lowerButtonW, buttonH);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('<', lowerButtonX + lowerButtonW / 2, buttonY + buttonH / 2 + 8);
    }

    // Texto "Menor" encima del botón Lower
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Menor', lowerButtonX + lowerButtonW / 2, buttonY - 10);

    // Botón Higher (derecha)
    const higherButtonX = this.canvas.width - 100 - 80;
    const higherButtonW = 80;

    if (this.higherButtonSprite && this.higherButtonSprite.complete) {
      this.ctx.drawImage(this.higherButtonSprite, higherButtonX, buttonY, higherButtonW, buttonH);
    } else {
      this.ctx.fillStyle = state.waitingForChoice ? '#000' : '#888';
      this.ctx.fillRect(higherButtonX, buttonY, higherButtonW, buttonH);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('>', higherButtonX + higherButtonW / 2, buttonY + buttonH / 2 + 8);
    }

    // Texto "Mayor" encima del botón Higher
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Mayor', higherButtonX + higherButtonW / 2, buttonY - 10);
  }

  private renderFinishedScreen(state: GuessTheHigherGameState): void {
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
      } else {
        bgW = bgH * bgAspect;
      }

      this.ctx.drawImage(
        this.timesUpBackgroundSprite,
        bgX - bgW / 2,
        centerY - bgH / 2,
        bgW,
        bgH
      );
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
        } else {
          letterW = letterH * letterAspect;
        }

        this.ctx.drawImage(
          this.timesUpLetterSprite,
          letterX - letterW / 2,
          centerY - letterH / 2,
          letterW,
          letterH
        );
      }
    }

    // Score y premios aparecen después de 300ms
    if (elapsed >= 300) {
      // Score final
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${state.score}`, centerX, centerY + 100);

      // Calcular premios según porcentaje
      const maxExpectedScore = 50;
      const scorePercentage = Math.min((state.score / maxExpectedScore) * 100, 100);

      // Calcular recompensas
      const rewards = {
        tier1: 0,
        tier2: 0,
        tier3: 0
      };

      if (scorePercentage < 30) {
        rewards.tier1 = 1;
      } else if (scorePercentage < 70) {
        rewards.tier1 = 1;
        rewards.tier2 = 1;
      } else {
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

      // Botón "Ver Recompensas" (centrado)
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

  cleanup(): void {
    // Limpiar event listeners si es necesario
  }
}
