import { Pet, LifeStage } from './core/Pet';
import { GameLoop, TIME_MODES } from './core/GameLoop';
import { GameUI } from './ui/GameUI';
import { Ingredient } from './core/Ingredient';
import { Poop } from './core/Poop';
import { Illness } from './core/Illness';
import { MemorySystem } from './core/MemorySystem';
import { IngredientInventory } from './core/IngredientInventory';
import { EvolutionTree } from './core/EvolutionTree';

// Inicializar juego
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const pet = new Pet();
const gameLoop = new GameLoop(pet);
const settings = gameLoop.getSettings();
const ui = new GameUI(canvas, pet, settings);

// Configurar callbacks
ui.onFeedWithIngredient = (ingredientId: string) => {
  let ingredient: Ingredient | null = null;

  // Caso especial: neutral (siempre disponible, no está en inventario)
  if (ingredientId === 'neutral') {
    ingredient = Ingredient.createNeutral();
  } else {
    // Buscar en inventario
    const inventory = pet.inventory.getAll();
    const item = inventory.find(i => i.ingredient.identifier === ingredientId);
    if (item) {
      ingredient = item.ingredient;
    }
  }

  if (ingredient) {
    const result = pet.feedWithIngredient(ingredient);
    if (result.success) {
      console.log(`[Game] Fed pet with ${ingredient.name}`);
      // Renovar despertar temporal si está activo
      settings.sleep.refreshTemporaryWakeUp();
    } else if (result.reason === 'full') {
      console.log('[Game] Pet is full and refused food!');
      ui.showFeedback('refuse_food');
    } else {
      console.log('[Game] Failed to feed - no ingredient!');
    }
  } else {
    console.log('[Game] Ingredient not found!');
  }
};

ui.onPlayMinigame = (minigameId: string, personality: string) => {
  // Este callback ya no es necesario, GameUI.handleMinigameEnd maneja todo
  console.log(`[Game] Starting ${minigameId} (${personality}) minigame`);
  // Renovar despertar temporal si está activo
  settings.sleep.refreshTemporaryWakeUp();
};

ui.onStartCookingMinigame = (ingredientId: string, tier: number) => {
  console.log(`[Game] Starting cooking minigame with ${ingredientId} (tier ${tier})`);
  ui.launchCookingMinigame(ingredientId, tier);
  // Renovar despertar temporal si está activo
  settings.sleep.refreshTemporaryWakeUp();
};

ui.onCleanPoop = () => {
  pet.cleanPoop();
  console.log('[Game] Cleaned poop');
  // Renovar despertar temporal si está activo
  settings.sleep.refreshTemporaryWakeUp();
};

ui.onCure = () => {
  pet.cure();
  console.log('[Game] Cured illness');
  // Renovar despertar temporal si está activo
  settings.sleep.refreshTemporaryWakeUp();
};

ui.onTapEgg = () => {
  // Si está muerto, revivir a Egg
  if (pet.stage === 6) { // LifeStage.Dead
    console.log('[Game] Reviving pet as Egg...');
    pet.revive();
    console.log('[Game] Pet revived as Egg! Tap to hatch (0/20 taps)');
  } else {
    // Huevo normal: progreso de taps
    pet.tapEgg();
    const progress = pet.getEggProgress();
    if (pet.stage === 1) { // LifeStage.Baby
      console.log('[Game] Egg hatched! Baby born with 1⭐ hunger and 1⭐ fun!');
    } else {
      console.log(`[Game] Egg tap progress: ${pet.eggTaps}/${pet.EGG_TAPS_REQUIRED} (${Math.floor(progress * 100)}%)`);
    }
  }
};

ui.onAscend = () => {
  console.log('[Game] Pet is ready to ascend!');
  pet.ascend();
  console.log('[Game] Pet ascended! Starting new cycle as Egg (0/20 taps)');
};

ui.onTimeChange = (multiplier) => {
  gameLoop.setTimeMultiplier(multiplier);
};

ui.onRequestNotificationPermission = async () => {
  return await gameLoop.requestNotificationPermission();
};

ui.onTestNotification = () => {
  gameLoop.testNotification();
};

// Eventos del pet
pet.onEvolve = (newStage) => {
  console.log(`[Game] Pet evolved to stage ${newStage}`);
};

