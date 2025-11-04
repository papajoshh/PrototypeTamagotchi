export class Memory {
    constructor(type, personality) {
        this.type = type;
        this.personality = personality;
        this.timestamp = Date.now();
    }
    serialize() {
        return {
            type: this.type,
            personality: this.personality,
            timestamp: this.timestamp,
        };
    }
    static deserialize(data) {
        const memory = new Memory(data.type, data.personality);
        memory.timestamp = data.timestamp;
        return memory;
    }
}
