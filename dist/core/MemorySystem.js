import { Memory } from './Memory';
/**
 * Sistema de recuerdos con selección ponderada por frecuencia
 */
export class MemorySystem {
    constructor() {
        this.memories = [];
    }
    addMemory(type, personality) {
        this.memories.push(new Memory(type, personality));
        console.log(`[Memory] Added ${type} memory: ${personality} (total: ${this.memories.length})`);
    }
    getMemories() {
        return [...this.memories];
    }
    getMemoryCount() {
        return this.memories.length;
    }
    // Selección ponderada: cuanto más repetido, más probabilidad
    selectDominantMemory() {
        if (this.memories.length === 0)
            return null;
        // Contar frecuencia de cada personalidad
        const frequency = new Map();
        this.memories.forEach(m => {
            const count = frequency.get(m.personality) || 0;
            frequency.set(m.personality, count + 1);
        });
        // Selección ponderada
        const totalMemories = this.memories.length;
        const random = Math.random();
        let accumulated = 0;
        for (const [personality, count] of frequency.entries()) {
            const probability = count / totalMemories;
            accumulated += probability;
            if (random <= accumulated) {
                console.log(`[Memory] Selected dominant: ${personality} (${count}/${totalMemories} = ${(probability * 100).toFixed(1)}%)`);
                return personality;
            }
        }
        // Fallback (no debería llegar aquí)
        return this.memories[Math.floor(Math.random() * this.memories.length)].personality;
    }
    // Obtener distribución de probabilidades (para UI)
    getMemoryDistribution() {
        const frequency = new Map();
        this.memories.forEach(m => {
            const count = frequency.get(m.personality) || 0;
            frequency.set(m.personality, count + 1);
        });
        const distribution = new Map();
        const total = this.memories.length;
        frequency.forEach((count, personality) => {
            distribution.set(personality, (count / total) * 100);
        });
        return distribution;
    }
    // Olvidar todos los recuerdos (al evolucionar)
    forgetAll() {
        console.log(`[Memory] Forgetting ${this.memories.length} memories`);
        this.memories = [];
    }
    serialize() {
        return this.memories.map(m => m.serialize());
    }
    deserialize(data) {
        this.memories = data.map(m => Memory.deserialize(m));
    }
}