pet.onDeath = () => {
  console.log('[Game] Pet died!');
  alert('Tu mascota ha muerto! 😢');
};

// Iniciar game loop
gameLoop.start((pet) => {
  ui.render();
});

// Renderizar primera vez
ui.render();

// Controls de Time Warp en consola
console.log('=== TAMAGOTCHI PROTOTYPE ===');
console.log('');
console.log('⏱️  TIME WARP:');
console.log('  setTimeSpeed(1)    - Real time (14h cycle)');
console.log('  setTimeSpeed(10)   - 10x (1.4h cycle)');
console.log('  setTimeSpeed(60)   - 60x (14min cycle) ⭐ RECOMMENDED');
console.log('  setTimeSpeed(600)  - 600x (1.4min cycle)');
console.log('  setTimeSpeed(1000) - DEBUG (50s cycle) ⚡');
console.log('');
console.log('🛠️  DEV TOOLS:');
console.log('  resetPet()         - Clear save and restart');
console.log('  killPet()          - Kill pet instantly');
console.log('  makeIll()          - Make pet ill');
console.log('  makePoop()         - Make pet poop instantly');
console.log('  forceNeglect()     - Mark as neglected (evolves to Descuidado)');
console.log('  addIngredient(personality, tier) - Add 5 ingredients');
console.log('    Example: addIngredient("anxious", 2)');
console.log('');
console.log('🍽️  HUNGER DEBUG:');
console.log('  setHunger(stars)   - Set hunger to 0-3 stars');
console.log('  makeHungry()       - Set hunger to 1 star');
console.log('  makeStarving()     - Set hunger to 0 stars');
console.log('  makeFull()         - Set hunger to 3 stars (full)');
console.log('');
console.log('🧬 EVOLUTION DEBUG:');
console.log('  addMemory(personality, count) - Add memories (anxious/edgy/geek/sassy/intelectual)');
console.log('  forceEvolve()      - Force evolution to next stage');
console.log('  getNextEvolution() - Preview next evolution');
console.log('  showPossibleEvolutions() - Show all possible evolutions');
console.log('  testEvolutionPath("child", "young", "adult") - Test full evolution');
console.log('    Example: testEvolutionPath("intelectual", "edgy", "sassy") → Glados');
console.log('');
console.log('🔔 NOTIFICATIONS:');
console.log('  testNotification(type) - Test specific notification');
console.log('    Types: attention_low, attention_critical, illness,');
console.log('           near_death, death, evolution');
console.log('  testAllNotifications() - Test all notifications (1.5s apart)');
console.log('');
console.log('🎮 CONTROLS:');
console.log('  - Click egg to hatch');
console.log('  - Click buttons to interact');
console.log('  - Click 💩 to clean');
console.log('');
console.log('📊 DEBUG:');
console.log('  - pet           - Access pet object');
console.log('  - pet.inventory - Check inventory');
console.log('  - debugBackgroundSystem() - Check if background is working');
console.log('  - pet.memorySystem - Check memories');

// Exponer funciones globales para control
(window as any).setTimeSpeed = (multiplier: number) => {
  gameLoop.setTimeMultiplier(multiplier);
  ui.setTimeMultiplier(multiplier);
  console.log(`Time speed set to ${multiplier}x`);
};

(window as any).resetPet = () => {
  // Primero borrar localStorage
  localStorage.clear(); // Borra TODO el localStorage para asegurar

  // O específicamente:
  // localStorage.removeItem('tamagotchi-save');
  // localStorage.removeItem('last-save-time');

  // Reiniciar pet sin recargar página
  pet.stage = LifeStage.Egg;
  pet.growthPoints = 0;
  pet.personality = null;
  pet.wasNeglected = false;
  pet.hunger.reset();
  pet.boring.reset();
  // Actualizar timers al stage Egg
  pet.hunger.onStageChange(LifeStage.Egg);
  pet.boring.onStageChange(LifeStage.Egg);
  pet.poop = new Poop();
  pet.illness = new Illness();
  pet.memorySystem = new MemorySystem();
  pet.inventory = new IngredientInventory(); // Nuevo inventario con items iniciales (sin neutral)

  console.log('Pet reset to Egg! Inventory cleared!');
  console.log('Inventory items:', pet.inventory.getAll().length);

  // Guardar el estado limpio para asegurar
  gameLoop.save();

  ui.render();
};

