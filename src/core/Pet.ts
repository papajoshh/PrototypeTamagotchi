import { Hunger } from './Hunger';
import { Boring } from './Boring';
import { Poop } from './Poop';
import { Illness } from './Illness';
import { Personality } from './Personality';
import { MemorySystem } from './MemorySystem';
import { IngredientInventory } from './IngredientInventory';
import { Ingredient } from './Ingredient';
import { LifeStage, GROWTH_THRESHOLDS } from './LifeStage';

export { LifeStage };

export class Pet {
  stage: LifeStage = LifeStage.Egg;
  growthPoints: number = 0;

  hunger: Hunger;
  boring: Boring;
  poop: Poop;
  illness: Illness;
  personality: Personality | null = null;
  memorySystem: MemorySystem;
  inventory: IngredientInventory;

  // Sistema de descuidado
  wasNeglected: boolean = false;

  // Decoración actual
  currentRoom: string = 'style1'; // Por defecto style1

  // Eventos
  onEvolve?: (newStage: LifeStage) => void;
  onDeath?: () => void;
  onGrow?: (progress: number) => void;

  constructor() {
    this.hunger = new Hunger(this.stage);
    this.boring = new Boring(this.stage);
    this.poop = new Poop();
    this.illness = new Illness();
    this.memorySystem = new MemorySystem();
    this.inventory = new IngredientInventory();
  }

  // Actualizar el pet (llamado cada frame)
  update(deltaTime: number) {
    if (this.stage === LifeStage.Egg || this.stage === LifeStage.Dead) return;

    // Actualizar necesidades
    this.hunger.update(deltaTime, this.stage);
    this.boring.update(deltaTime, this.stage);
    this.poop.update(deltaTime);
    this.illness.update(deltaTime);

    // Detectar descuido (llegar a 0 estrellas)
    if (this.hunger.getStars() === 0 || this.boring.getStars() === 0) {
      this.wasNeglected = true;
    }

    // Crecimiento automático con multiplicador
    const growthMultiplier = this.getGrowthMultiplier();
    this.growthPoints += deltaTime * growthMultiplier;

    // Notificar progreso de crecimiento
    const progress = this.getGrowthProgress();
    if (this.onGrow) {
      this.onGrow(progress);
    }

    // Verificar si debe evolucionar
    if (this.shouldEvolve()) {
      this.evolve();
    }

    // Verificar muerte
    this.checkDeath();
  }

  // Factor de crecimiento x0.5 si hambriento o aburrido (acumulativo)
  getGrowthMultiplier(): number {
    let multiplier = 1.0;

    // Mal cuidado = 0 estrellas (pero indicador visual en 1)
    if (this.hunger.isBadlyCared()) {
      multiplier *= 0.5;
    }

    if (this.boring.isBadlyCared()) {
      multiplier *= 0.5;
    }

    // Puede ser 1.0, 0.5 o 0.25 (si ambos)
    return multiplier;
  }

  // Progreso de crecimiento (0-1)
  getGrowthProgress(): number {
    if (this.stage >= LifeStage.ReadyToAscend) return 1;
    const threshold = GROWTH_THRESHOLDS[this.stage];
    if (threshold === 0) return 0;
    return Math.min(1, this.growthPoints / threshold);
  }

  shouldEvolve(): boolean {
    if (this.stage >= LifeStage.ReadyToAscend) return false;
    const threshold = GROWTH_THRESHOLDS[this.stage];
    return this.growthPoints >= threshold;
  }

  evolve() {
    if (this.stage >= LifeStage.ReadyToAscend) return;

    const oldStage = this.stage;

    // Avanzar etapa
    this.stage++;
    this.growthPoints = 0;

    // Verificar evolución a descuidado (solo Baby→Child)
    if (oldStage === LifeStage.Baby && this.wasNeglected) {
      this.personality = new Personality('descuidado');
      console.log(`[Pet] Evolved to ${LifeStage[this.stage]} as DESCUIDADO (neglected care)`);
    }
    // Si ya es descuidado, mantener la línea descuidado
    else if (this.personality && this.personality.name.includes('descuidado')) {
      const dominantMemory = this.memorySystem.selectDominantMemory();
      if (dominantMemory) {
        this.personality = new Personality(`descuidado+${dominantMemory}`);
      } else {
        this.personality = new Personality('descuidado');
      }
      console.log(`[Pet] Evolved to ${LifeStage[this.stage]} staying in DESCUIDADO line: ${this.personality.name}`);
    }
    // Evolución normal basado en recuerdos
    else {
      const dominantMemory = this.memorySystem.selectDominantMemory();
      if (dominantMemory) {
        this.personality = this.mixPersonalities(this.personality, dominantMemory, oldStage);
        console.log(`[Pet] Evolved to ${LifeStage[this.stage]} with personality ${this.personality.name}`);
      } else {
        console.log(`[Pet] Evolved to ${LifeStage[this.stage]} (no memories, keeping current personality)`);
      }
    }

    // Olvidar recuerdos al evolucionar
    this.memorySystem.forgetAll();

    // Reset flag de descuido
    this.wasNeglected = false;

    // Actualizar tiempos de necesidades según nueva etapa
    this.hunger.onStageChange(this.stage);
    this.boring.onStageChange(this.stage);

    if (this.onEvolve) {
      this.onEvolve(this.stage);
    }
  }

