import { Ingredient } from './Ingredient';
export class IngredientInventory {
    // Inventario inicial
    constructor() {
        this.ingredients = new Map();
        // Empezar con 1 ingrediente de cada personalidad (NO neutral, ese está siempre disponible)
        this.add(Ingredient.createAnxious(1), 1);
        this.add(Ingredient.createEdgy(1), 1);
        this.add(Ingredient.createGeek(1), 1);
        this.add(Ingredient.createSassy(1), 1);
        this.add(Ingredient.createIntelectual(1), 1);
    }
    add(ingredient, quantity = 1) {
        const current = this.ingredients.get(ingredient.identifier) || 0;
        this.ingredients.set(ingredient.identifier, current + quantity);
        console.log(`[Inventory] Added ${quantity}x ${ingredient.name} (total: ${current + quantity})`);
    }
    has(identifier) {
        return (this.ingredients.get(identifier) || 0) > 0;
    }
    getQuantity(identifier) {
        return this.ingredients.get(identifier) || 0;
    }
    consume(identifier) {
        const current = this.ingredients.get(identifier) || 0;
        if (current <= 0)
            return false;
        this.ingredients.set(identifier, current - 1);
        console.log(`[Inventory] Consumed 1x ${identifier} (remaining: ${current - 1})`);
        return true;
    }
    getAll() {
        const result = [];
        this.ingredients.forEach((quantity, identifier) => {
            if (quantity <= 0)
                return;
            // Recrear ingrediente desde el identifier
            // Formato: "personality_tTier" o "neutral_basic"
            let ingredient = null;
            if (identifier === 'neutral_basic') {
                ingredient = Ingredient.createNeutral();
            }
            else {
                // Extraer personality y tier del identifier
                const parts = identifier.split('_');
                if (parts.length === 2) {
                    const personality = parts[0]; // anxious, edgy, geek, sassy, intelectual
                    const tierStr = parts[1]; // t1, t2, t3
                    const tier = parseInt(tierStr.substring(1)); // 1, 2, 3
                    // Crear ingrediente según personalidad y tier
                    switch (personality) {
                        case 'anxious':
                            ingredient = Ingredient.createAnxious(tier);
                            break;
                        case 'edgy':
                            ingredient = Ingredient.createEdgy(tier);
                            break;
                        case 'geek':
                            ingredient = Ingredient.createGeek(tier);
                            break;
                        case 'sassy':
                            ingredient = Ingredient.createSassy(tier);
                            break;
                        case 'intelectual':
                            ingredient = Ingredient.createIntelectual(tier);
                            break;
                    }
                }
            }
            if (ingredient) {
                result.push({ ingredient, quantity });
            }
        });
        return result;
    }
    serialize() {
        const data = {};
        this.ingredients.forEach((quantity, identifier) => {
            data[identifier] = quantity;
        });
        return data;
    }
    deserialize(data) {
        this.ingredients.clear();
        Object.entries(data).forEach(([identifier, quantity]) => {
            this.ingredients.set(identifier, quantity);
        });
    }
}
