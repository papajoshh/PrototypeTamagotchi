export class Personality {
    constructor(name) {
        this.name = name;
    }
    static fromType(type) {
        return new Personality(type);
    }
}
