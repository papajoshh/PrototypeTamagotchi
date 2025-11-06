// MochiCooking Minigame - UI Rendering
import { Pet } from '../../core/Pet';
import { MochiCookingGame, MochiCookingGameState, SwipeDirection } from './MochiCookingGame';
import { LifeStage } from '../../core/LifeStage';

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
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

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

    const rect = this.canvas.getBoundingClientRect();
    this.dragCurrentX = (e.clientX - rect.left) / rect.width;
    this.dragCurrentY = (e.clientY - rect.top) / rect.height;

    // Actualizar seguimiento continuamente mientras se mueve
    this.game.updateFollowing(this.dragCurrentX, this.dragCurrentY, true);
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Notificar que soltó el dedo
    this.game.updateFollowing(x, y, false);
    this.isDragging = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseDown(mouseEvent);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseMove(mouseEvent);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const mouseEvent = new MouseEvent('mouseup', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseUp(mouseEvent);
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
    if (state.roundStep === 'tap1' || state.roundStep === 'cooldown' || state.roundStep === 'tap2_drag') {
      this.renderTimingCircles(state);
    }

    // Render feedback
    if (state.showFeedback) {
      this.renderFeedback(state);
    }

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

    // Render CÁPSULA si existe currentSwipe (desde tap1 ya se muestra el camino)
    if (state.currentSwipe) {
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

      // Render circle según el estado
      if (state.roundStep === 'tap2_drag') {
        // FASE TAP2: Calcular posición actual del círculo (interpolación basada en swipeMoveProgress)
        const progress = state.swipeMoveProgress;
        const currentCircleX = startX + (endX - startX) * progress;
        const currentCircleY = startY + (endY - startY) * progress;

        // Calcular progreso CORRECTO basado en roundStartTime (no stepStartTime)
        // Para que el círculo NO crezca al cambiar de tap1 a tap2_drag
        const tap1Duration = this.game.getCircleDuration();
        const cooldownDuration = this.game.getCooldownDuration();
        const totalTimeUntilTap2 = tap1Duration + cooldownDuration;
        const elapsedSinceRoundStart = Date.now() - this.game.getRoundStartTime();
        const tap2Progress = Math.max(0, Math.min(1, elapsedSinceRoundStart / totalTimeUntilTap2));

        // Render circle con progreso correcto y duración TOTAL (igual que en preview)
        this.renderCircle(currentCircleX, currentCircleY, tap2Progress, totalTimeUntilTap2);

        // Render end marker
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

    // Render tap1 circle si estamos en esa fase
    if (state.roundStep === 'tap1' && state.currentTarget) {
      const target = state.currentTarget;
      const targetX = mochiX + Math.cos(target.angle) * radius;
      const targetY = mochiY + Math.sin(target.angle) * radius;

      const tap1Duration = this.game.getCircleDuration();
      this.renderCircle(targetX, targetY, state.circleProgress, tap1Duration);
    }

    // Render tap2 circle TAMBIÉN durante tap1 y cooldown (preview de cuándo hay que tapear)
    if ((state.roundStep === 'tap1' || state.roundStep === 'cooldown') && state.currentSwipe) {
      const tap2Start = state.currentSwipe.startCircle;
      const tap2X = mochiX + Math.cos(tap2Start.angle) * radius;
      const tap2Y = mochiY + Math.sin(tap2Start.angle) * radius;

      const tap1Duration = this.game.getCircleDuration();
      const cooldownDuration = this.game.getCooldownDuration();
      const totalTimeUntilTap2 = tap1Duration + cooldownDuration;

      // Tiempo transcurrido desde el inicio de la ronda
      const elapsedSinceRoundStart = Date.now() - this.game.getRoundStartTime();

      // Progreso de tap2: mismo cálculo de progreso pero con tiempo total
      const tap2Progress = Math.max(0, Math.min(1, elapsedSinceRoundStart / totalTimeUntilTap2));

      // Renderizar tap2 circle con duración TOTAL (tap1 + cooldown)
      // El círculo será MÁS GRANDE porque tiene más tiempo
      this.renderCircle(tap2X, tap2Y, tap2Progress, totalTimeUntilTap2);
    }

    // RENDERIZAR CÍRCULOS DE PREVIEW AL FINAL (para que estén encima de todo)
    // Tamaños diferentes: tap1 (pequeño) -> tap2_start (mediano) -> tap2_end (grande)
    if (state.allCircles && state.allCircles.length > 0) {
      state.allCircles.forEach((circle, index) => {
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

  private renderCircle(x: number, y: number, progress: number, durationMs: number = 1200): void {
    // VELOCIDAD CONSTANTE: radio se reduce a velocidad constante
    // Si dura más tiempo, el círculo inicial debe ser MÁS GRANDE
    const baseOuterRadius = 60; // Radio base para 1.2s
    const baseInnerRadius = 25;

    // Escalar el radio según la duración (más tiempo = más grande)
    const durationScale = durationMs / 1200; // 1200ms es la duración base
    const outerRadius = baseOuterRadius * durationScale;
    const innerRadius = baseInnerRadius;

    // Outer circle (shrinking) - usar siempre dibujado programático para mejor control
    const currentRadius = outerRadius - (outerRadius - innerRadius) * progress;

    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner circle (fixed target) - BLANCO Y NEGRO
    this.ctx.fillStyle = '#fff'; // BLANCO
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

  reset(): void {
    this.game.reset();
    this.hasCalledOnGameEnd = false;
    this.isDragging = false;
  }

  destroy(): void {
    this.game.reset();
  }
}
