export class Ingredient {
    constructor(identifier, name, personality, tier, iconPath = '') {
        this.identifier = identifier;
        this.name = name;
        this.personality = personality;
        this.tier = tier;
        this.iconPath = iconPath;
    }
    // Tier determina cuántas estrellas de saciedad da
    getSatiationStars() {
        switch (this.tier) {
            case 1: return 1;
            case 2: return 2;
            case 3: return 3;
            default: return 1;
        }
    }
    static createNeutral() {
        return new Ingredient('neutral_basic', 'Mochi Neutro', 'neutral', 1);
    }
    static createAnxious(tier = 1) {
        return new Ingredient(`anxious_t${tier}`, 'Ingrediente Ansioso', 'anxious', tier);
    }
    static createEdgy(tier = 1) {
        return new Ingredient(`edgy_t${tier}`, 'Ingrediente Edgy', 'edgy', tier);
    }
    static createGeek(tier = 1) {
        return new Ingredient(`geek_t${tier}`, 'Ingrediente Geek', 'geek', tier);
    }
    static createSassy(tier = 1) {
        return new Ingredient(`sassy_t${tier}`, 'Ingrediente Sassy', 'sassy', tier);
    }
    static createIntelectual(tier = 1) {
        return new Ingredient(`intelectual_t${tier}`, 'Ingrediente Intelectual', 'intelectual', tier);
    }
    serialize() {
        return {
            identifier: this.identifier,
            name: this.name,
            personality: this.personality,
            tier: this.tier,
            iconPath: this.iconPath,
        };
    }
    static deserialize(data) {
        return new Ingredient(data.identifier, data.name, data.personality, data.tier, data.iconPath);
    }
}
