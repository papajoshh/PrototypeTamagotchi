import { LifeStage } from './LifeStage';
// Tiempo hasta enfermedad después de caca (según CSV)
const TIME_TO_ILLNESS = {
    [LifeStage.Egg]: 0,
    [LifeStage.Baby]: 600, // 10 min
    [LifeStage.Child]: 3600, // 60 min
    [LifeStage.Young]: 5400, // 90 min
    [LifeStage.Adult]: 5400, // 90 min
    [LifeStage.ReadyToAscend]: 5400,
    [LifeStage.Dead]: 0,
};
// Tiempos de caca por etapa (min-max en segundos)
// Según ~Docs/Diseño Notion/Diseño - Tiempos (1).csv
const POOP_TIME_RANGES = {
    [LifeStage.Egg]: { min: 0, max: 0 },
    [LifeStage.Baby]: { min: 1500, max: 3000 }, // 25-50 min
    [LifeStage.Child]: { min: 4500, max: 9000 }, // 75-150 min
    [LifeStage.Young]: { min: 6600, max: 13200 }, // 110-220 min
    [LifeStage.Adult]: { min: 6600, max: 13200 }, // 110-220 min
    [LifeStage.ReadyToAscend]: { min: 6600, max: 13200 },
    [LifeStage.Dead]: { min: 0, max: 0 },
};
export class Poop {
    constructor() {
        this.hasPooped = false;
        this.timeUntilPoop = 0;
        this.timeSincePoop = 0;
        this.currentStage = LifeStage.Baby;
    }
    update(deltaTime) {
        // Countdown hasta aparecer caca
        if (!this.hasPooped && this.timeUntilPoop > 0) {
            this.timeUntilPoop -= deltaTime;
            if (this.timeUntilPoop <= 0) {
                this.hasPooped = true;
            }
        }
        // Timer desde que apareció la caca
        if (this.hasPooped) {
            this.timeSincePoop += deltaTime;
        }
    }
    // Programar caca después de comer (con stage)
    scheduleAfterFeeding(stage) {
        this.currentStage = stage;
        const range = POOP_TIME_RANGES[stage];
        this.timeUntilPoop = range.min + Math.random() * (range.max - range.min);
    }
    clean() {
        this.hasPooped = false;
        this.timeSincePoop = 0;
    }
    // Debug: Forzar caca inmediatamente
    forcePoop() {
        this.hasPooped = true;
        this.timeSincePoop = 0;
        this.timeUntilPoop = 0;
    }
    // Resetear completamente el sistema de caca
    reset() {
        this.hasPooped = false;
        this.timeSincePoop = 0;
        this.timeUntilPoop = 0;
    }
    hasPoopedNow() {
        return this.hasPooped;
    }
    shouldTriggerIllness() {
        return this.hasPooped && this.timeSincePoop >= TIME_TO_ILLNESS[this.currentStage];
    }
    serialize() {
        return {
            hasPooped: this.hasPooped,
            timeUntilPoop: this.timeUntilPoop,
            timeSincePoop: this.timeSincePoop,
            currentStage: this.currentStage,
        };
    }
    deserialize(data) {
        this.hasPooped = data.hasPooped;
        this.timeUntilPoop = data.timeUntilPoop;
        this.timeSincePoop = data.timeSincePoop;
        if (data.currentStage !== undefined) {
            this.currentStage = data.currentStage;
        }
    }
}
