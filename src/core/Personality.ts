// Tipos de personalidad base
export type PersonalityType =
  | 'neutral'
  | 'anxious'
  | 'edgy'
  | 'geek'
  | 'sassy'
  | 'intelectual';

export class Personality {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  static fromType(type: PersonalityType): Personality {
    return new Personality(type);
  }
}
