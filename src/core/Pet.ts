import { Hunger } from './Hunger';
import { Boring } from './Boring';
import { Poop } from './Poop';
import { Illness } from './Illness';
import { Personality } from './Personality';
import { MemorySystem } from './MemorySystem';
import { IngredientInventory } from './IngredientInventory';
import { Ingredient } from './Ingredient';
import { LifeStage, GROWTH_THRESHOLDS } from './LifeStage';
import { EvolutionTree } from './EvolutionTree';

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
  neglectedTime: number = 0; // Tiempo acumulado en estado neglected (0⭐ hambre o diversión)

  // Sistema de mimitos
  mimitosTimer: number = 120; // 2 minutos hasta pedir mimitos
  readonly MIMITOS_INTERVAL: number = 120; // Cada 2 minutos
  isDemandingMimitos: boolean = false;
  mimitosOpportunityTimer: number = 10; // 10 segundos de ventana para activar mimitos
  readonly MIMITOS_OPPORTUNITY_WINDOW: number = 10; // Ventana de 10 segundos

  // Decoración actual
  currentRoom: string = 'style1'; // Por defecto style1

  // Sistema de eclosión progresiva del huevo
  eggTaps: number = 0;
  readonly EGG_TAPS_REQUIRED: number = 20;
  eggRotation: number = 0; // Ángulo de rotación del huevo (metrónomo: -30° a +30°)

  // Sistema de Servicios Sociales
  socialServicesActivated: boolean = false; // Si ya se dio el primer aviso
  illnessCount: number = 0; // Contador de enfermedades (2da = Game Over)
  socialServicesWatching: boolean = false; // Si están observando actualmente
  socialServicesWatchingReason: string | null = null; // 'hunger' | 'fun' | 'poop'

  // Valores previos para detectar transiciones (SS watching triggers)
  private previousHungerStars: number = 3;
  private previousFunStars: number = 3;
  private previousHasPoop: boolean = false;

  // Eventos
  onEvolve?: (newStage: LifeStage) => void;
  onDeath?: () => void;
  onGrow?: (progress: number) => void;
  onSocialServicesGameOver?: (reason: 'second_illness' | 'hunger_death') => void; // Game Over por SS
  onAmbulance?: () => void; // Trigger animación de ambulancia
  onFirstWarning?: () => void; // Trigger "PRIMER AVISO"

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

    // Acumular tiempo de descuido (0⭐ hambre o diversión)
    const isCurrentlyNeglected = this.hunger.getStars() === 0 || this.boring.getStars() === 0;
    if (isCurrentlyNeglected) {
      this.neglectedTime += deltaTime;
    }

    // Si acumula la MITAD del tiempo de crecimiento de la etapa → Descuidado
    const growthThreshold = GROWTH_THRESHOLDS[this.stage];
    const neglectThreshold = growthThreshold / 2;
    if (this.neglectedTime >= neglectThreshold) {
      this.wasNeglected = true;
      console.log(`[Pet] 🚨 Neglect threshold reached: ${(this.neglectedTime / 60).toFixed(1)} min / ${(neglectThreshold / 60).toFixed(1)} min`);
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

    // Sistema de Servicios Sociales "watching" (solo si ya fue activado)
    if (this.socialServicesActivated && !this.socialServicesWatching) {
      // Detectar transición hambre: 2→1 o 1→0 estrellas
      const currentHungerStars = this.hunger.getStars();
      if ((this.previousHungerStars === 2 && currentHungerStars === 1) ||
          (this.previousHungerStars === 1 && currentHungerStars === 0)) {
        // Roll de 50% para activar SS watching
        if (Math.random() < 0.5) {
          this.socialServicesWatching = true;
          this.socialServicesWatchingReason = 'hunger';
          console.log('[Pet] 🚨 Social Services are now WATCHING (hunger critical!)');
        }
      }
      this.previousHungerStars = currentHungerStars;

      // Detectar transición diversión: 2→1 o 1→0 estrellas
      const currentFunStars = this.boring.getStars();
      if ((this.previousFunStars === 2 && currentFunStars === 1) ||
          (this.previousFunStars === 1 && currentFunStars === 0)) {
        // Roll de 50% para activar SS watching
        if (Math.random() < 0.5) {
          this.socialServicesWatching = true;
          this.socialServicesWatchingReason = 'fun';
          console.log('[Pet] 🚨 Social Services are now WATCHING (fun critical!)');
        }
      }
      this.previousFunStars = currentFunStars;

      // Detectar aparición de caca
      const currentHasPoop = this.poop.hasPoopedNow();
      if (!this.previousHasPoop && currentHasPoop) {
        // Roll de 50% para activar SS watching
        if (Math.random() < 0.5) {
          this.socialServicesWatching = true;
          this.socialServicesWatchingReason = 'poop';
          console.log('[Pet] 🚨 Social Services are now WATCHING (poop appeared!)');
        }
      }
      this.previousHasPoop = currentHasPoop;
    }

    // Desactivar SS watching si las condiciones mejoran
    if (this.socialServicesWatching) {
      const hungerOK = this.hunger.getStars() >= 2;
      const funOK = this.boring.getStars() >= 2;
      const poopOK = !this.poop.hasPoopedNow();

      if (hungerOK && funOK && poopOK) {
        this.socialServicesWatching = false;
        this.socialServicesWatchingReason = null;
        console.log('[Pet] ✅ Social Services stopped watching (conditions improved)');
      }
    }

    // Sistema de mimitos (solo cuando está completamente satisfecho)
    const isFullySatisfied = this.hunger.isFullySatiated() && this.boring.isFullyEntertained();

    if (isFullySatisfied) {
      if (!this.isDemandingMimitos) {
        // Esperando a que se active la demanda
        this.mimitosTimer -= deltaTime;
        if (this.mimitosTimer <= 0) {
          this.isDemandingMimitos = true;
          this.mimitosOpportunityTimer = this.MIMITOS_OPPORTUNITY_WINDOW; // Resetear ventana de oportunidad
          console.log('[Pet] 💕 Demanding mimitos! You have 10 seconds to respond.');
        }
      } else {
        // Ya está demandando mimitos, contar ventana de oportunidad
        this.mimitosOpportunityTimer -= deltaTime;
        if (this.mimitosOpportunityTimer <= 0) {
          // Se acabó la ventana de oportunidad, resetear todo
          this.isDemandingMimitos = false;
          this.mimitosTimer = this.MIMITOS_INTERVAL; // Volver a esperar 2 minutos
          this.mimitosOpportunityTimer = this.MIMITOS_OPPORTUNITY_WINDOW;
          console.log('[Pet] 💔 Mimitos opportunity missed! Waiting another 2 minutes...');
        }
      }
    } else {
      // Si deja de estar satisfecho mientras está demandando, cancelar
      if (this.isDemandingMimitos) {
        this.isDemandingMimitos = false;
        this.mimitosTimer = this.MIMITOS_INTERVAL;
        this.mimitosOpportunityTimer = this.MIMITOS_OPPORTUNITY_WINDOW;
        console.log('[Pet] Mimitos demand cancelled (no longer fully satisfied)');
      }
    }
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
    const oldPersonality = this.personality?.name || null;

    // Avanzar etapa
    this.stage++;
    this.growthPoints = 0;

    // Seleccionar recuerdo dominante
    const dominantMemory = this.memorySystem.selectDominantMemory();

    // Usar EvolutionTree para determinar nueva personalidad
    const newPersonalityName = EvolutionTree.getNextPersonality(
      oldStage,
      oldPersonality,
      dominantMemory,
      this.wasNeglected
    );

    if (newPersonalityName) {
      this.personality = new Personality(newPersonalityName);

      // Log detallado de la evolución
      const stageNames = ['Egg', 'Baby', 'Child', 'Young', 'Adult', 'ReadyToAscend', 'Dead'];
      const fromStage = stageNames[oldStage];
      const toStage = stageNames[this.stage];

      if (newPersonalityName === 'Descuidado') {
        console.log(`[Pet] 🚨 Evolved ${fromStage} → ${toStage}: DESCUIDADO (neglected care)`);
      } else if (newPersonalityName === 'Patata') {
        console.log(`[Pet] 🥔 Evolved ${fromStage} → ${toStage}: PATATA (no memories)`);
      } else {
        console.log(`[Pet] ✨ Evolved ${fromStage} → ${toStage}: "${oldPersonality || 'Baby'}" + "${dominantMemory}" → "${newPersonalityName}"`);
      }
    } else {
      // Fallback: mantener personalidad actual o asignar neutral
      if (!this.personality) {
        this.personality = new Personality('neutral');
      }
      console.log(`[Pet] ⚠️ Evolution failed: No valid path found for "${oldPersonality}" + "${dominantMemory}" at stage ${oldStage}`);
    }

    // Olvidar recuerdos al evolucionar
    this.memorySystem.forgetAll();

    // Reset sistema de descuido
    this.wasNeglected = false;
    this.neglectedTime = 0;

    // Actualizar tiempos de necesidades según nueva etapa
    this.hunger.onStageChange(this.stage);
    this.boring.onStageChange(this.stage);

    if (this.onEvolve) {
      this.onEvolve(this.stage);
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

  // Curar enfermedad (llamado directamente, sin ambulancia - solo para debug/legacy)
  cure() {
    this.illness.cure();
  }

  // Intentar curar con ambulancia (llamado cuando usuario tapa pet enfermo)
  attemptCureWithAmbulance(): boolean {
    if (!this.illness.isCurrentlyIll()) {
      return false; // No está enfermo, no hacer nada
    }

    // Disparar animación de ambulancia
    if (this.onAmbulance) {
      this.onAmbulance();
    }

    return true;
  }

  // Sistema de mimitos
  giveMimitos() {
    // Cada tap da 0.2% del threshold de crecimiento actual
    const threshold = GROWTH_THRESHOLDS[this.stage];
    const growthIncrease = threshold * 0.002; // 0.2% = 0.002
    this.growthPoints += growthIncrease;

    console.log(`[Pet] 💕 Mimito given! +${growthIncrease.toFixed(1)} growth (${(growthIncrease / threshold * 100).toFixed(1)}%)`);
  }

  endMimitos() {
    // Resetear estado de mimitos
    this.isDemandingMimitos = false;
    this.mimitosTimer = this.MIMITOS_INTERVAL; // Resetear a 2 minutos
    this.mimitosOpportunityTimer = this.MIMITOS_OPPORTUNITY_WINDOW; // Resetear ventana
    console.log('[Pet] 💕 Mimitos session ended. Next demand in 2 minutes.');
  }

  // Verificar condiciones de muerte y enfermedad (público para testing)
  public checkDeath() {
    // Verificar si debe enfermarse
    if (this.poop.shouldTriggerIllness() && !this.illness.isCurrentlyIll()) {
      this.illnessCount++; // Incrementar contador de enfermedades

      // 2da enfermedad = Game Over por Servicios Sociales (ANTES de poder curar)
      if (this.illnessCount >= 2) {
        console.log('[Pet] 🚨 Second illness! Social Services GAME OVER!');
        // NO poner en Dead para que se muestre la pantalla de SS, no la de muerte
        if (this.onSocialServicesGameOver) {
          this.onSocialServicesGameOver('second_illness');
        }
        return;
      }

      // 1ra enfermedad: Poner enfermo (espera tap del usuario para curar)
      this.illness.getIll(this.stage);
      this.wasNeglected = true; // Marcar como neglected automáticamente
      console.log('[Pet] 🚨 Got ill from poop! Tap the pet to cure with ambulance.');
      // NO disparar ambulancia aquí, esperar a que el usuario tape el pet
    }

    // Muerte por hambre: Si SS ya fue activado, interceptar con Game Over
    if (this.hunger.isDying()) {
      if (this.socialServicesActivated) {
        console.log('[Pet] 🚨 Death by hunger intercepted by Social Services!');
        // NO poner en Dead para que se muestre la pantalla de SS, no la de muerte
        if (this.onSocialServicesGameOver) {
          this.onSocialServicesGameOver('hunger_death');
        }
        return;
      } else {
        console.log('[Pet] Died from hunger!');
        this.die();
        return;
      }
    }

    // Muerte por enfermedad: Si SS está activado, nunca puede morir así (solo Game Over por SS)
    if (this.illness.isDying()) {
      if (this.socialServicesActivated) {
        // SS activado = No puede morir por enfermedad, solo Game Over por SS
        console.log('[Pet] ⚠️ Illness death blocked by Social Services (already activated)');
        // Auto-curar para evitar bucle
        this.illness.cure();
        return;
      } else {
        // SS no activado = Muerte normal
        console.log('[Pet] Died from illness!');
        this.die();
        return;
      }
    }
  }

  die() {
    this.stage = LifeStage.Dead;
    if (this.onDeath) {
      this.onDeath();
    }
  }

  // Resucitar (vuelve a Egg, no directamente a Baby)
  revive() {
    if (this.stage === LifeStage.Dead) {
      this.resetToEgg();
    }
  }

  // Reset completo después de SS Game Over (no requiere estar en Dead)
  resetAfterSocialServices() {
    this.resetToEgg();
  }

  // Método común de reset a Egg (usado por revive y SS Game Over)
  private resetToEgg() {
    this.stage = LifeStage.Egg; // Vuelve a huevo
    this.eggTaps = 0; // Resetear progreso de taps
    this.eggRotation = 0; // Resetear rotación del huevo
    this.personality = null; // Limpiar personalidad
    this.memorySystem = new MemorySystem(); // Resetear memorias
    this.illness.cure();
    this.hunger.reset();
    this.boring.reset();
    this.poop.reset();
    this.growthPoints = 0; // Resetear crecimiento
    this.wasNeglected = false; // Resetear flag de descuidado
    this.neglectedTime = 0; // Resetear tiempo acumulado de descuido
    this.mimitosTimer = this.MIMITOS_INTERVAL; // Resetear timer de mimitos
    this.isDemandingMimitos = false; // Resetear demanda de mimitos

    // Resetear sistema de Servicios Sociales
    this.socialServicesActivated = false;
    this.illnessCount = 0;
    this.socialServicesWatching = false;
    this.socialServicesWatchingReason = null;
    this.previousHungerStars = 3;
    this.previousFunStars = 3;
    this.previousHasPoop = false;

    // Actualizar timers al stage Egg (no se actualizan en update porque Egg está excluido)
    this.hunger.onStageChange(this.stage);
    this.boring.onStageChange(this.stage);

    if (this.onEvolve) {
      this.onEvolve(this.stage);
    }
  }

  // Ascender (de ReadyToAscend vuelve a Egg para un nuevo ciclo)
  ascend() {
    if (this.stage === LifeStage.ReadyToAscend) {
      console.log('[Pet] Ascending! Returning to Egg for a new cycle...');
      this.stage = LifeStage.Egg; // Vuelve a huevo
      this.eggTaps = 0; // Resetear progreso de taps
      this.eggRotation = 0; // Resetear rotación del huevo
      this.personality = null; // Limpiar personalidad
      this.memorySystem = new MemorySystem(); // Resetear memorias
      this.illness.cure();
      this.hunger.reset();
      this.boring.reset();
      this.poop.reset();
      this.growthPoints = 0; // Resetear crecimiento
      this.wasNeglected = false; // Resetear flag de descuidado
      this.neglectedTime = 0; // Resetear tiempo acumulado de descuido
      this.mimitosTimer = this.MIMITOS_INTERVAL; // Resetear timer de mimitos
      this.isDemandingMimitos = false; // Resetear demanda de mimitos

      // Resetear sistema de Servicios Sociales
      this.socialServicesActivated = false;
      this.illnessCount = 0;
      this.socialServicesWatching = false;
      this.socialServicesWatchingReason = null;
      this.previousHungerStars = 3;
      this.previousFunStars = 3;
      this.previousHasPoop = false;

      // Actualizar timers al stage Egg
      this.hunger.onStageChange(this.stage);
      this.boring.onStageChange(this.stage);

      if (this.onEvolve) {
        this.onEvolve(this.stage);
      }
    }
  }

  // Tap en el huevo para ir eclosionando progresivamente
  tapEgg() {
    if (this.stage === LifeStage.Egg) {
      this.eggTaps++;

      // Alternar rotación del huevo (metrónomo: -30° <-> +30°)
      // Si está en 0° o positivo, ir a -30°. Si está en negativo, ir a +30°
      if (this.eggRotation <= 0) {
        this.eggRotation = 15; // Mover a la derecha
      } else {
        this.eggRotation = -15; // Mover a la izquierda
      }

      // Si alcanzamos el número requerido de taps, eclosionar
      if (this.eggTaps >= this.EGG_TAPS_REQUIRED) {
        this.stage = LifeStage.Baby;
        this.eggTaps = 0; // Resetear contador
        this.eggRotation = 0; // Resetear rotación

        // Actualizar tiempos de necesidades según nueva etapa
        this.hunger.onStageChange(this.stage);
        this.boring.onStageChange(this.stage);

        // Baby nace con 1 estrella de hambre y 1 de diversión

        if (this.onEvolve) {
          this.onEvolve(this.stage);
        }
      }
    }
  }

  // Obtener progreso de eclosión (0-1)
  getEggProgress(): number {
    if (this.stage !== LifeStage.Egg) return 0;
    return this.eggTaps / this.EGG_TAPS_REQUIRED;
  }

  // Serialización para guardar
  save(): string {
    return JSON.stringify({
      stage: this.stage,
      growthPoints: this.growthPoints,
      eggTaps: this.eggTaps,
      eggRotation: this.eggRotation,
      hunger: this.hunger.serialize(),
      boring: this.boring.serialize(),
      poop: this.poop.serialize(),
      illness: this.illness.serialize(),
      personality: this.personality?.name || null,
      memorySystem: this.memorySystem.serialize(),
      inventory: this.inventory.serialize(),
      wasNeglected: this.wasNeglected,
      neglectedTime: this.neglectedTime,
      mimitosTimer: this.mimitosTimer,
      isDemandingMimitos: this.isDemandingMimitos,
      mimitosOpportunityTimer: this.mimitosOpportunityTimer,
      currentRoom: this.currentRoom,
      // Servicios Sociales
      socialServicesActivated: this.socialServicesActivated,
      illnessCount: this.illnessCount,
      socialServicesWatching: this.socialServicesWatching,
      socialServicesWatchingReason: this.socialServicesWatchingReason,
      previousHungerStars: this.previousHungerStars,
      previousFunStars: this.previousFunStars,
      previousHasPoop: this.previousHasPoop,
    });
  }

  load(data: string) {
    const parsed = JSON.parse(data);
    this.stage = parsed.stage;
    this.growthPoints = parsed.growthPoints;
    this.eggTaps = parsed.eggTaps || 0;
    this.eggRotation = parsed.eggRotation || 0;
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
    if (parsed.neglectedTime !== undefined) {
      this.neglectedTime = parsed.neglectedTime;
    }
    if (parsed.mimitosTimer !== undefined) {
      this.mimitosTimer = parsed.mimitosTimer;
    }
    if (parsed.isDemandingMimitos !== undefined) {
      this.isDemandingMimitos = parsed.isDemandingMimitos;
    }
    if (parsed.mimitosOpportunityTimer !== undefined) {
      this.mimitosOpportunityTimer = parsed.mimitosOpportunityTimer;
    }
    if (parsed.currentRoom) {
      this.currentRoom = parsed.currentRoom;
    }
    // Servicios Sociales
    if (parsed.socialServicesActivated !== undefined) {
      this.socialServicesActivated = parsed.socialServicesActivated;
    }
    if (parsed.illnessCount !== undefined) {
      this.illnessCount = parsed.illnessCount;
    }
    if (parsed.socialServicesWatching !== undefined) {
      this.socialServicesWatching = parsed.socialServicesWatching;
    }
    if (parsed.socialServicesWatchingReason !== undefined) {
      this.socialServicesWatchingReason = parsed.socialServicesWatchingReason;
    }
    if (parsed.previousHungerStars !== undefined) {
      this.previousHungerStars = parsed.previousHungerStars;
    }
    if (parsed.previousFunStars !== undefined) {
      this.previousFunStars = parsed.previousFunStars;
    }
    if (parsed.previousHasPoop !== undefined) {
      this.previousHasPoop = parsed.previousHasPoop;
    }
  }
}
