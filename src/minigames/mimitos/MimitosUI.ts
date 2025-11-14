import { MimitosGame, MimitosGameState } from './MimitosGame';
import { Pet } from '../../core/Pet';
import { InputHelper } from '../../utils/InputHelper';

interface FloatingHeart {
  x: number;
  y: number;
  velocityY: number;
  opacity: number;
  life: number; // 0-1, decreases over time
}

interface StarParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  opacity: number;
  life: number;
}

export class MimitosUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: MimitosGame;
  private pet: Pet;
  private onGameEnd?: () => void;

  // Sistema de zoom (aplicado por GameUI, solo guardamos el valor aquí)
  currentZoom: number = 1.0; // Public para que GameUI pueda leerlo
  private readonly maxZoom: number = 1.5;
  private readonly zoomIncrement: number = 0.1; // Incremento por tap (aumentado para ser más notorio)
  private readonly zoomDecay: number = 0.3; // Velocidad de decay por segundo (reducido para mantener zoom más tiempo)

  // Corazones flotantes
  private hearts: FloatingHeart[] = [];

  // Partículas estrellitas en la barra de progreso
  private starParticles: StarParticle[] = [];

  // Event listeners (guardamos referencias para poder removerlos)
  private clickHandler: (e: MouseEvent) => void;
  private touchHandler: (e: TouchEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    game: MimitosGame,
    pet: Pet,
    onGameEnd?: () => void
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.game = game;
    this.pet = pet;
    this.onGameEnd = onGameEnd;

    // Crear event handlers
    this.clickHandler = (e: MouseEvent) => {
      const { x, y } = InputHelper.getCanvasCoordinatesFromMouse(e, this.canvas);
      this.handleClick(x, y);
    };

    this.touchHandler = (e: TouchEvent) => {
      e.preventDefault();
      const coords = InputHelper.getCanvasCoordinatesFromTouchEvent(e, this.canvas);
      if (!coords) return;
      this.handleClick(coords.x, coords.y);
    };

    this.setupInput();
    // No cargamos sprites, el main room ya los tiene
  }

  private setupInput() {
    // Mouse events
    this.canvas.addEventListener('click', this.clickHandler);

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.touchHandler);
  }

  private handleClick(x: number, y: number) {
    const state = this.game.getState();

    if (state.phase === 'playing') {
      // Tap durante el juego
      this.game.tap();
      this.onTap(x, y);
    } else if (state.phase === 'finished' && this.game.canClose()) {
      // Click para terminar (solo si pasó el delay)
      this.handleGameEnd();
    }
  }

  private onTap(x: number, y: number) {
    // Incrementar zoom
    this.currentZoom = Math.min(this.maxZoom, this.currentZoom + this.zoomIncrement);

    // APLICAR GROWTH INMEDIATAMENTE (para que la barra suba al instante)
    this.pet.giveMimitos();

    // Spawn corazón en posición random cerca del tap
    const offsetX = (Math.random() - 0.5) * 50;
    const offsetY = (Math.random() - 0.5) * 50;

    this.hearts.push({
      x: x + offsetX,
      y: y + offsetY,
      velocityY: -50 - Math.random() * 50, // Sube entre -50 y -100 px/s
      opacity: 1.0,
      life: 1.0,
    });

    // Spawn estrellitas desde el punto de la barra de progreso
    const barX = 40;
    const barY = 520;
    const barWidth = 360;
    const barHeight = 24;
    const progress = this.pet.getGrowthProgress();

    // Punto donde termina la barra negra (progreso actual)
    const barEndX = barX + (barWidth * progress);
    const barCenterY = barY + barHeight / 2;

    // Spawn 3-5 estrellitas desde ese punto
    const numStars = 3 + Math.floor(Math.random() * 3); // 3-5 estrellas
    for (let i = 0; i < numStars; i++) {
      const angle = (Math.random() - 0.5) * Math.PI; // Ángulos aleatorios hacia arriba
      const speed = 80 + Math.random() * 40; // Velocidad entre 80-120 px/s

      this.starParticles.push({
        x: barEndX,
        y: barCenterY,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 50, // Bias hacia arriba
        opacity: 1.0,
        life: 1.0,
      });
    }
  }

  private handleGameEnd() {
    if (this.onGameEnd) {
      this.onGameEnd();
    }
  }

  update(deltaTime: number) {
    this.game.update(deltaTime);

    // Decay del zoom si no se está tapeando
    const state = this.game.getState();
    if (state.phase === 'playing') {
      // Revertir zoom gradualmente hacia 1.0
      if (this.currentZoom > 1.0) {
        this.currentZoom = Math.max(1.0, this.currentZoom - this.zoomDecay * deltaTime);
      }
    }

    // Update corazones flotantes
    this.hearts = this.hearts.filter(heart => {
      heart.y += heart.velocityY * deltaTime;
      heart.life -= deltaTime * 0.8; // Duran ~1.25 segundos
      heart.opacity = heart.life;
      return heart.life > 0;
    });

    // Update estrellitas de la barra
    this.starParticles = this.starParticles.filter(star => {
      star.x += star.velocityX * deltaTime;
      star.y += star.velocityY * deltaTime;
      star.velocityY += 200 * deltaTime; // Gravedad
      star.life -= deltaTime * 1.2; // Duran ~0.83 segundos
      star.opacity = star.life;
      return star.life > 0;
    });
  }

  render() {
    const state = this.game.getState();

    if (state.phase === 'playing') {
      this.renderOverlay(state);
    } else if (state.phase === 'finished') {
      this.renderFinishedScreen(state);
    }
  }

  // Renderiza SOLO las capas adicionales sobre el main room
  private renderOverlay(state: MimitosGameState) {
    this.ctx.save();

    // NO renderizamos room ni pet, el main ya lo hace
    // Solo renderizamos las capas adicionales:

    // 1. Corazones flotantes
    this.renderHearts();

    // 2. Estrellitas de la barra (la barra de crecimiento la renderiza GameUI)
    this.renderStarParticles();

    // 3. Barra de tiempo decreciente (arriba)
    this.renderTimeBar(state);

    this.ctx.restore();
  }

  private renderHearts() {
    this.ctx.save();

    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const heart of this.hearts) {
      this.ctx.globalAlpha = heart.opacity;
      this.ctx.fillText('❤️', heart.x, heart.y);
    }

    this.ctx.globalAlpha = 1.0;
    this.ctx.restore();
  }

  private renderTimeBar(state: MimitosGameState) {
    this.ctx.save();

    const barX = 40;
    const barY = 40;
    const barWidth = this.canvas.width - 80;
    const barHeight = 30;

    // Fondo de la barra (gris)
    this.ctx.fillStyle = '#ddd';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progreso de la barra (decreciente, rosa)
    const progress = this.game.getTimeProgress();
    this.ctx.fillStyle = '#ff69b4'; // Rosa
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    // Borde de la barra
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Texto del tiempo restante
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      `${state.timeLeft.toFixed(1)}s`,
      this.canvas.width / 2,
      barY + barHeight / 2
    );

    this.ctx.restore();
  }

  private renderStarParticles() {
    this.ctx.save();

    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const star of this.starParticles) {
      this.ctx.globalAlpha = star.opacity;
      this.ctx.fillText('✨', star.x, star.y);
    }

    this.ctx.globalAlpha = 1.0;
    this.ctx.restore();
  }

  private renderFinishedScreen(state: MimitosGameState) {
    this.ctx.save();

    // Fondo semi-transparente
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Mensaje de finalización
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('💕 ¡Mimitos! 💕', centerX, centerY - 100);

    this.ctx.font = '32px Arial';
    this.ctx.fillText(`${state.tapsCount} taps`, centerX, centerY - 20);

    // Calcular % de progreso ganado
    const progressPercent = (state.tapsCount * 0.2).toFixed(1);
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`+${progressPercent}% de crecimiento`, centerX, centerY + 40);

    // Botón para continuar
    const buttonX = centerX - 100;
    const buttonY = centerY + 120;
    const buttonW = 200;
    const buttonH = 50;

    this.ctx.fillStyle = '#ff69b4';
    this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText('Continuar', centerX, buttonY + buttonH / 2);

    this.ctx.restore();
  }

  cleanup(): void {
    // Remover event listeners para evitar acumulación en múltiples sesiones
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.touchHandler);

    console.log('[MimitosUI] Cleanup completed, event listeners removed');
  }
}