(window as any).killPet = () => {
  pet.die();
  console.log('Pet killed!');
};

(window as any).makeIll = () => {
  pet.illness.getIll(pet.stage);
  console.log('Pet is now ill!');
};

(window as any).makePoop = () => {
  pet.poop.forcePoop();
  console.log('Pet pooped! 💩');
};

(window as any).addIngredient = (personality: string, tier: number = 1) => {
  const ingredient = (() => {
    switch(personality.toLowerCase()) {
      case 'anxious': return Ingredient.createAnxious(tier);
      case 'edgy': return Ingredient.createEdgy(tier);
      case 'geek': return Ingredient.createGeek(tier);
      case 'sassy': return Ingredient.createSassy(tier);
      case 'intelectual': return Ingredient.createIntelectual(tier);
      default: return Ingredient.createNeutral();
    }
  })();
  pet.inventory.add(ingredient, 5);
  console.log(`Added 5x ${ingredient.name}`);
};

(window as any).forceNeglect = () => {
  pet.wasNeglected = true;
  console.log('Pet marked as neglected! Will evolve to Descuidado on next evolution.');
};

// Funciones de debug para hambre
(window as any).setHunger = (stars: number) => {
  if (stars < 0 || stars > 3) {
    console.error('Hunger stars must be between 0 and 3');
    return;
  }
  (pet.hunger as any).stars = stars;
  console.log(`Hunger set to ${stars} stars`);
};

(window as any).makeHungry = () => {
  (pet.hunger as any).stars = 1;
  console.log('Pet is now hungry! (1 star)');
};

(window as any).makeStarving = () => {
  (pet.hunger as any).stars = 0;
  console.log('Pet is now starving! (0 stars)');
};

(window as any).makeFull = () => {
  (pet.hunger as any).stars = 3;
  console.log('Pet is now full! (3 stars)');
};

// Funciones de debug para diversión
(window as any).setBoring = (stars: number) => {
  if (stars < 0 || stars > 3) {
    console.error('Boring stars must be between 0 and 3');
    return;
  }
  (pet.boring as any).stars = stars;
  console.log(`Boring set to ${stars} stars`);
};

(window as any).makeEntertained = () => {
  (pet.boring as any).stars = 3;
  console.log('Pet is now entertained! (3 stars)');
};

// Función de debug para mimitos
(window as any).activateMimitos = () => {
  // Poner hambre y diversión a 3 estrellas usando métodos públicos
  pet.hunger.satiate(3); // Saciar completamente
  pet.boring.entertain(); // Entretener completamente (1 vez = 3 estrellas)

  // Activar DIRECTAMENTE el flag de mimitos (no esperar al update)
  pet.isDemandingMimitos = true;
  pet.mimitosTimer = 120; // Reset timer para siguiente ciclo

  console.log('✨ Mimitos activated!');
  console.log(`💕 Hunger stars: ${pet.hunger.getStars()}, Boring stars: ${pet.boring.getStars()}`);
  console.log(`💕 isDemandingMimitos: ${pet.isDemandingMimitos}`);
  console.log('💕 Look for the heart icon (💕) next to the other status indicators!');
  console.log('👆 Click on your pet to start the mimitos minigame!');
};

// Funciones de debug para evolución
(window as any).addMemory = (personality: string, count: number = 1) => {
  for (let i = 0; i < count; i++) {
    pet.memorySystem.addMemory('food', personality.toLowerCase());
  }
  console.log(`Added ${count} "${personality}" memories`);
  console.log('Memory distribution:', Object.fromEntries(pet.memorySystem.getMemoryDistribution()));
};

(window as any).forceEvolve = () => {
  if (pet.stage >= LifeStage.ReadyToAscend) {
    console.warn('Pet is already at max stage (ReadyToAscend)');
    return;
  }

  const oldStage = ['Egg', 'Baby', 'Child', 'Young', 'Adult', 'ReadyToAscend', 'Dead'][pet.stage];
  const oldPersonality = pet.personality?.name || 'none';
  const memoryCount = pet.memorySystem.getMemoryCount();

  console.log(`🔄 Forcing evolution from ${oldStage} (${oldPersonality}) with ${memoryCount} memories...`);

  // Forzar evolución
  pet.evolve();

  const newStage = ['Egg', 'Baby', 'Child', 'Young', 'Adult', 'ReadyToAscend', 'Dead'][pet.stage];
  const newPersonality = pet.personality?.name || 'none';

  console.log(`✨ Evolved to ${newStage}: "${newPersonality}"`);
};

