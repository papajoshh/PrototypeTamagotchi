import { Ingredient } from '../../core/Ingredient';

interface FloatingReward {
  ingredient: Ingredient;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export class TheButtonRewards {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rewards: FloatingReward[] = [];
  private ingredientCache: Map<string, HTMLImageElement>;
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;

  onComplete?: () => void;

  constructor(canvas: HTMLCanvasElement, ingredientCache: Map<string, HTMLImageElement>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ingredientCache = ingredientCache;
  }

  async show(tier1: number, tier2: number, tier3: number, personality: string): Promise<void> {
    this.rewards = [];
    this.isAnimating = true;
    this.animationStartTime = Date.now();

    // Crear lista de ingredientes a mostrar
    const ingredients: Ingredient[] = [];

    // Tier 1
    for (let i = 0; i < tier1; i++) {
      ingredients.push(this.createIngredient(personality, 1));
    }

    // Tier 2
    for (let i = 0; i < tier2; i++) {
      ingredients.push(this.createIngredient(personality, 2));
    }

    // Tier 3
    for (let i = 0; i < tier3; i++) {
      ingredients.push(this.createIngredient(personality, 3));
    }

    // Añadir ingredientes uno por uno con delay
    for (let i = 0; i < ingredients.length; i++) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          this.addFloatingReward(ingredients[i]);
          resolve();
        }, i * 400); // 400ms entre cada ingrediente
      });
    }

    // Esperar a que termine la última animación
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        this.isAnimating = false;
        if (this.onComplete) {
          this.onComplete();
        }
        resolve();
      }, 2000); // 2 segundos adicionales para que se vea la última recompensa
    });
  }

  private createIngredient(personality: string, tier: number): Ingredient {
    const personalityLower = personality.toLowerCase();

    switch (personalityLower) {
      case 'anxious':
        return Ingredient.createAnxious(tier);
      case 'edgy':
        return Ingredient.createEdgy(tier);
      case 'geek':
        return Ingredient.createGeek(tier);
      case 'sassy':
        return Ingredient.createSassy(tier);
      case 'intelectual':
        return Ingredient.createIntelectual(tier);
      default:
        return Ingredient.createAnxious(tier);
    }
  }

  private addFloatingReward(ingredient: Ingredient): void {
    const centerX = this.canvas.width / 2;
    const centerY = 250;

    this.rewards.push({
      ingredient,
      x: centerX,
      y: centerY,
      startTime: Date.now(),
      duration: 1500 // 1.5 segundos de animación
    });
  }

  render(): void {
    if (!this.isAnimating && this.rewards.length === 0) return;

    this.ctx.save();

    const now = Date.now();
    const activeRewards = this.rewards.filter(r => now - r.startTime < r.duration);

    activeRewards.forEach((reward) => {
      const elapsed = now - reward.startTime;
      const progress = elapsed / reward.duration;

      // Animación: aparece desde el centro y sube
      const alpha = progress < 0.2 ? progress / 0.2 : (progress > 0.8 ? (1 - progress) / 0.2 : 1);
      const offsetY = -progress * 100; // Sube 100px

      // Escala que hace "pop"
      let scale = 1;
      if (progress < 0.2) {
        scale = 0.5 + (progress / 0.2) * 0.7; // 0.5 -> 1.2
      } else if (progress < 0.3) {
        scale = 1.2 - ((progress - 0.2) / 0.1) * 0.2; // 1.2 -> 1.0
      }

      this.ctx.globalAlpha = alpha;
      this.ctx.save();
      this.ctx.translate(reward.x, reward.y + offsetY);
      this.ctx.scale(scale, scale);

      // Dibujar el ingrediente
      const ingredientKey = `${reward.ingredient.personality.toLowerCase()}_${reward.ingredient.tier}`;
      const ingredientImg = this.ingredientCache.get(ingredientKey);

      const size = 60;

      if (ingredientImg && ingredientImg.complete) {
        this.ctx.drawImage(ingredientImg, -size / 2, -size / 2, size, size);
      } else {
        // Fallback
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(-size / 2, -size / 2, size, size);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-size / 2, -size / 2, size, size);
      }

      // Texto con tier estrellas
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillText('⭐'.repeat(reward.ingredient.tier), 0, size / 2 + 10);

      this.ctx.restore();
      this.ctx.globalAlpha = 1;
    });

    // Limpiar recompensas viejas
    this.rewards = this.rewards.filter(r => now - r.startTime < r.duration + 500);

    this.ctx.restore();
  }

  reset(): void {
    this.rewards = [];
    this.isAnimating = false;
  }
}
