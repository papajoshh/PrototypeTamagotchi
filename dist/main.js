import { Pet, LifeStage } from './core/Pet';
import { GameLoop } from './core/GameLoop';
import { GameUI } from './ui/GameUI';
import { Ingredient } from './core/Ingredient';
import { Poop } from './core/Poop';
import { Illness } from './core/Illness';
import { MemorySystem } from './core/MemorySystem';
import { IngredientInventory } from './core/IngredientInventory';
// Inicializar juego
const canvas = document.getElementById('game-canvas');
const pet = new Pet();
const gameLoop = new GameLoop(pet);
const ui = new GameUI(canvas, pet);
// Configurar callbacks
ui.onFeedWithIngredient = (ingredientId) => {
    let ingredient = null;
    // Caso especial: neutral (siempre disponible, no está en inventario)
    if (ingredientId === 'neutral') {
        ingredient = Ingredient.createNeutral();
    }
    else {
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
        }
        else if (result.reason === 'full') {
            console.log('[Game] Pet is full and refused food!');
            ui.showFeedback('refuse_food');
        }
        else {
            console.log('[Game] Failed to feed - no ingredient!');
        }
    }
    else {
        console.log('[Game] Ingredient not found!');
    }
};
ui.onPlayMinigame = (minigameId, personality) => {
    // Este callback ya no es necesario, GameUI.handleMinigameEnd maneja todo
    console.log(`[Game] Starting ${minigameId} (${personality}) minigame`);
};
ui.onCleanPoop = () => {
    pet.cleanPoop();
    console.log('[Game] Cleaned poop');
};
ui.onCure = () => {
    pet.cure();
    console.log('[Game] Cured illness');
};
ui.onTapEgg = () => {
    // Si está muerto, revivir directamente como Baby
    if (pet.stage === 6) { // LifeStage.Dead
        console.log('[Game] Reviving pet...');
        pet.revive(); // Usa el método revive() que ya resetea todo correctamente
        console.log('[Game] Pet revived as Baby with 1⭐ hunger and 1⭐ fun!');
    }
    else {
        // Huevo normal
        pet.tapEgg();
        console.log('[Game] Egg hatched!');
    }
};
ui.onTimeChange = (multiplier) => {
    gameLoop.setTimeMultiplier(multiplier);
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
console.log('  forceNeglect()     - Mark as neglected (evolves to Descuidado)');
console.log('  addIngredient(personality, tier) - Add 5 ingredients');
console.log('    Example: addIngredient("anxious", 2)');
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
console.log('  - pet.memorySystem - Check memories');
// Exponer funciones globales para control
window.setTimeSpeed = (multiplier) => {
    gameLoop.setTimeMultiplier(multiplier);
    ui.setTimeMultiplier(multiplier);
    console.log(`Time speed set to ${multiplier}x`);
};
window.resetPet = () => {
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
window.killPet = () => {
    pet.die();
    console.log('Pet killed!');
};
window.makeIll = () => {
    pet.illness.getIll(pet.stage);
    console.log('Pet is now ill!');
};
window.addIngredient = (personality, tier = 1) => {
    const ingredient = (() => {
        switch (personality.toLowerCase()) {
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
window.forceNeglect = () => {
    pet.wasNeglected = true;
    console.log('Pet marked as neglected! Will evolve to Descuidado on next evolution.');
};
window.pet = pet;
window.gameLoop = gameLoop;
// Funciones de testing de notificaciones
window.testNotification = (type) => {
    gameLoop.notifications.forceNotify(type);
    console.log(`Sent test notification: ${type}`);
};
window.testAllNotifications = () => {
    const types = ['attention_low', 'attention_critical', 'illness', 'near_death', 'death', 'evolution'];
    types.forEach((type, index) => {
        setTimeout(() => {
            gameLoop.notifications.forceNotify(type);
            console.log(`Sent test notification: ${type}`);
        }, index * 1500); // 1.5s entre cada una
    });
};
// Auto-save on close
window.addEventListener('beforeunload', () => {
    gameLoop.save();
});