(window as any).getNextEvolution = () => {
  const currentPersonality = pet.personality?.name || null;
  const dominantMemory = pet.memorySystem.selectDominantMemory();

  if (!currentPersonality) {
    console.log('Pet has no personality yet (still Baby)');
    console.log('Possible evolutions: anxious, edgy, geek, intelectual, sassy (based on memories)');
    return;
  }

  if (!dominantMemory) {
    console.log('❌ No memories! Pet will become "Patata" on next evolution');
    return;
  }

  const nextPersonality = EvolutionTree.getNextPersonality(
    pet.stage,
    currentPersonality,
    dominantMemory,
    pet.wasNeglected
  );

  if (nextPersonality) {
    const stageNames = ['Egg', 'Baby', 'Child', 'Young', 'Adult'];
    const nextStage = stageNames[pet.stage + 1];
    console.log(`🔮 Next evolution: "${currentPersonality}" + "${dominantMemory}" → "${nextPersonality}" (${nextStage})`);

    // Mostrar sprite base que se usará
    const baseSprite = EvolutionTree.getBaseSprite(nextPersonality);
    console.log(`   Sprite: ${baseSprite}.png`);
  } else {
    console.log(`❌ No valid evolution path for "${currentPersonality}" + "${dominantMemory}" at stage ${pet.stage}`);
  }
};

(window as any).showPossibleEvolutions = () => {
  const currentPersonality = pet.personality?.name;

  if (!currentPersonality) {
    console.log('Pet has no personality yet (still Baby)');
    return;
  }

  const possibilities = EvolutionTree.getPossibleEvolutions(pet.stage, currentPersonality);

  if (possibilities.length === 0) {
    console.log(`No evolutions available for "${currentPersonality}" at current stage`);
    return;
  }

  const stageNames = ['Egg', 'Baby', 'Child', 'Young', 'Adult'];
  const nextStage = stageNames[pet.stage + 1];

  console.log(`🌳 Possible evolutions from "${currentPersonality}" to ${nextStage}:`);
  possibilities.forEach(p => {
    const sprite = EvolutionTree.getBaseSprite(p);
    console.log(`   • "${p}" (sprite: ${sprite}.png)`);
  });
};

(window as any).skipToChild = () => {
  if (pet.stage !== LifeStage.Egg && pet.stage !== LifeStage.Baby) {
    console.warn('Pet is already past Baby stage');
    return;
  }

  // Tap egg if still egg
  if (pet.stage === LifeStage.Egg) {
    pet.tapEgg();
    console.log('🥚 Egg hatched!');
  }

  // Add some memories
  (window as any).addMemory('intelectual', 3);
  (window as any).addMemory('edgy', 2);

  // Force evolve to Child
  pet.growthPoints = 10000; // Exceed threshold
  console.log('⚡ Skipping to Child stage...');
  setTimeout(() => ui.render(), 100);
};

(window as any).testEvolutionPath = (childPersonality: string, youngMemory: string, adultMemory: string) => {
  console.log(`🧪 Testing evolution path: Child "${childPersonality}" → Young → Adult`);
  console.log('━'.repeat(60));

  // Reset to baby
  (window as any).resetPet();
  pet.stage = LifeStage.Baby;
  pet.growthPoints = 0;

  // Baby → Child with childPersonality
  console.log(`\n1️⃣ Baby → Child with memory "${childPersonality}"`);
  (window as any).addMemory(childPersonality, 5);
  (window as any).forceEvolve();

  // Child → Young with youngMemory
  console.log(`\n2️⃣ Child → Young with memory "${youngMemory}"`);
  (window as any).addMemory(youngMemory, 5);
  (window as any).forceEvolve();

  // Young → Adult with adultMemory
  console.log(`\n3️⃣ Young → Adult with memory "${adultMemory}"`);
  (window as any).addMemory(adultMemory, 5);
  (window as any).forceEvolve();

  console.log('\n' + '━'.repeat(60));
  console.log(`✅ Evolution path complete!`);
  console.log(`   Final personality: "${pet.personality?.name}"`);
  console.log(`   Sprite: ${EvolutionTree.getBaseSprite(pet.personality?.name || 'neutral')}.png`);
};

