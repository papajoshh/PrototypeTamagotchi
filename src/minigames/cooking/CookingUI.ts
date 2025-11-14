// Cooking Minigame - UI Rendering
import { Pet } from '../../core/Pet';
import { CookingGame, CookingGameState, DraggedIngredient } from './CookingGame';
import { LifeStage } from '../../core/LifeStage';
import { InputHelper } from '../../utils/InputHelper';

export class CookingUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: CookingGame;
  private pet: Pet;
  private tier: number;
  private ingredientId: string;

  // Sprites
  private petSprite: HTMLImageElement | null = null;
  private kitchenSprite: HTMLImageElement | null = null;
  private basketSprite: HTMLImageElement | null = null;
  private ingredientSprites: Map<string, HTMLImageElement> = new Map();

  // Drag & Drop state
  private draggingIngredient: DraggedIngredient | null = null;
  private draggingFromBasketIndex: number = -1; // Si estamos dragging desde la cesta
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  // Swipe gesture detection
  private swipeStartX: number = 0;
  private swipeStartY: number = 0;
  private isSwiping: boolean = false;
  private readonly SWIPE_THRESHOLD = 50; // px mínimos para detectar swipe

  // Camera smooth transition
  private cameraOffsetX: number = 0; // Offset actual (interpolado)
  private targetCameraOffsetX: number = 0; // Offset objetivo
  private readonly CAMERA_LERP = 0.15; // Velocidad de interpolación

  // Screenshake
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private readonly SHAKE_DURATION = 500; // 500ms
  private readonly SHAKE_INTENSITY = 10; // píxeles

  // Callbacks
  onGameEnd?: (success: boolean) => void;
  private hasCalledOnGameEnd: boolean = false;

  constructor(canvas: HTMLCanvasElement, pet: Pet, tier: number = 1, ingredientId: string = 'neutral') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.pet = pet;
    this.tier = tier;
    this.ingredientId = ingredientId;
    this.game = new CookingGame(tier);

    this.loadSprites();
    this.setupEventListeners();
  }

  private loadSprites(): void {
    // Kitchen background (3 pantallas)
    this.kitchenSprite = new Image();
    this.kitchenSprite.src = '/assets/minigames/Cooking/Cocina.png';

    // Basket
    this.basketSprite = new Image();
    this.basketSprite.src = '/assets/minigames/Cooking/cart.png';

    // Pet sprite se setea desde GameUI con setPetSprite()

    // Ingredient sprites (cargar todos los 40 ingredientes)
    const ingredientFiles = [
      'pizza', 'basketball', 'croissant', 'hotdog',
      'icecream', 'coffee', 'cupcake', 'pretzel',
      'banana', 'apple', 'grapes', 'watermelon',
      'cookie', 'popcorn', 'fries', 'strawberry',
      'onigiri', 'popsicle', 'pancakes', 'muffin',
      'donut', 'icecream_bar', 'chicken', 'lollipop',
      'donut2', 'cinnamon_roll', 'cupcake2', 'chocolate',
      'AnxiousBasic', 'AnxiousMedium', 'AnxiousPremium',
      'EdgyBasic', 'EdgyMedium', 'EdgyPremium',
      'GeekBasic', 'GeekMedium', 'GeekPremium',
      'IntelectualBasic', 'IntelectualMedium', 'IntelectualPremium',
      'SassyBasic'
    ];

    for (const ingredientId of ingredientFiles) {
      const sprite = new Image();
      // Detectar extensión (.jpg o .png)
      const extension = ingredientId.includes('Basic') || ingredientId.includes('Medium') || ingredientId.includes('Premium') ? 'jpg' : 'png';
      sprite.src = `/assets/ingredients/${ingredientId}.${extension}`;
      this.ingredientSprites.set(ingredientId, sprite);
    }
  }

  setPetSprite(sprite: HTMLImageElement | null): void {
    this.petSprite = sprite;
  }

  private triggerScreenshake(): void {
    this.shakeIntensity = this.SHAKE_INTENSITY;
    this.shakeDuration = this.SHAKE_DURATION;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

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
    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    const state = this.game.getState();

    // Log de posición de click
    const screenName = state.cameraState === -1 ? 'IZQUIERDA' : (state.cameraState === 0 ? 'CENTRO' : 'DERECHA');
    console.log(`[🍳 CLICK] Pantalla: ${screenName}, Posición: x=${x.toFixed(3)}, y=${y.toFixed(3)}`);

    if (state.state === 'waiting') {
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
      e.stopPropagation();

      // Guardar posición inicial para swipe detection
      this.swipeStartX = coords.x;
      this.swipeStartY = coords.y;
      this.isSwiping = true;

      // Check if clicking on ingredient spot, basket, or pet
      this.handleDragStart(x, y);
    } else if (state.state === 'finished') {
      e.stopPropagation();

      // Click en botón "Ver Recompensas"
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
    const coords = InputHelper.getCanvasCoordinatesFromMouse(e, this.canvas);
    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    if (this.draggingIngredient) {
      // Actualizar posición del ingrediente draggeado
      this.draggingIngredient.x = x;
      this.draggingIngredient.y = y;
    } else if (this.isSwiping) {
      // Detectar swipe horizontal
      const dx = coords.x - this.swipeStartX;
      const dy = coords.y - this.swipeStartY;

      if (Math.abs(dx) > this.SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        // Swipe horizontal detectado
        if (dx > 0) {
          this.game.swipeRight(); // Swipe derecha → ir a la izquierda
        } else {
          this.game.swipeLeft(); // Swipe izquierda → ir a la derecha
        }

        // Actualizar target camera
        this.targetCameraOffsetX = this.game.getCameraOffsetX();

        // Reset swipe
        this.isSwiping = false;
      }
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    const coords = InputHelper.getCanvasCoordinatesFromMouse(e, this.canvas);
    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    this.handleDragEnd(x, y);
    this.isSwiping = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const coords = InputHelper.getCanvasCoordinatesFromTouchEvent(e, this.canvas);
    if (!coords) return;

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
      this.swipeStartX = coords.x;
      this.swipeStartY = coords.y;
      this.isSwiping = true;

      this.handleDragStart(x, y);
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
    const coords = InputHelper.getCanvasCoordinatesFromTouchEvent(e, this.canvas);
    if (!coords) return;

    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    if (this.draggingIngredient) {
      this.draggingIngredient.x = x;
      this.draggingIngredient.y = y;
    } else if (this.isSwiping) {
      const dx = coords.x - this.swipeStartX;
      const dy = coords.y - this.swipeStartY;

      if (Math.abs(dx) > this.SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          this.game.swipeRight();
        } else {
          this.game.swipeLeft();
        }

        this.targetCameraOffsetX = this.game.getCameraOffsetX();
        this.isSwiping = false;
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const coords = InputHelper.getCanvasCoordinatesFromChangedTouch(e, this.canvas);
    if (!coords) return;

    const x = coords.x / this.canvas.width;
    const y = coords.y / this.canvas.height;

    this.handleDragEnd(x, y);
    this.isSwiping = false;
  }

  private handleDragStart(x: number, y: number): void {
    const state = this.game.getState();

    // Check if clicking on ingredient spot (ahora en coordenadas de pantalla)
    // Solo revisar los ingredientes de la pantalla actual
    let startIndex = 0;
    let endIndex = 9;

    if (state.cameraState === -1) {
      startIndex = 9;
      endIndex = 21;
    } else if (state.cameraState === 1) {
      startIndex = 21;
      endIndex = 30;
    }

    // Buscar el ingrediente MÁS CERCANO al click
    let closestIndex = -1;
    let closestDistance = Infinity;

    for (let i = startIndex; i < endIndex && i < state.ingredientSpots.length; i++) {
      const spot = state.ingredientSpots[i];

      // Las coordenadas ya están en formato normalizado de pantalla (0-1)
      const spotScreenX = spot.x;
      const spotScreenY = spot.y;

      const distance = Math.sqrt(
        Math.pow(x - spotScreenX, 2) +
        Math.pow(y - spotScreenY, 2)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    // Si encontramos un ingrediente cercano (dentro de un radio razonable)
    if (closestIndex !== -1 && closestDistance < 0.08) { // Radio máximo: 8% del canvas
      const spot = state.ingredientSpots[closestIndex];
      // Empezar a draggear ingrediente desde spot
      this.draggingIngredient = this.game.startDraggingFromSpot(spot.ingredientId, x, y);
      this.dragOffsetX = 0;
      this.dragOffsetY = 0;
      return;
    }

    // Check if clicking on basket ingredient
    const basketY = 0.85; // Cesta está abajo
    const basketStartX = 0.35;
    const basketEndX = 0.65;

    if (y >= basketY - 0.1 && y <= basketY + 0.1) {
      // Click en área de la cesta - buscar ingrediente MÁS CERCANO
      const ingredientsPerRow = Math.min(state.basket.length, 3);
      const spacing = (basketEndX - basketStartX) / (ingredientsPerRow + 1);

      let closestBasketIndex = -1;
      let closestBasketDistance = Infinity;

      for (let i = 0; i < state.basket.length; i++) {
        const ingredient = state.basket[i];
        const ingredientX = basketStartX + (i % ingredientsPerRow + 1) * spacing;
        const ingredientY = basketY;

        const distance = Math.sqrt(
          Math.pow(x - ingredientX, 2) +
          Math.pow(y - ingredientY, 2)
        );

        if (distance < closestBasketDistance) {
          closestBasketDistance = distance;
          closestBasketIndex = i;
        }
      }

      if (closestBasketIndex !== -1 && closestBasketDistance < 0.06) { // Radio máximo: 6% del canvas
        const ingredientsPerRow = Math.min(state.basket.length, 3);
        const spacing = (basketEndX - basketStartX) / (ingredientsPerRow + 1);
        const ingredientX = basketStartX + (closestBasketIndex % ingredientsPerRow + 1) * spacing;
        const ingredientY = basketY;

        // Empezar a draggear desde la cesta
        this.draggingIngredient = this.game.removeIngredientFromBasket(closestBasketIndex);
        this.draggingFromBasketIndex = closestBasketIndex;
        this.dragOffsetX = x - ingredientX;
        this.dragOffsetY = y - ingredientY;
        return;
      }
    }
  }

  private handleDragEnd(x: number, y: number): void {
    if (!this.draggingIngredient) return;

    const state = this.game.getState();

    // Check si soltar en la cesta (la cesta siempre está visible)
    const basketY = 0.85;
    const basketStartX = 0.35;
    const basketEndX = 0.65;

    if (y >= basketY - 0.15 && y <= basketY + 0.15 &&
        x >= basketStartX && x <= basketEndX) {
      // Soltar en la cesta
      this.game.dropIngredientInBasket(this.draggingIngredient);
      this.draggingIngredient = null;
      this.draggingFromBasketIndex = -1;
      return;
    }

    // Check si soltar en la mascota (solo en pantalla central)
    const petX = 0.70; // 70% a la derecha
    const petY = 0.70; // 70% abajo

    if (state.cameraState === 0 && // Solo en pantalla central
        Math.abs(x - petX) < 0.25 && Math.abs(y - petY) < 0.25) {
      // Entregar a la mascota
      this.game.deliverIngredientToPet(this.draggingIngredient.ingredientId);
      this.draggingIngredient = null;
      this.draggingFromBasketIndex = -1;
      return;
    }

    // Soltar fuera de cualquier área válida → Desaparece el ingrediente
    this.draggingIngredient = null;
    this.draggingFromBasketIndex = -1;
  }

  private handleGameEnd(state: CookingGameState): void {
    if (this.hasCalledOnGameEnd) return;

    const success = state.score >= 100;
    this.hasCalledOnGameEnd = true;

    if (this.onGameEnd) {
      this.onGameEnd(success);
    }
  }

  update(deltaTime: number): void {
    const previousState = this.game.getState();
    const previousFeedback = previousState.feedbackText;

    this.game.update(deltaTime);

    const newState = this.game.getState();

    // Detectar si apareció "PUAGH!" para activar screenshake
    if (newState.feedbackText === 'PUAGH!' && previousFeedback !== 'PUAGH!') {
      this.triggerScreenshake();
    }

    // Update screenshake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= deltaTime * 1000; // convertir a ms
      const progress = this.shakeDuration / this.SHAKE_DURATION;
      this.shakeIntensity = this.SHAKE_INTENSITY * progress;

      // Random offset
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;

      if (this.shakeDuration <= 0) {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeIntensity = 0;
      }
    }

    // Smooth camera transition
    const diff = this.targetCameraOffsetX - this.cameraOffsetX;
    this.cameraOffsetX += diff * this.CAMERA_LERP;

    // Snap cuando está muy cerca
    if (Math.abs(diff) < 0.5) {
      this.cameraOffsetX = this.targetCameraOffsetX;
    }
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
    this.ctx.fillText('Cocina con tu Pet', this.canvas.width / 2, 100);

    // Instrucciones
    this.ctx.font = '20px Arial';
    this.ctx.fillText('Arrastra ingredientes a la cesta', this.canvas.width / 2, 180);
    this.ctx.fillText('Entrega lo que te pida tu mascota', this.canvas.width / 2, 220);
    this.ctx.fillText('Swipe izq/der para moverte por la cocina', this.canvas.width / 2, 260);

    // Tier indicator
    const tierNames = ['Nivel 1', 'Nivel 2', 'Nivel 3'];
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

  private renderPlayingScreen(state: CookingGameState): void {
    this.ctx.save();

    // Aplicar screenshake
    if (this.shakeDuration > 0) {
      this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }

    // Fondo blanco
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render pet PRIMERO (solo en pantalla central, DETRÁS de la cocina)
    if (state.cameraState === 0) {
      this.renderPet();
    }

    // Render kitchen background (UI fija, según cameraState) - ENCIMA del pet
    this.renderKitchen(state.cameraState);

    // Render ingredient spots (UI fija, según cameraState)
    this.renderIngredientSpots(state);

    // Render current request (speech bubble con ingredientes pedidos, UI fija)
    if (state.cameraState === 0) {
      this.renderRequest(state);
    }

    // Render basket (siempre visible, viaja con la cámara - UI fija)
    this.renderBasket(state);

    // Render dragging ingredient (UI fija)
    if (this.draggingIngredient) {
      this.renderDraggingIngredient(this.draggingIngredient);
    }

    // Render progress bar (UI fija)
    this.renderProgressBar(state);

    // Render feedback text (YUMMY! o PUAGH!)
    if (state.feedbackText && state.feedbackTimer > 0) {
      this.renderFeedbackText(state.feedbackText, state.feedbackTimer);
    }

    this.ctx.restore();
  }

  private renderKitchen(cameraState: -1 | 0 | 1): void {
    if (this.kitchenSprite && this.kitchenSprite.complete && this.kitchenSprite.naturalWidth > 0) {
      // El sprite es 1434x619px y contiene 3 secciones horizontales (izquierda, centro, derecha)
      // Usamos cameraOffsetX (que se interpola suavemente) para calcular qué parte mostrar

      const spriteWidth = this.kitchenSprite.naturalWidth; // 1434px
      const spriteHeight = this.kitchenSprite.naturalHeight; // 619px

      // cameraOffsetX va de -480 (izquierda) a 0 (centro) a 480 (derecha)
      // Mapear a coordenadas del sprite: 0 a 1434px
      // Invertir porque cameraOffsetX negativo = pantalla izquierda = inicio del sprite
      const normalizedOffset = (-this.cameraOffsetX + 480) / 960; // 0 (izquierda) a 1 (derecha)
      const spriteX = normalizedOffset * (spriteWidth - spriteWidth / 3); // 0 a 956px

      const sectionWidth = spriteWidth / 3; // ~478px (porción visible)

      // Escalar a 75% del tamaño para que se vea más pequeña
      const targetHeight = this.canvas.height * 0.75; // 480px (más pequeña)
      const scaleFactor = targetHeight / spriteHeight; // ~0.775
      const targetWidth = sectionWidth * scaleFactor; // ~370px

      // Centrar horizontalmente y verticalmente
      const offsetX = (this.canvas.width - targetWidth) / 2;
      const offsetY = (this.canvas.height - targetHeight) / 2;

      // Dibujar la porción visible del sprite con scroll suave
      this.ctx.drawImage(
        this.kitchenSprite,
        spriteX,        // sx: posición calculada suavemente (0-956px)
        0,              // sy: 0 (desde arriba)
        sectionWidth,   // sWidth: ancho visible (~478px)
        spriteHeight,   // sHeight: altura completa (619px)
        offsetX,        // dx: posición X en canvas (centrado)
        offsetY,        // dy: posición Y en canvas (top)
        targetWidth,    // dWidth: ancho escalado (~494px)
        targetHeight    // dHeight: altura escalada (640px)
      );
    } else {
      // Fallback: fondo gris
      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private renderIngredientSpots(state: CookingGameState): void {
    // Determinar qué rango de ingredientes mostrar según cameraState
    // Central (0): índices 0-8 (9 ingredientes)
    // Izquierda (-1): índices 9-20 (12 ingredientes)
    // Derecha (1): índices 21-29 (9 ingredientes)
    let startIndex = 0;
    let endIndex = 9;

    if (state.cameraState === -1) {
      // Pantalla izquierda
      startIndex = 9;
      endIndex = 21;
    } else if (state.cameraState === 1) {
      // Pantalla derecha
      startIndex = 21;
      endIndex = 30;
    }

    for (let i = startIndex; i < endIndex && i < state.ingredientSpots.length; i++) {
      const spot = state.ingredientSpots[i];

      // Las coordenadas están en formato normalizado de pantalla (0-1)
      // Convertir directamente a píxeles
      const screenX = spot.x * this.canvas.width;
      const screenY = spot.y * this.canvas.height;

      // Renderizar sprite del ingrediente
      const sprite = this.getIngredientSprite(spot.ingredientId);
      this.drawIngredientSprite(sprite, screenX, screenY, 48);
    }
  }

  private renderPet(): void {
    // Pet está abajo a la derecha (sobre el rectángulo negro debajo de la mesa)
    const petX = this.canvas.width * 0.70; // 70% a la derecha
    const petY = this.canvas.height * 0.70; // 70% abajo

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

  private renderRequest(state: CookingGameState): void {
    // Speech bubble abajo a la izquierda (cerca de la mascota pero sin tapar ingredientes)
    const bubbleX = this.canvas.width * 0.30; // 30% a la izquierda
    const bubbleY = this.canvas.height * 0.60; // 60% abajo
    const bubbleW = 250;
    const bubbleH = 90;

    // Fondo de burbuja
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.roundRect(bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 20);
    this.ctx.fill();
    this.ctx.stroke();

    // Ingredientes pedidos
    const iconSize = 40;
    const spacing = bubbleW / (state.currentRequest.length + 1);

    for (let i = 0; i < state.currentRequest.length; i++) {
      const req = state.currentRequest[i];
      const iconX = bubbleX - bubbleW / 2 + (i + 1) * spacing;
      const iconY = bubbleY;

      // Si ya fue entregado, dibujar check verde
      if (req.delivered) {
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.font = `${iconSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('✓', iconX, iconY);
      } else {
        // Sprite del ingrediente
        const sprite = this.getIngredientSprite(req.ingredientId);
        this.drawIngredientSprite(sprite, iconX, iconY, iconSize);
      }
    }
  }

  private renderBasket(state: CookingGameState): void {
    const basketX = this.canvas.width / 2;
    const basketY = this.canvas.height * 0.85;

    // Dibujar cesta
    if (this.basketSprite && this.basketSprite.complete && this.basketSprite.naturalWidth > 0) {
      // Respetar aspect ratio del sprite
      const spriteAspectRatio = this.basketSprite.naturalWidth / this.basketSprite.naturalHeight;
      const maxWidth = 150;

      let basketW = maxWidth;
      let basketH = basketW / spriteAspectRatio;

      this.ctx.drawImage(
        this.basketSprite,
        basketX - basketW / 2,
        basketY - basketH / 2,
        basketW,
        basketH
      );
    } else {
      // Fallback: rectángulo
      const basketW = 150;
      const basketH = 80;
      this.ctx.fillStyle = '#8B4513';
      this.ctx.fillRect(basketX - basketW / 2, basketY - basketH / 2, basketW, basketH);
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(basketX - basketW / 2, basketY - basketH / 2, basketW, basketH);
    }

    // Renderizar ingredientes en la cesta
    const ingredientsPerRow = Math.min(state.basket.length, 3);
    const spacing = 50;

    for (let i = 0; i < state.basket.length; i++) {
      const ingredient = state.basket[i];
      const offsetX = (i % ingredientsPerRow - (ingredientsPerRow - 1) / 2) * spacing;
      const offsetY = Math.floor(i / ingredientsPerRow) * -40 - 20;

      const sprite = this.getIngredientSprite(ingredient.ingredientId);
      this.drawIngredientSprite(sprite, basketX + offsetX, basketY + offsetY, 32);
    }
  }

  private renderDraggingIngredient(dragged: DraggedIngredient): void {
    const x = dragged.x * this.canvas.width;
    const y = dragged.y * this.canvas.height;

    // Dibujar con sombra
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 5;
    this.ctx.shadowOffsetY = 5;

    const sprite = this.getIngredientSprite(dragged.ingredientId);
    this.drawIngredientSprite(sprite, x, y, 48);

    this.ctx.restore();
  }

  private renderProgressBar(state: CookingGameState): void {
    const barX = 50;
    const barY = 30;
    const barW = this.canvas.width - 100;
    const barH = 30;

    // Background
    this.ctx.fillStyle = '#ddd';
    this.ctx.fillRect(barX, barY, barW, barH);

    // Progress (verde si > 50%, rojo si < 50%)
    const progress = state.score / 100;
    this.ctx.fillStyle = state.score > 50 ? '#4CAF50' : '#FF5722';
    this.ctx.fillRect(barX, barY, barW * progress, barH);

    // Border
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(barX, barY, barW, barH);

    // Text
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${Math.round(state.score)}%`, this.canvas.width / 2, barY + 20);
  }

  private renderFeedbackText(text: string, timerMs: number): void {
    const progress = timerMs / 1000; // 0-1 (1 segundo total)

    // Color según tipo
    const color = text === 'YUMMY!' ? '#00aa00' : '#aa0000';

    // Escala aumenta en el inicio y luego disminuye
    const scale = 1.0 + Math.sin(progress * Math.PI) * 0.3; // 1.0 -> 1.3 -> 1.0

    // Fade out al final
    const alpha = Math.min(1.0, progress * 2); // fade in rápido, fade out lento

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${Math.round(80 * scale)}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Sombra para contraste
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.shadowBlur = 10;

    this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.restore();
  }

  private renderFinishedScreen(state: CookingGameState): void {
    this.ctx.save();

    // Fondo blanco
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const success = state.score >= 100;
    const centerX = this.canvas.width / 2;

    if (success) {
      // Victoria
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('¡COCINADO!', centerX, 120);

      this.ctx.font = '100px Arial';
      this.ctx.fillText('🍱', centerX, 250);

      this.ctx.font = 'bold 28px Arial';
      this.ctx.fillText('¡Delicioso!', centerX, 340);

      // Estrellas de hambre
      const stars = this.tier;
      this.ctx.font = 'bold 24px Arial';
      this.ctx.fillText('Hambre recuperada:', centerX, 400);
      this.ctx.font = '32px Arial';
      this.ctx.fillText('⭐'.repeat(stars), centerX, 440);
    } else {
      // Derrota
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 40px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('La receta se echó', centerX, 100);
      this.ctx.fillText('a perder', centerX, 150);

      this.ctx.font = '100px Arial';
      this.ctx.fillText('💨', centerX, 280);

      this.ctx.font = 'bold 24px Arial';
      this.ctx.fillText('La comida se perdió...', centerX, 370);
    }

    // Botón "Ver Recompensas" / "Continuar"
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
    this.ctx.fillText(success ? 'Ver Recompensas' : 'Continuar', buttonX + buttonW / 2, buttonY + buttonH / 2);

    this.ctx.restore();
  }

  private getIngredientSprite(ingredientId: string): HTMLImageElement | null {
    // ingredientId es la key completa (ej: "anxious_t1")
    return this.ingredientSprites.get(ingredientId) || null;
  }

  private drawIngredientSprite(sprite: HTMLImageElement | null, x: number, y: number, size: number = 48): void {
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      // Mantener aspect ratio
      const aspectRatio = sprite.naturalWidth / sprite.naturalHeight;
      let w = size;
      let h = size;

      if (aspectRatio > 1) {
        h = w / aspectRatio;
      } else {
        w = h * aspectRatio;
      }

      this.ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
    } else {
      // Fallback: círculo gris
      this.ctx.fillStyle = '#999';
      this.ctx.beginPath();
      this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  reset(): void {
    this.game.reset();
    this.hasCalledOnGameEnd = false;
    this.draggingIngredient = null;
    this.draggingFromBasketIndex = -1;
    this.cameraOffsetX = 0;
    this.targetCameraOffsetX = 0;
  }

  destroy(): void {
    this.game.reset();
  }
}
