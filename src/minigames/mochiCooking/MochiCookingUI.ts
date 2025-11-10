// MochiCooking Minigame - UI Rendering
import { Pet } from '../../core/Pet';
import { MochiCookingGame, MochiCookingGameState, SwipeDirection } from './MochiCookingGame';
import { LifeStage } from '../../core/LifeStage';
import { InputHelper } from '../../utils/InputHelper';

export class MochiCookingUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: MochiCookingGame;
  private pet: Pet;
  private tier: number;
  private ingredientId: string;

  // Sprites
  private petSprite: HTMLImageElement | null = null;
  private mochiSprite: HTMLImageElement | null = null;
  private circumferenceSprite: HTMLImageElement | null = null;
  private arrowSprite: HTMLImageElement | null = null;
  private hammerSprite: HTMLImageElement | null = null;
  private starsSprite: HTMLImageElement | null = null;
  private timesUpBackgroundSprite: HTMLImageElement | null = null;
  private timesUpLetterSprite: HTMLImageElement | null = null;

  // Game over animation
  private gameOverStartTime: number = 0;

  // Input tracking
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragCurrentX: number = 0;
  private dragCurrentY: number = 0;

  // Callbacks
  onGameEnd?: (success: boolean) => void;
  private hasCalledOnGameEnd: boolean = false;

  constructor(canvas: HTMLCanvasElement, pet: Pet, tier: number = 1, ingredientId: string = 'neutral') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.pet = pet;
    this.tier = tier;
    this.ingredientId = ingredientId;
    this.game = new MochiCookingGame(tier);

    this.loadSprites();
    this.setupEventListeners();
  }

  private loadSprites(): void {
    // Mochi sprites
    this.mochiSprite = new Image();
    this.mochiSprite.src = '/assets/minigames/Mochis/mochi_neutral.png';

    this.circumferenceSprite = new Image();
    this.circumferenceSprite.src = '/assets/minigames/Mochis/circumference.png';

    this.arrowSprite = new Image();
    this.arrowSprite.src = '/assets/minigames/Mochis/arrows.png';

    this.hammerSprite = new Image();
    this.hammerSprite.src = '/assets/minigames/Mochis/hammer.png';

    this.starsSprite = new Image();
    this.starsSprite.src = '/assets/minigames/Mochis/hit stars.png';

    // Times Up animation (game over)
    this.timesUpBackgroundSprite = new Image();
    this.timesUpBackgroundSprite.src = '/assets/minigames/TimesUp_Background.png';

    this.timesUpLetterSprite = new Image();
    this.timesUpLetterSprite.src = '/assets/minigames/TIMES UP_letter.png';

    // Pet sprite
    const personality = this.pet.personality ? this.pet.personality.name.toLowerCase().split('+')[0] : 'neutral';
    const stage = this.pet.stage;
    this.petSprite = new Image();
    this.petSprite.src = `/assets/pets/${stage}/${personality}.png`;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

    // CRÍTICO: También capturar evento 'click' para prevenir propagación al GameUI
    this.canvas.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  private handleMouseDown(e: MouseEvent): void {
    const coords = InputHelper.getCanvasCoordinatesFromMouse(e, this.canvas);
    // Normalizar a 0-1
    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    const state = this.game.getState();

    if (state.state === 'waiting') {
      // SIEMPRE prevenir propagación en pantalla de espera
      e.stopPropagation();

      // Check if clicked start button
      const buttonX = this.canvas.width / 2 - 100;
      const buttonY = 400;
      const buttonW = 200;
      const buttonH = 60;

      const absX = x * this.canvas.width;
      const absY = y * this.canvas.height;

      if (absX >= buttonX && absX <= buttonX + buttonW &&
          absY >= buttonY && absY <= buttonY + buttonH) {
        this.game.start();
      }
    } else if (state.state === 'playing') {
      // Prevenir propagación durante el juego
      e.stopPropagation();

      if (state.roundStep === 'tap2_drag') {
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.dragCurrentX = x;
        this.dragCurrentY = y;
        // Iniciar el seguimiento
        this.game.updateFollowing(x, y, true);
      } else {
        this.game.handleTap(x, y);
      }
    } else if (state.state === 'finished') {
      // SIEMPRE prevenir propagación en pantalla final
      e.stopPropagation();

      // Click en el botón "Ver Recompensas" para cerrar
      const buttonX = this.canvas.width / 2 - 120;
      const buttonY = 550;
      const buttonW = 240;
      const buttonH = 60;

      const absX = x * this.canvas.width;
      const absY = y * this.canvas.height;

      if (absX >= buttonX && absX <= buttonX + buttonW &&
          absY >= buttonY && absY <= buttonY + buttonH) {
        this.handleGameEnd(state);
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const coords = InputHelper.getCanvasCoordinatesFromMouse(e, this.canvas);
    this.dragCurrentX = coords.x / this.canvas.width;
    this.dragCurrentY = coords.y / this.canvas.height;

    // Actualizar seguimiento continuamente mientras se mueve
    this.game.updateFollowing(this.dragCurrentX, this.dragCurrentY, true);
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;

    const coords = InputHelper.getCanvasCoordinatesFromMouse(e, this.canvas);
    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    // Notificar que soltó el dedo
    this.game.updateFollowing(x, y, false);
    this.isDragging = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const coords = InputHelper.getCanvasCoordinatesFromTouchEvent(e, this.canvas);
    if (!coords) return;

    // Normalizar a 0-1
    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    const state = this.game.getState();

    if (state.state === 'waiting') {
      const buttonX = this.canvas.width / 2 - 100;
      const buttonY = 400;
      const buttonW = 200;
      const buttonH = 60;

      const absX = x * this.canvas.width;
      const absY = y * this.canvas.height;

      if (absX >= buttonX && absX <= buttonX + buttonW &&
          absY >= buttonY && absY <= buttonY + buttonH) {
        this.game.start();
      }
    } else if (state.state === 'playing') {
      if (state.roundStep === 'tap2_drag') {
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.dragCurrentX = x;
        this.dragCurrentY = y;
        this.game.updateFollowing(x, y, true);
      } else {
        this.game.handleTap(x, y);
      }
    } else if (state.state === 'finished') {
      const buttonX = this.canvas.width / 2 - 120;
      const buttonY = 550;
      const buttonW = 240;
      const buttonH = 60;

      const absX = x * this.canvas.width;
      const absY = y * this.canvas.height;

      if (absX >= buttonX && absX <= buttonX + buttonW &&
          absY >= buttonY && absY <= buttonY + buttonH) {
        this.handleGameEnd(state);
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDragging) return;

    const coords = InputHelper.getCanvasCoordinatesFromTouchEvent(e, this.canvas);
    if (!coords) return;

    this.dragCurrentX = coords.x / this.canvas.width;
    this.dragCurrentY = coords.y / this.canvas.height;

    this.game.updateFollowing(this.dragCurrentX, this.dragCurrentY, true);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDragging) return;

    const coords = InputHelper.getCanvasCoordinatesFromChangedTouch(e, this.canvas);
    if (!coords) return;

    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    this.game.updateFollowing(x, y, false);
    this.isDragging = false;
  }

  private handleGameEnd(state: MochiCookingGameState): void {
    if (this.hasCalledOnGameEnd) return;

    const success = state.score >= state.maxScore;
    this.hasCalledOnGameEnd = true;

    if (this.onGameEnd) {
      this.onGameEnd(success);
    }
  }

  update(deltaTime: number): void {
    this.game.update(deltaTime);
    // No llamar handleGameEnd automáticamente - esperar click del usuario
  }

  render(): void {
    const state = this.game.getState();

    if (state.state === 'waiting') {
      this.renderWaitingScreen();
    } else if (state.state === 'playing') {
      this.renderPlayingScreen(state);
    } else if (state.state === 'finished') {
      this.renderFinishedScreen(state);
    }
  }

  private renderWaitingScreen(): void {
    this.ctx.save();

    // Fondo blanco
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Título
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Cocinar Mochi', this.canvas.width / 2, 100);

    // Instrucciones
    this.ctx.font = '20px Arial';
    this.ctx.fillText('Sigue el ritmo y golpea el mochi', this.canvas.width / 2, 180);
    this.ctx.fillText('Tap en los círculos a tiempo', this.canvas.width / 2, 220);
    this.ctx.fillText('Arrastra en la dirección indicada', this.canvas.width / 2, 260);

    // Tier indicator
    const tierNames = ['Fácil', 'Medio', 'Difícil'];
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText(`Dificultad: ${tierNames[this.tier - 1]}`, this.canvas.width / 2, 320);

    // Botón de inicio
    const buttonX = this.canvas.width / 2 - 100;
    const buttonY = 400;
    const buttonW = 200;
    const buttonH = 60;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 28px Arial';
    this.ctx.fillText('¡Empezar!', this.canvas.width / 2, buttonY + 40);

    this.ctx.restore();
  }

  private renderPlayingScreen(state: MochiCookingGameState): void {
    this.ctx.save();

    // Fondo blanco
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render pet (izquierda)
    this.renderPet();

    // Render mochi (centro-abajo)
    this.renderMochi();

    // Render progress bar
    this.renderProgressBar(state);

    // Render hammer (siempre visible)
    this.renderHammer(state);

    // Render timing circles (encima del martillo) - SIEMPRE mostrar mientras haya círculos
    if (state.roundStep === 'tap1' || state.roundStep === 'hammer' || state.roundStep === 'cooldown' || state.roundStep === 'tap2_drag') {
      this.renderTimingCircles(state);
    }

    // Render feedback
    if (state.showFeedback) {
      this.renderFeedback(state);
    }

    // -------- DEBUG: CONTADOR DE BEATS --------
    // this.renderBeatCounter(state); // Deshabilitado

    // -------- PARTÍCULAS (encima de todo) --------
    this.renderParticles(state);

    this.ctx.restore();
  }

  private renderPet(): void {
    const petX = 100;
    const petY = this.canvas.height / 2 - 50; // Subir 50px para no chocar con círculos

    if (this.petSprite && this.petSprite.complete && this.petSprite.naturalWidth > 0) {
      const maxSize = 120;
      const aspectRatio = this.petSprite.width / this.petSprite.height;
      let w = maxSize;
      let h = maxSize;

      if (aspectRatio > 1) {
        h = w / aspectRatio;
      } else {
        w = h * aspectRatio;
      }

      this.ctx.drawImage(this.petSprite, petX - w / 2, petY - h / 2, w, h);
    } else {
      // Fallback emoji
      const stageEmojis = {
        [LifeStage.Egg]: '🥚',
        [LifeStage.Baby]: '🐣',
        [LifeStage.Child]: '🐥',
        [LifeStage.Young]: '🦆',
        [LifeStage.Adult]: '🦢',
        [LifeStage.ReadyToAscend]: '✨',
        [LifeStage.Dead]: '💀',
      };

      this.ctx.font = '80px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(stageEmojis[this.pet.stage], petX, petY);
    }
  }

  private renderMochi(): void {
    const mochiX = this.canvas.width / 2;
    const mochiY = 400; // Centrado más arriba para accesibilidad

    if (this.mochiSprite && this.mochiSprite.complete && this.mochiSprite.naturalWidth > 0) {
      const mochiSize = 100;
      const aspectRatio = this.mochiSprite.width / this.mochiSprite.height;
      let w = mochiSize;
      let h = mochiSize;

      if (aspectRatio > 1) {
        h = w / aspectRatio;
      } else {
        w = h * aspectRatio;
      }

      this.ctx.drawImage(this.mochiSprite, mochiX - w / 2, mochiY - h / 2, w, h);
    } else {
      // Fallback circle
      this.ctx.fillStyle = '#FFE4B5';
      this.ctx.beginPath();
      this.ctx.arc(mochiX, mochiY, 50, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#DEB887';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }

    // Render circumference
    if (this.circumferenceSprite && this.circumferenceSprite.complete && this.circumferenceSprite.naturalWidth > 0) {
      const circSize = 300;
      this.ctx.globalAlpha = 0.4;
      this.ctx.drawImage(
        this.circumferenceSprite,
        mochiX - circSize / 2,
        mochiY - circSize / 2,
        circSize,
        circSize
      );
      this.ctx.globalAlpha = 1;
    }
  }

  private renderProgressBar(state: MochiCookingGameState): void {
    const barX = 50;
    const barY = 30;
    const barW = this.canvas.width - 100;
    const barH = 30;

    // Background
    this.ctx.fillStyle = '#ddd';
    this.ctx.fillRect(barX, barY, barW, barH);

    // Progress
    const progress = state.score / state.maxScore;
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fillRect(barX, barY, barW * progress, barH);

    // Border
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(barX, barY, barW, barH);

    // Text
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${state.score} / ${state.maxScore}`, this.canvas.width / 2, barY + 20);
  }

  private renderTimingCircles(state: MochiCookingGameState): void {
    const mochiX = this.canvas.width / 2;
    const mochiY = 400; // Centrado más arriba para accesibilidad
    const radius = 150; // Radio de la circunferencia

    // MOSTRAR TODOS LOS CÍRCULOS DEL CAMINO (preview) - AL FINAL para que estén encima
    // Se renderiza después de todo lo demás

    // -------- CÁPSULA DEL PREVIEW (durante hammer/cooldown) --------
    if ((state.roundStep === 'hammer' || state.roundStep === 'cooldown') && state.previewRound.swipeTarget) {
      const swipe = state.previewRound.swipeTarget;
      const startX = mochiX + Math.cos(swipe.startCircle.angle) * radius;
      const startY = mochiY + Math.sin(swipe.startCircle.angle) * radius;
      const endX = mochiX + Math.cos(swipe.endCircle.angle) * radius;
      const endY = mochiY + Math.sin(swipe.endCircle.angle) * radius;

      // Render CÁPSULA mostrando el camino del drag (desde startCircle hasta endCircle)
      const capsuleWidth = 60; // Ancho de la cápsula
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      this.ctx.save();
      this.ctx.translate(startX, startY);
      this.ctx.rotate(angle);

      // Dibujar cápsula BLANCO Y NEGRO con patrón de líneas
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Gris claro
      this.ctx.strokeStyle = '#000'; // Borde negro
      this.ctx.lineWidth = 4;

      // Rectángulo central
      this.ctx.fillRect(0, -capsuleWidth / 2, length, capsuleWidth);
      this.ctx.strokeRect(0, -capsuleWidth / 2, length, capsuleWidth);

      // Círculo inicio (izquierda)
      this.ctx.beginPath();
      this.ctx.arc(0, 0, capsuleWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Círculo fin (derecha)
      this.ctx.beginPath();
      this.ctx.arc(length, 0, capsuleWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Líneas diagonales para patrón
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < length; i += 15) {
        this.ctx.beginPath();
        this.ctx.moveTo(i, -capsuleWidth / 2);
        this.ctx.lineTo(i + 10, capsuleWidth / 2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    // -------- CÁPSULA ACTIVE (durante tap1/tap2_drag) --------
    if (state.roundStep !== 'hammer' && state.roundStep !== 'cooldown' && state.currentSwipe) {
      const swipe = state.currentSwipe;
      const startX = mochiX + Math.cos(swipe.startCircle.angle) * radius;
      const startY = mochiY + Math.sin(swipe.startCircle.angle) * radius;
      const endX = mochiX + Math.cos(swipe.endCircle.angle) * radius;
      const endY = mochiY + Math.sin(swipe.endCircle.angle) * radius;

      // Render CÁPSULA mostrando el camino del drag (desde startCircle hasta endCircle)
      const capsuleWidth = 60; // Ancho de la cápsula
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      this.ctx.save();
      this.ctx.translate(startX, startY);
      this.ctx.rotate(angle);

      // Dibujar cápsula BLANCO Y NEGRO con patrón de líneas
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Gris claro
      this.ctx.strokeStyle = '#000'; // Borde negro
      this.ctx.lineWidth = 4;

      // Rectángulo central
      this.ctx.fillRect(0, -capsuleWidth / 2, length, capsuleWidth);
      this.ctx.strokeRect(0, -capsuleWidth / 2, length, capsuleWidth);

      // Círculo inicio (izquierda)
      this.ctx.beginPath();
      this.ctx.arc(0, 0, capsuleWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Círculo fin (derecha)
      this.ctx.beginPath();
      this.ctx.arc(length, 0, capsuleWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Líneas diagonales para patrón
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < length; i += 15) {
        this.ctx.beginPath();
        this.ctx.moveTo(i, -capsuleWidth / 2);
        this.ctx.lineTo(i + 15, capsuleWidth / 2);
        this.ctx.stroke();
      }

      this.ctx.restore();

      // Render end marker (punto de llegada del drag)
      if (state.roundStep === 'tap2_drag') {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(endX, endY, 20, 0, Math.PI * 2);
        this.ctx.fill();

        // Render drag trail if dragging (BLANCO Y NEGRO)
        if (this.isDragging) {
          const currentX = this.dragCurrentX * this.canvas.width;
          const currentY = this.dragCurrentY * this.canvas.height;

          // Draw trail line from start to current position (NEGRO con borde blanco)
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 10;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(startX, startY);
          this.ctx.lineTo(currentX, currentY);
          this.ctx.stroke();

          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 6;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(startX, startY);
          this.ctx.lineTo(currentX, currentY);
          this.ctx.stroke();

          // Draw circle following the finger (BLANCO con borde negro)
          this.ctx.fillStyle = '#fff';
          this.ctx.beginPath();
          this.ctx.arc(currentX, currentY, 16, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.arc(currentX, currentY, 16, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
    }

    // ============ RENDERIZAR CÍRCULOS ANIMADOS ============
    // Usar SIEMPRE roundStartTime para calcular progreso (no se resetea)
    // Durante hammer/cooldown, renderizar preview round en su lugar

    const beatDuration = this.game.getBeatDuration();

    // -------- ACTIVE ROUND (tap1, tap2_drag) --------
    if (state.roundStep !== 'hammer' && state.roundStep !== 'cooldown' && state.roundStartTime) {
      // ✅ SOLUCIÓN: Usar tiempo absoluto desde roundStartTime (SIN restar offset)
      // roundStartTime = momento en que empezó el preview (2 beats atrás)
      // Los anillos deben continuar encogiendo desde el preview sin resetear
      const absoluteElapsed = Date.now() - state.roundStartTime;

      // -------- CÍRCULO TAP1 --------
      // Solo visible durante 'tap1' (antes de pulsar)
      if (state.roundStep === 'tap1' && state.currentTarget) {
        const target = state.currentTarget;
        const targetX = mochiX + Math.cos(target.angle) * radius;
        const targetY = mochiY + Math.sin(target.angle) * radius;

        // Progreso: absoluteElapsed / (2 beats totales)
        // Durante cooldown: 0 → 1 (2 beats)
        // Durante tap1: continúa desde donde quedó (sin reset)
        const totalDuration = 2 * beatDuration; // 2 beats TOTALES (preview + tap1)
        const tap1Progress = Math.max(0, Math.min(1, absoluteElapsed / totalDuration));

        this.renderCircle(targetX, targetY, tap1Progress, 2); // 2 beats totales
      }

      // -------- CÍRCULO TAP2 --------
      // Visible durante tap1 (preview) y tap2_drag (si !isFollowing)
      const shouldShowTap2 =
        state.roundStep === 'tap1' ||
        (state.roundStep === 'tap2_drag' && !state.isFollowing);

      if (shouldShowTap2 && state.currentSwipe) {
        const tap2Start = state.currentSwipe.startCircle;
        const tap2X = mochiX + Math.cos(tap2Start.angle) * radius;
        const tap2Y = mochiY + Math.sin(tap2Start.angle) * radius;

        // Progreso: absoluteElapsed / (3 beats totales)
        // Tap2 aparece en preview y continúa durante tap1 y tap2_drag
        const totalDuration = 3 * beatDuration; // 3 beats TOTALES (más anticipación)
        const tap2Progress = Math.max(0, Math.min(1, absoluteElapsed / totalDuration));

        this.renderCircle(tap2X, tap2Y, tap2Progress, 3); // 3 beats totales
      }
    }

    // -------- PREVIEW ROUND (durante hammer/cooldown) --------
    // Los círculos de preview duran 2 beats (beats 3-4) y deben estar completamente cerrados al final
    if ((state.roundStep === 'hammer' || state.roundStep === 'cooldown') && state.previewRound.tap1Circle) {
      const previewElapsed = Date.now() - state.previewRound.startTime;
      const previewDuration = 2 * beatDuration; // 2 beats para anticipación completa

      // -------- CÍRCULO TAP1 PREVIEW --------
      const tap1Circle = state.previewRound.tap1Circle;
      const tap1X = mochiX + Math.cos(tap1Circle.angle) * radius;
      const tap1Y = mochiY + Math.sin(tap1Circle.angle) * radius;

      // Progreso: 0-1 durante 2 beats (se cierra completamente al final del hammer)
      const tap1Progress = Math.max(0, Math.min(1, previewElapsed / previewDuration));
      this.renderCircle(tap1X, tap1Y, tap1Progress, 2); // 2 beats de duración

      // -------- CÍRCULO TAP2 PREVIEW --------
      // Visible desde el inicio del preview
      if (state.previewRound.swipeTarget) {
        const tap2Start = state.previewRound.swipeTarget.startCircle;
        const tap2X = mochiX + Math.cos(tap2Start.angle) * radius;
        const tap2Y = mochiY + Math.sin(tap2Start.angle) * radius;

        // Progreso: tap2 también dura 2 beats pero empieza desde 0 (no desde beat 1)
        // Para que tenga más margen visual, podría durar más (ej: 3 beats)
        const tap2Duration = 3 * beatDuration; // 3 beats (más anticipación)
        const tap2Progress = Math.max(0, Math.min(1, previewElapsed / tap2Duration));
        this.renderCircle(tap2X, tap2Y, tap2Progress, 3); // 3 beats de duración
      }
    }

    // RENDERIZAR CÍRCULOS DE PREVIEW AL FINAL (para que estén encima de todo)
    // Tamaños diferentes: tap1 (pequeño) -> tap2_start (mediano) -> tap2_end (grande)

    // Durante tap1/tap2_drag: Mostrar círculos de ronda ACTIVA
    // Durante hammer/cooldown: Mostrar círculos de ronda PREVIEW (siguiente)
    const circlesArray = (state.roundStep === 'hammer' || state.roundStep === 'cooldown')
      ? state.previewRound.allCircles
      : state.allCircles;

    if (circlesArray && circlesArray.length > 0) {
      // Log de posiciones renderizadas (solo tap1, el primero del array)
      if (circlesArray[0] && state.roundStep === 'cooldown') {
        console.log(`[🎨 RENDER] cooldown - showing tap1 at (${circlesArray[0].x.toFixed(2)}, ${circlesArray[0].y.toFixed(2)})`);
      }

      circlesArray.forEach((circle, index) => {
        const circleX = mochiX + Math.cos(circle.angle) * radius;
        const circleY = mochiY + Math.sin(circle.angle) * radius;

        // Tamaños progresivos: más tarde ocurre = más grande
        const baseRadius = 20 + (index * 8); // 20, 28, 36
        const borderRadius = baseRadius + 3;

        // Borde blanco grueso para destacar sobre fondo
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.arc(circleX, circleY, borderRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Círculo de preview NEGRO con borde
        this.ctx.fillStyle = '#000';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(circleX, circleY, baseRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Número del paso en BLANCO
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${14 + index * 2}px Arial`; // 14, 16, 18
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${index + 1}`, circleX, circleY);
      });
    }
  }

  private renderBeatCounter(state: MochiCookingGameState): void {
    // Calcular beat desde roundStartTime y stepStartTime
    const currentBeat = this.game.getCurrentBeat();
    const stepBeat = this.game.getCurrentStepBeat();

    // Fondo semi-transparente
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(this.canvas.width - 200, 10, 190, 140);

    // Texto
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.textAlign = 'left';

    this.ctx.fillText(`Round Beat: ${currentBeat.toFixed(2)}`, this.canvas.width - 190, 35);
    this.ctx.fillText(`Step Beat: ${stepBeat.toFixed(2)}`, this.canvas.width - 190, 60);
    this.ctx.fillText(`Step: ${state.roundStep}`, this.canvas.width - 190, 85);
    this.ctx.fillText(`Score: ${state.score}`, this.canvas.width - 190, 110);
    this.ctx.fillText(`BPM: ${this.game.getBPM()}`, this.canvas.width - 190, 135);
  }

  private renderCircle(x: number, y: number, progress: number, beats: number): void {
    // Radios constantes (no escalar por duración para mantener consistencia visual)
    const baseOuterRadius = 60;
    const innerRadius = 25;

    // OPCIÓN A: Tamaño constante (recomendado)
    const outerRadius = baseOuterRadius;

    // OPCIÓN B (alternativa): Escalar por √beats para que círculos de más beats sean ligeramente más grandes
    // const outerRadius = baseOuterRadius * Math.sqrt(beats / 1); // tap2 (2 beats) será √2 ≈ 1.41x más grande

    // Outer circle (shrinking): se encoge desde outer hasta inner
    const currentRadius = outerRadius - (outerRadius - innerRadius) * progress;

    // Borde negro del círculo que se encoge
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner circle (fixed target) - círculo blanco fijo en el centro
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  private renderArrow(x: number, y: number, direction: SwipeDirection): void {
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

    const angle = angles[direction];

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    if (this.arrowSprite && this.arrowSprite.complete && this.arrowSprite.naturalWidth > 0) {
      // Usar una flecha del sprite sheet (todas apuntan a la derecha)
      const arrowW = 40;
      const arrowH = 40;
      this.ctx.drawImage(
        this.arrowSprite,
        0, 0, // Tomar la primera flecha del sprite sheet
        this.arrowSprite.width / 5, this.arrowSprite.height,
        -arrowW / 2, -arrowH / 2 - 60, // Offset arriba del círculo
        arrowW, arrowH
      );
    } else {
      // Fallback arrow
      this.ctx.fillStyle = '#FF0000';
      this.ctx.beginPath();
      this.ctx.moveTo(0, -50);
      this.ctx.lineTo(10, -40);
      this.ctx.lineTo(5, -40);
      this.ctx.lineTo(5, -30);
      this.ctx.lineTo(-5, -30);
      this.ctx.lineTo(-5, -40);
      this.ctx.lineTo(-10, -40);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private renderHammer(state: MochiCookingGameState): void {
    const petX = 100;
    const petY = this.canvas.height / 2;
    const mochiX = this.canvas.width / 2;
    const mochiY = 400; // Centrado más arriba para accesibilidad

    // Martillo SIEMPRE junto al pet
    const hammerX = petX;
    const hammerY = petY;

    // Calcular el ángulo hacia el target actual
    let targetAngle = 0;
    if (state.currentTarget) {
      const targetX = mochiX + Math.cos(state.currentTarget.angle) * 150;
      const targetY = mochiY + Math.sin(state.currentTarget.angle) * 150;
      targetAngle = Math.atan2(targetY - petY, targetX - petX);
    }

    // Durante el golpe, rotar el martillo hacia horizontal (hacia el mochi)
    const swingAngle = state.hammerHitProgress * (Math.PI / 4); // Gira 45 grados cuando golpea
    const currentAngle = targetAngle + swingAngle;

    this.ctx.save();
    this.ctx.translate(hammerX, hammerY);
    this.ctx.rotate(currentAngle);

    if (this.hammerSprite && this.hammerSprite.complete && this.hammerSprite.naturalWidth > 0) {
      const hammerSize = 80;
      const aspectRatio = this.hammerSprite.width / this.hammerSprite.height;
      let w = hammerSize;
      let h = hammerSize;

      if (aspectRatio > 1) {
        h = w / aspectRatio;
      } else {
        w = h * aspectRatio;
      }

      // Dibujar el martillo desde su base (no centrado)
      this.ctx.drawImage(this.hammerSprite, 0, -h / 2, w, h);
    }

    this.ctx.restore();

    // Show stars at target cuando el martillo golpea
    if (state.hammerHitProgress > 0.4 && state.hammerHitProgress < 0.6 && state.currentTarget) {
      const targetX = mochiX + Math.cos(state.currentTarget.angle) * 150;
      const targetY = mochiY + Math.sin(state.currentTarget.angle) * 150;

      if (this.starsSprite && this.starsSprite.complete && this.starsSprite.naturalWidth > 0) {
        const starSize = 60;
        this.ctx.drawImage(
          this.starsSprite,
          targetX - starSize / 2,
          targetY - starSize / 2,
          starSize,
          starSize
        );
      }
    }
  }

  private renderFeedback(state: MochiCookingGameState): void {
    if (!state.feedbackType) return;

    const centerX = this.canvas.width / 2;
    const centerY = 200;

    this.ctx.save();
    this.ctx.font = 'bold 80px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (state.feedbackType === 'YES') {
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 8;
      this.ctx.strokeText('YES!', centerX, centerY);
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.fillText('YES!', centerX, centerY);
    } else {
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 8;
      this.ctx.strokeText('AUCH!', centerX, centerY);
      this.ctx.fillStyle = '#FF0000';
      this.ctx.fillText('AUCH!', centerX, centerY);
    }

    this.ctx.restore();
  }

  private renderFinishedScreen(state: MochiCookingGameState): void {
    this.ctx.save();

    // Fondo blanco
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const success = state.score >= state.maxScore;

    if (!success) {
      // Render GAME OVER with Times Up animation
      this.renderGameOver(state);
    } else {
      // Render SUCCESS screen
      this.renderSuccess(state);
    }

    this.ctx.restore();
  }

  private renderGameOver(state: MochiCookingGameState): void {
    // Animación Times Up
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

      if (this.timesUpLetterSprite && this.timesUpLetterSprite.complete && this.timesUpLetterSprite.naturalWidth > 0) {
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

    // Mensaje aparece después de 300ms
    if (elapsed >= 300) {
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('MOCHI QUEMADO', centerX, centerY + 100);

      this.ctx.font = 'bold 24px Arial';
      this.ctx.fillText('El ingrediente se perdió...', centerX, centerY + 150);

      // Botón "Ver Recompensas" (bueno, en este caso no hay recompensas pero mantener consistencia)
      const buttonX = this.canvas.width / 2 - 120;
      const buttonY = 550;
      const buttonW = 240;
      const buttonH = 60;

      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('Continuar', buttonX + buttonW / 2, buttonY + buttonH / 2);
    }
  }

  private renderSuccess(state: MochiCookingGameState): void {
    const centerX = this.canvas.width / 2;

    // Título
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 40px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('¡SALIÓ UN MOCHI', centerX, 100);

    // Nombre del ingrediente
    const ingredientName = this.getIngredientDisplayName();
    this.ctx.font = 'bold 48px Arial';
    this.ctx.fillText(`${ingredientName.toUpperCase()}!`, centerX, 160);

    // Emoji mochi
    this.ctx.font = '100px Arial';
    this.ctx.fillText('🍡', centerX, 280);

    // Subtitle
    this.ctx.font = 'bold 28px Arial';
    this.ctx.fillText('¡Riquísimo!', centerX, 340);

    // Estrellas de hambre
    const stars = this.tier; // tier 1 = 1 estrella, tier 2 = 2 estrellas, tier 3 = 3 estrellas
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText('Hambre recuperada:', centerX, 400);
    this.ctx.font = '32px Arial';
    this.ctx.fillText('⭐'.repeat(stars), centerX, 440);

    // Recuerdo generado
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Recuerdo generado: Comida ${ingredientName}`, centerX, 490);

    // Botón "Ver Recompensas"
    const buttonX = this.canvas.width / 2 - 120;
    const buttonY = 550;
    const buttonW = 240;
    const buttonH = 60;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Ver Recompensas', buttonX + buttonW / 2, buttonY + buttonH / 2);
  }

  private getIngredientDisplayName(): string {
    // Extraer el nombre del ingrediente
    if (this.ingredientId === 'neutral') {
      return 'Neutral';
    }

    // El formato del ID es: tier1_anxious_rice, tier2_edgy_nori, etc.
    const parts = this.ingredientId.split('_');
    if (parts.length >= 2) {
      const personality = parts[1];
      return personality.charAt(0).toUpperCase() + personality.slice(1);
    }

    return 'Misterioso';
  }

  private renderParticles(state: MochiCookingGameState): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    state.particles.forEach(particle => {
      // Calcular alpha (fade out) basado en lifetime
      const alpha = 1 - (particle.lifetime / particle.maxLifetime);

      // Posición en píxeles
      const x = particle.x * canvasWidth;
      const y = particle.y * canvasHeight;

      // Dibujar estrella (5 puntas)
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#FFD700'; // Dorado

      this.ctx.translate(x, y);
      this.ctx.beginPath();

      // Estrella de 5 puntas
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? particle.size : particle.size / 2;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;

        if (i === 0) {
          this.ctx.moveTo(px, py);
        } else {
          this.ctx.lineTo(px, py);
        }
      }

      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  reset(): void {
    this.game.reset();
    this.hasCalledOnGameEnd = false;
    this.isDragging = false;
  }

  destroy(): void {
    this.game.reset();
  }
}
