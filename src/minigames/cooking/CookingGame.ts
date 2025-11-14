// Cooking Minigame - Game Logic
export type CookingPhase = 'waiting' | 'playing' | 'finished';

export interface IngredientSpot {
  ingredientId: string; // ID del ingrediente (ej: "anxious_t1", "edgy_t2")
  x: number; // Posición X normalizada (0-1) en el mundo (1440px)
  y: number; // Posición Y normalizada (0-1)
}

export interface DraggedIngredient {
  ingredientId: string;
  x: number; // Posición actual normalizada
  y: number;
}

export interface RequestedIngredient {
  ingredientId: string;
  delivered: boolean; // Si ya fue entregado correctamente
}

export interface CookingGameState {
  state: CookingPhase;
  tier: number; // 1, 2, 3 (determina cuántos ingredientes pide)
  score: number; // Barra de progreso (0-100)

  // Ingredientes en los armarios (fuentes infinitas)
  ingredientSpots: IngredientSpot[];

  // Ingredientes en la cesta del jugador
  basket: DraggedIngredient[];

  // Petición actual
  currentRequest: RequestedIngredient[];

  // Camera position (0 = center, -1 = left, 1 = right)
  cameraState: -1 | 0 | 1;

  // Feedback visual
  feedbackText: string | null; // "YUMMY!" o "PUAGH!"
  feedbackTimer: number; // Tiempo restante del feedback (ms)
}

export class CookingGame {
  private state: CookingPhase = 'waiting';
  private tier: number = 1;
  private score: number = 50; // Empieza en 50% (punto medio)

  private ingredientSpots: IngredientSpot[] = [];
  private basket: DraggedIngredient[] = [];
  private currentRequest: RequestedIngredient[] = [];

  private cameraState: -1 | 0 | 1 = 0; // 0 = center, -1 = left, 1 = right

  // Feedback visual
  private feedbackText: string | null = null;
  private feedbackTimer: number = 0;
  private readonly FEEDBACK_DURATION = 1000; // 1 segundo

  // Balance
  private decayRate: number = 0.5; // Variable según tier (se setea en constructor)
  private correctReward: number = 35; // Variable según tier (se setea en constructor)
  private readonly INCORRECT_PENALTY = 25; // -25% por ingrediente incorrecto
  private readonly MAX_SCORE = 100;
  private readonly MIN_SCORE = 0;

