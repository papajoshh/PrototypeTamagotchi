export class RoomStyle {
    constructor(identifier, name, personality, iconPath = '') {
        this.identifier = identifier;
        this.name = name;
        this.personality = personality;
        this.iconPath = iconPath;
    }
    static createDefault() {
        return new RoomStyle('style1', 'Estilo Básico', 'neutral', '/assets/styles/default.png');
    }
    static createAnxious() {
        return new RoomStyle('anxious', 'Estilo Anxious', 'anxious', '/assets/styles/anxious.png');
    }
    static createEdgy() {
        return new RoomStyle('edgy', 'Estilo Edgy', 'edgy', '/assets/styles/edgy.png');
    }
    static createGeek() {
        return new RoomStyle('geek', 'Estilo Geek', 'geek', '/assets/styles/geek.png');
    }
    static createIntelectual() {
        return new RoomStyle('intelectual', 'Estilo Intelectual', 'intelectual', '/assets/styles/intelectual.png');
    }
    static createSassy() {
        return new RoomStyle('sassy', 'Estilo Sassy', 'sassy', '/assets/styles/sassy.png');
    }
    static getAllStyles() {
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
