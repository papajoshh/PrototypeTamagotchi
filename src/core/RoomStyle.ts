import { PersonalityType } from './Personality';

export class RoomStyle {
  identifier: string;
  name: string;
  personality: PersonalityType;
  iconPath: string;

  constructor(
    identifier: string,
    name: string,
    personality: PersonalityType,
    iconPath: string = ''
  ) {
    this.identifier = identifier;
    this.name = name;
    this.personality = personality;
    this.iconPath = iconPath;
  }

  static createDefault(): RoomStyle {
    return new RoomStyle('style1', 'Estilo Básico', 'neutral', '/assets/styles/default.png');
  }

  static createAnxious(): RoomStyle {
    return new RoomStyle('anxious', 'Estilo Anxious', 'anxious', '/assets/styles/anxious.png');
  }

  static createEdgy(): RoomStyle {
    return new RoomStyle('edgy', 'Estilo Edgy', 'edgy', '/assets/styles/edgy.png');
  }

  static createGeek(): RoomStyle {
    return new RoomStyle('geek', 'Estilo Geek', 'geek', '/assets/styles/geek.png');
  }

  static createIntelectual(): RoomStyle {
    return new RoomStyle('intelectual', 'Estilo Intelectual', 'intelectual', '/assets/styles/intelectual.png');
  }

  static createSassy(): RoomStyle {
    return new RoomStyle('sassy', 'Estilo Sassy', 'sassy', '/assets/styles/sassy.png');
  }

  static getAllStyles(): RoomStyle[] {
    return [
      RoomStyle.createDefault(),
      RoomStyle.createAnxious(),
      RoomStyle.createEdgy(),
      RoomStyle.createGeek(),
      RoomStyle.createIntelectual(),
      RoomStyle.createSassy(),
    ];
  }
}
