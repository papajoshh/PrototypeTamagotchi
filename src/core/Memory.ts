export type MemoryType = 'food' | 'minigame' | 'decoration';

export class Memory {
  type: MemoryType;
  personality: string;
  timestamp: number;

  constructor(type: MemoryType, personality: string) {
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

  static deserialize(data: any): Memory {
    const memory = new Memory(data.type, data.personality);
    memory.timestamp = data.timestamp;
    return memory;
  }
}