(window as any).pet = pet;
(window as any).gameLoop = gameLoop;

// Debug function para verificar sistema de background
(window as any).debugBackgroundSystem = () => {
  console.log('='.repeat(60));
  console.log('🔍 BACKGROUND SYSTEM DEBUG');
  console.log('='.repeat(60));

  const gl = gameLoop as any;

  console.log('\n📱 Page Visibility:');
  console.log(`  document.hidden: ${document.hidden}`);
  console.log(`  document.visibilityState: ${document.visibilityState}`);

  console.log('\n⏰ Last Save Time:');
  const lastSave = localStorage.getItem('last-save-time');
  if (lastSave) {
    const timeSince = (Date.now() - parseInt(lastSave)) / 1000;
    console.log(`  Last saved: ${timeSince.toFixed(1)}s ago`);
    console.log(`  Timestamp: ${new Date(parseInt(lastSave)).toLocaleTimeString()}`);
  } else {
    console.log(`  ❌ No last-save-time found`);
  }

  console.log('\n🐣 Pet State:');
  console.log(`  Stage: ${['Egg', 'Baby', 'Child', 'Young', 'Adult', 'ReadyToAscend', 'Dead'][pet.stage]}`);
  console.log(`  Growth points: ${pet.growthPoints.toFixed(1)} / ${[0, 3600, 18000, 32400, 32400, 0, 0][pet.stage]}`);
  console.log(`  Growth progress: ${(pet.getGrowthProgress() * 100).toFixed(1)}%`);
  console.log(`  Hunger: ${pet.hunger.getStars()}⭐`);
  console.log(`  Boring: ${pet.boring.getStars()}⭐`);

  console.log('\n💤 Sleep System:');
  console.log(`  Is sleeping: ${gl.settings.sleep.isSleeping}`);
  console.log(`  Mode: ${gl.settings.sleep.mode}`);

  console.log('\n⚙️ Background Intervals:');
  console.log(`  Background update interval ID: ${gl.backgroundUpdateIntervalId}`);
  console.log(`  Notification check interval ID: ${gl.notificationCheckIntervalId}`);
  console.log(`  Intervals running: ${gl.backgroundUpdateIntervalId !== null && gl.notificationCheckIntervalId !== null ? '✅' : '❌'}`);

  console.log('\n💡 INSTRUCTIONS:');
  console.log('  1. Run this function NOW');
  console.log('  2. Minimize the app for 2-3 minutes');
  console.log('  3. Come back and run it AGAIN');
  console.log('  4. Check if last-save-time and growth changed');

  console.log('='.repeat(60));
};

// Funciones de testing de notificaciones
(window as any).testNotification = (type: 'attention_low' | 'attention_critical' | 'illness' | 'near_death' | 'death' | 'evolution') => {
  (gameLoop as any).notifications.forceNotify(type);
  console.log(`Sent test notification: ${type}`);
};

(window as any).testAllNotifications = () => {
  const types = ['attention_low', 'attention_critical', 'illness', 'near_death', 'death', 'evolution'];
  types.forEach((type, index) => {
    setTimeout(() => {
      (gameLoop as any).notifications.forceNotify(type);
      console.log(`Sent test notification: ${type}`);
    }, index * 1500); // 1.5s entre cada una
  });
};

// Auto-save on close
window.addEventListener('beforeunload', () => {
  gameLoop.save();
});

// ============ PWA: Service Worker Registration ============
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado exitosamente:', registration.scope);

        // Verificar actualizaciones cada 60 segundos
        setInterval(() => {
          registration.update();
        }, 60000);

        // Detectar actualizaciones del SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Hay una nueva versión disponible
                console.log('[PWA] Nueva versión disponible. Recarga para actualizar.');
                // Opcional: Mostrar mensaje al usuario
                if (confirm('Hay una nueva versión disponible. ¿Quieres actualizar?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[PWA] Error al registrar Service Worker:', error);
      });

    // Recargar cuando el SW tome control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// Ocultar loading screen cuando el juego esté listo
setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }
}, 500);
