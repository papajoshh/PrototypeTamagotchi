export type PersonalityType =
  | 'neutral'
  | 'anxious'
  | 'edgy'
  | 'geek'
  | 'sassy'
  | 'intelectual';

export class Ingredient {
  identifier: string;
  name: string;
  personality: PersonalityType;
  tier: number; // 1, 2, 3 (determina saciedad)
  iconPath: string;

  constructor(
    identifier: string,
    name: string,
    personality: PersonalityType,
    tier: number,
    iconPath: string = ''
  ) {
    this.identifier = identifier;
    this.name = name;
    this.personality = personality;
    this.tier = tier;
    this.iconPath = iconPath;
  }

  // Tier determina cuántas estrellas de saciedad da
  getSatiationStars(): number {
    switch (this.tier) {
      case 1: return 1;
      case 2: return 2;
      case 3: return 3;
      default: return 1;
    }
  }

  static createNeutral(): Ingredient {
    return new Ingredient('neutral_basic', 'Mochi Neutro', 'neutral', 1);
  }

  static createAnxious(tier: number = 1): Ingredient {
    return new Ingredient(`anxious_t${tier}`, 'Ingrediente Ansioso', 'anxious', tier);
  }

  static createEdgy(tier: number = 1): Ingredient {
    return new Ingredient(`edgy_t${tier}`, 'Ingrediente Edgy', 'edgy', tier);
  }

  static createGeek(tier: number = 1): Ingredient {
    return new Ingredient(`geek_t${tier}`, 'Ingrediente Geek', 'geek', tier);
  }

  static createSassy(tier: number = 1): Ingredient {
    return new Ingredient(`sassy_t${tier}`, 'Ingrediente Sassy', 'sassy', tier);
  }

  static createIntelectual(tier: number = 1): Ingredient {
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

  static deserialize(data: any): Ingredient {
    return new Ingredient(
      data.identifier,
      data.name,
      data.personality,
      data.tier,
      data.iconPath
    );
  }
}