  // Lista completa de ingredientes posibles (40 ingredientes)
  private readonly ALL_INGREDIENTS: string[] = [
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

  // Timing
  private lastUpdateTime: number = 0;

  constructor(tier: number = 1) {
    this.tier = Math.max(1, Math.min(3, tier));

    // Setear decay rate y reward según tier
    if (this.tier === 1) {
      this.decayRate = 0.30; // -0.30% por segundo
      this.correctReward = 35; // +35% por pedido completo
    } else if (this.tier === 2) {
      this.decayRate = 0.60; // -0.60% por segundo
      this.correctReward = 30; // +30% por pedido completo
    } else {
      this.decayRate = 1.0; // -1% por segundo
      this.correctReward = 25; // +25% por pedido completo
    }
  }

  start(): void {
    this.state = 'playing';
    this.score = 50; // Empezar en el medio
    this.basket = [];
    this.cameraState = 0;
    this.lastUpdateTime = Date.now();

    // Generar posiciones aleatorias de ingredientes en los armarios
    this.generateIngredientSpots();

    // Generar primera petición
    this.generateNewRequest();

    console.log('[🍳 COOKING START] Game started, tier:', this.tier);
  }

  private generateIngredientSpots(): void {
    // Distribución FIJA de 30 ingredientes por categorías
    // Coordenadas normalizadas del mundo (0-1 representa 1440px de ancho)

    this.ingredientSpots = [];

    // Distribución fija de ingredientes (30 total)
    // ORDEN: Centro (9) → Izquierda (12) → Derecha (9) = 30 total
    const fixedIngredients = [
      // ============ PANTALLA CENTRAL (9) ============
      // Frutas arriba + Comida Preparada horizontal
      'apple', 'banana', 'GeekPremium',  // Baldas superiores (3) - Taco en x=0.423, y=0.202
      'grapes', 'strawberry', 'hotdog', 'EdgyBasic', 'pizza', 'watermelon', // Balda horizontal (6) - Pizza y fresa intercambiadas

      // ============ PANTALLA IZQUIERDA (12) ============
      // Proteínas y Carnes
      'AnxiousBasic', 'AnxiousMedium', 'AnxiousPremium', // Balda 1 (3) - AnxiousBasic en x=0.250
      'EdgyMedium', 'EdgyPremium', 'GeekMedium', 'IntelectualPremium', // Balda 2 (4)
      'chicken', 'basketball', 'IntelectualMedium', 'SassyBasic', // Balda 3 (4)
      'GeekBasic', // Balda 4 (1)

      // ============ PANTALLA DERECHA (9) ============
      // Dulces y Postres
      'croissant', 'donut', 'cupcake', 'muffin', // Balda 1 (4)
      'pancakes', 'cookie', 'icecream', 'chocolate', // Balda 2 (4)
      'pretzel' // Balda 3 (1)
    ];

    let index = 0;

    // ============ PANTALLA CENTRAL ============
    // Fila superior (y=0.199-0.205-0.202) - 3 posiciones - FRUTAS + TACO
    this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x: 0.148, y: 0.199 }); // Apple
    this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x: 0.260, y: 0.205 }); // Banana
    this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x: 0.423, y: 0.202 }); // Taco

    // Fila media horizontal (6 posiciones, y=0.26) - COMIDA RÁPIDA + FRUTAS - Subida medio sprite aprox
    const centerTopY = 0.26;
    const centerTopX = [0.160, 0.240, 0.404, 0.494, 0.579, 0.719]; // 6 posiciones (quitamos 0.819)
    for (const x of centerTopX) {
      this.ingredientSpots.push({
        ingredientId: fixedIngredients[index++],
        x, y: centerTopY
      });
    }

    // Total pantalla central: 9 ingredientes (3 + 6)

    // ============ PANTALLA IZQUIERDA ============
    // Fila superior (y=0.318) - 3 posiciones - PROTEÍNAS BÁSICAS
    const leftRow1Y = 0.318;
    const leftRow1X = [0.250, 0.373, 0.477]; // AnxiousBasic en x=0.250
    for (const x of leftRow1X) {
      this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x, y: leftRow1Y });
    }

    // Fila media-alta (y=0.404) - 4 posiciones - CARNES PREMIUM
    const leftRow2Y = 0.404;
    const leftRow2X = [0.250, 0.385, 0.492, 0.608];
    for (const x of leftRow2X) {
      this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x, y: leftRow2Y });
    }

    // Fila media-baja (y=0.630) - 4 posiciones - MÁS PROTEÍNAS
    const leftRow3Y = 0.630;
    const leftRow3X = [0.256, 0.371, 0.481, 0.610];
    for (const x of leftRow3X) {
      this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x, y: leftRow3Y });
    }

    // Fila inferior (y=0.798) - 1 posición
    this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x: 0.250, y: 0.798 });

    // Total pantalla izquierda: 12 ingredientes (3 + 4 + 4 + 1)

    // ============ PANTALLA DERECHA ============
    // Fila media-alta (y=0.420) - 4 posiciones - BOLLERÍA
    const rightRow1Y = 0.420;
    const rightRow1X = [0.398, 0.519, 0.627, 0.765];
    for (const x of rightRow1X) {
      this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x, y: rightRow1Y });
    }

    // Fila media-baja (y=0.638) - 4 posiciones - POSTRES
    const rightRow2Y = 0.638;
    const rightRow2X = [0.404, 0.508, 0.610, 0.758];
    for (const x of rightRow2X) {
      this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x, y: rightRow2Y });
    }

    // Fila inferior (y=0.798) - 1 posición
    this.ingredientSpots.push({ ingredientId: fixedIngredients[index++], x: 0.731, y: 0.798 });

    // Total pantalla derecha: 9 ingredientes

    console.log('[🍳 SPOTS] Generated', this.ingredientSpots.length, 'FIXED ingredient spots:', this.ingredientSpots.map(s => s.ingredientId));
  }

  private generateNewRequest(): void {
    // Generar petición aleatoria de 2 o 3 ingredientes (sin importar tier)
    const count = Math.random() < 0.5 ? 2 : 3;

    // Seleccionar ingredientes aleatorios de los disponibles en los armarios
    const availableIds = this.ingredientSpots.map(spot => spot.ingredientId);
    const shuffled = [...availableIds].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    this.currentRequest = selected.map(id => ({
      ingredientId: id,
      delivered: false
    }));

    console.log('[🍳 REQUEST] New request (', count, 'ingredients):', this.currentRequest.map(r => r.ingredientId));
  }

  update(deltaTime: number): void {
    if (this.state !== 'playing') return;

    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000; // segundos
    this.lastUpdateTime = now;

    // Update feedback timer
    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt * 1000; // convertir a ms
      if (this.feedbackTimer <= 0) {
        this.feedbackText = null;
        this.feedbackTimer = 0;
      }
    }

    // Decaimiento constante de la barra (según tier)
    this.score -= this.decayRate * dt;
    this.score = Math.max(this.MIN_SCORE, this.score);

    // Check lose condition
    if (this.score <= this.MIN_SCORE) {
      this.state = 'finished';
      console.log('[🍳 GAME OVER] Score reached 0');
      return;
    }

    // Check win condition
    if (this.score >= this.MAX_SCORE) {
      this.state = 'finished';
      console.log('[🍳 VICTORY] Score reached 100');
      return;
    }
  }

  // Drag ingrediente desde armario
  startDraggingFromSpot(ingredientId: string, x: number, y: number): DraggedIngredient | null {
    // Crear nuevo ingrediente draggeado (infinito, no se consume el spot)
    const dragged: DraggedIngredient = {
      ingredientId,
      x,
      y
    };

    console.log('[🍳 DRAG START] Dragging ingredient:', ingredientId);
    return dragged;
  }

  // Soltar ingrediente en la cesta
  dropIngredientInBasket(dragged: DraggedIngredient): void {
    this.basket.push(dragged);
    console.log('[🍳 BASKET] Added to basket:', dragged.ingredientId, 'Total:', this.basket.length);
  }

  // Remover ingrediente de la cesta (drag out)
  removeIngredientFromBasket(index: number): DraggedIngredient | null {
    if (index < 0 || index >= this.basket.length) return null;

    const removed = this.basket.splice(index, 1)[0];
    console.log('[🍳 BASKET] Removed from basket:', removed.ingredientId, 'Remaining:', this.basket.length);
    return removed;
  }

  // Entregar ingrediente a la mascota
  deliverIngredientToPet(ingredientId: string): boolean {
    // Verificar si el ingrediente está en la petición actual
    const requestIndex = this.currentRequest.findIndex(
      req => req.ingredientId === ingredientId && !req.delivered
    );

    if (requestIndex === -1) {
      // Ingrediente incorrecto
      console.log('[🍳 DELIVER] INCORRECT ingredient:', ingredientId);
      this.score -= this.INCORRECT_PENALTY;
      this.score = Math.max(this.MIN_SCORE, this.score);

      // Mostrar feedback "PUAGH!"
      this.feedbackText = 'PUAGH!';
      this.feedbackTimer = this.FEEDBACK_DURATION;

      // Verificar condición de derrota inmediatamente
      if (this.score <= this.MIN_SCORE) {
        this.state = 'finished';
        console.log('[🍳 GAME OVER] Score reached 0 after incorrect delivery!');
        return false;
      }

      // Generar nueva petición (fallo)
      this.generateNewRequest();
      return false;
    }

    // Ingrediente correcto
    console.log('[🍳 DELIVER] CORRECT ingredient:', ingredientId);
    this.currentRequest[requestIndex].delivered = true;

    // Remover ingrediente de la cesta
    const basketIndex = this.basket.findIndex(item => item.ingredientId === ingredientId);
    if (basketIndex !== -1) {
      this.basket.splice(basketIndex, 1);
    }

    // Verificar si se completó la petición completa
    const allDelivered = this.currentRequest.every(req => req.delivered);
    if (allDelivered) {
      console.log('[🍳 REQUEST COMPLETE] All ingredients delivered! +', this.correctReward, '%');

      // Mostrar feedback "YUMMY!"
      this.feedbackText = 'YUMMY!';
      this.feedbackTimer = this.FEEDBACK_DURATION;

      // Solo ahora sumamos la recompensa (al completar el pedido completo)
      this.score += this.correctReward;
      this.score = Math.min(this.MAX_SCORE, this.score);

      // Verificar condición de victoria inmediatamente
      if (this.score >= this.MAX_SCORE) {
        this.state = 'finished';
        console.log('[🍳 VICTORY] Score reached 100 after completing order!');
        return true;
      }

      // Generar nueva petición
      this.generateNewRequest();
    }

    return true;
  }

  // Cambiar estado de cámara (swipe)
  swipeLeft(): void {
    if (this.cameraState < 1) {
      this.cameraState = (this.cameraState + 1) as -1 | 0 | 1;
      console.log('[🍳 CAMERA] Swipe left -> state:', this.cameraState);
    }
  }

  swipeRight(): void {
    if (this.cameraState > -1) {
      this.cameraState = (this.cameraState - 1) as -1 | 0 | 1;
      console.log('[🍳 CAMERA] Swipe right -> state:', this.cameraState);
    }
  }

  getCameraOffsetX(): number {
    // Offset X en píxeles (480px por pantalla)
    // cameraState -1 = left (offset -480), 0 = center (offset 0), 1 = right (offset +480)
    return -this.cameraState * 480;
  }

  getState(): CookingGameState {
    return {
      state: this.state,
      tier: this.tier,
      score: this.score,
      ingredientSpots: this.ingredientSpots,
      basket: this.basket,
      currentRequest: this.currentRequest,
      cameraState: this.cameraState,
      feedbackText: this.feedbackText,
      feedbackTimer: this.feedbackTimer
    };
  }

  reset(): void {
    this.state = 'waiting';
    this.score = 50;
    this.basket = [];
    this.currentRequest = [];
    this.cameraState = 0;
    this.ingredientSpots = [];
  }
}