  mixPersonalities(current: Personality | null, dominantMemory: string, fromStage: LifeStage): Personality {
    // Lógica de mezcla según etapa
    switch (fromStage) {
      case LifeStage.Baby:
        // Bebé → Niño: Solo usa el recuerdo dominante
        return new Personality(dominantMemory);

      case LifeStage.Child:
        // Niño → Joven: Mezcla personalidad niño + recuerdo dominante
        if (current) {
          // Simplificado: Combinar nombres
          const mixedName = `${current.name}+${dominantMemory}`;
          return new Personality(mixedName);
        }
        return new Personality(dominantMemory);

      case LifeStage.Young:
        // Joven → Adulto: Arquetipo + recuerdo dominante
        // TODO: Implementar incompatibilidades (crisis adolescencia)
        if (current) {
          const mixedName = `${current.name}+${dominantMemory}`;
          return new Personality(mixedName);
        }
        return new Personality(dominantMemory);

      default:
        return current || new Personality('neutral');
    }
  }

  // Alimentar con ingrediente
  feedWithIngredient(ingredient: Ingredient): { success: boolean; reason?: string } {
    // No se puede alimentar a un huevo
    if (this.stage === LifeStage.Egg) {
      console.log('[Pet] Cannot feed an egg!');
      return { success: false, reason: 'is_egg' };
    }

    // Verificar si la mascota está llena (3 estrellas)
    if (this.hunger.isFullySatiated()) {
      console.log('[Pet] Already full, refusing food!');
      return { success: false, reason: 'full' };
    }

    // Consumir ingrediente del inventario (excepto neutral, que siempre está disponible)
    if (ingredient.personality !== 'neutral') {
      if (!this.inventory.consume(ingredient.identifier)) {
        console.log('[Pet] No ingredient available!');
        return { success: false, reason: 'no_ingredient' };
      }
    }

    // Verificar si necesita generar recuerdo ANTES de saciar
    const wasNotFullySatiated = !this.hunger.isFullySatiated();

    // Saciar según tier del ingrediente
    const satiationStars = ingredient.getSatiationStars();
    this.hunger.satiate(satiationStars);

    // Generar recuerdo si NO estaba completamente saciado antes Y no es neutral
    if (wasNotFullySatiated && ingredient.personality !== 'neutral') {
      this.memorySystem.addMemory('food', ingredient.personality);
    }

    // Programar poop según etapa actual
    this.poop.scheduleAfterFeeding(this.stage);

    console.log(`[Pet] Fed with ${ingredient.name} (${satiationStars} stars, ${ingredient.personality})`);
    return { success: true };
  }

  // Backward compatibility (para testing rápido)
  feed(satiationStars: number, personalityType: string) {
    // Verificar si necesita generar recuerdo ANTES de saciar
    const wasNotFullySatiated = !this.hunger.isFullySatiated();

    this.hunger.satiate(satiationStars);

    if (wasNotFullySatiated && personalityType !== 'neutral') {
      this.memorySystem.addMemory('food', personalityType);
    }
    this.poop.scheduleAfterFeeding(this.stage);
  }

  // Jugar minijuego (reduce aburrimiento y da ingrediente como recompensa)
  play(personalityType: string, scorePercentage: number = 0): Ingredient[] {
    // No se puede jugar con un huevo
    if (this.stage === LifeStage.Egg) {
      console.log('[Pet] Cannot play with an egg!');
      return [];
    }

    // Verificar si necesita generar recuerdo ANTES de entretener
    const wasNotFullyEntertained = !this.boring.isFullyEntertained();

    this.boring.entertain();

    // Generar recuerdo si NO estaba completamente entretenido antes Y no es neutral
    if (wasNotFullyEntertained && personalityType !== 'neutral') {
      this.memorySystem.addMemory('minigame', personalityType);
    }

    // Recompensas: basadas en el rendimiento del minijuego
    const rewards = this.generateIngredientRewards(personalityType, scorePercentage);
    rewards.forEach(reward => {
      this.inventory.add(reward, 1);
      console.log(`[Pet] Minigame reward: ${reward.name}`);
    });

    return rewards;
  }

  private generateIngredientRewards(personalityType: string, scorePercentage: number): Ingredient[] {
    const rewards: Ingredient[] = [];

    // Siempre obtienes Tier 1
    const tier1 = this.createIngredientByType(personalityType, 1);
    if (tier1) rewards.push(tier1);

    // Si score >= 30% y < 70%, obtienes Tier 2 extra
    if (scorePercentage >= 30 && scorePercentage < 70) {
      const tier2 = this.createIngredientByType(personalityType, 2);
      if (tier2) rewards.push(tier2);
    }

    // Si score >= 70%, obtienes Tier 3 extra (en lugar de Tier 2)
    if (scorePercentage >= 70) {
      const tier3 = this.createIngredientByType(personalityType, 3);
      if (tier3) rewards.push(tier3);
    }

    return rewards;
  }

  private createIngredientByType(personalityType: string, tier: number): Ingredient | null {
    switch (personalityType) {
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
        return null;
    }
  }

  // Limpiar caca
  cleanPoop() {
    this.poop.clean();
    this.illness.cancelIllness(); // Cancela enfermedad si estaba en timer
  }

  // Curar enfermedad
  cure() {
    this.illness.cure();
  }

  // Verificar condiciones de muerte y enfermedad
  checkDeath() {
    // Verificar si debe enfermarse
    if (this.poop.shouldTriggerIllness() && !this.illness.isCurrentlyIll()) {
      this.illness.getIll(this.stage);
      console.log('[Pet] Got ill from poop!');
    }

    // Muerte por hambre (20-25 horas)
    if (this.hunger.isDying()) {
      console.log('[Pet] Died from hunger!');
      this.die();
      return;
    }

    // Muerte por enfermedad (8 horas enferma)
    if (this.illness.isDying()) {
      console.log('[Pet] Died from illness!');
      this.die();
      return;
    }
  }

  die() {
    this.stage = LifeStage.Dead;
    if (this.onDeath) {
      this.onDeath();
    }
  }

  // Resucitar (con anuncio)
  revive() {
    if (this.stage === LifeStage.Dead) {
      this.stage = LifeStage.Baby; // Vuelve a la última etapa antes de morir
      this.illness.cure();
      this.hunger.reset();
      this.boring.reset();
      this.poop.reset(); // Limpiar cacas al resucitar
      // Actualizar timers según nueva etapa
      this.hunger.onStageChange(this.stage);
      this.boring.onStageChange(this.stage);
    }
  }

  // Tap en el huevo para nacer
  tapEgg() {
    if (this.stage === LifeStage.Egg) {
      this.stage = LifeStage.Baby;

      // Actualizar tiempos de necesidades según nueva etapa
      this.hunger.onStageChange(this.stage);
      this.boring.onStageChange(this.stage);

      // Baby nace con 1 estrella de hambre y 1 de diversión

      if (this.onEvolve) {
        this.onEvolve(this.stage);
      }
    }
  }

  // Serialización para guardar
  save(): string {
    return JSON.stringify({
      stage: this.stage,
      growthPoints: this.growthPoints,
      hunger: this.hunger.serialize(),
      boring: this.boring.serialize(),
      poop: this.poop.serialize(),
      illness: this.illness.serialize(),
      personality: this.personality?.name || null,
      memorySystem: this.memorySystem.serialize(),
      inventory: this.inventory.serialize(),
      wasNeglected: this.wasNeglected,
      currentRoom: this.currentRoom,
    });
  }

  load(data: string) {
    const parsed = JSON.parse(data);
    this.stage = parsed.stage;
    this.growthPoints = parsed.growthPoints;
    this.hunger.deserialize(parsed.hunger);
    this.boring.deserialize(parsed.boring);
    this.poop.deserialize(parsed.poop);
    this.illness.deserialize(parsed.illness);
    if (parsed.personality) {
      this.personality = new Personality(parsed.personality);
    }
    if (parsed.memorySystem) {
      this.memorySystem.deserialize(parsed.memorySystem);
    }
    if (parsed.inventory) {
      this.inventory.deserialize(parsed.inventory);
    }
    if (parsed.wasNeglected !== undefined) {
      this.wasNeglected = parsed.wasNeglected;
    }
    if (parsed.currentRoom) {
      this.currentRoom = parsed.currentRoom;
    }
  }
}
