export enum LifeStage {
  Egg = 0,
  Baby = 1,
  Child = 2,
  Young = 3,
  Adult = 4,
  ReadyToAscend = 5,
  Dead = 6
}

// Tiempos de crecimiento por etapa (en segundos)
// Según ~Docs/Diseño Notion/Diseño - Tiempos (1).csv
export const GROWTH_THRESHOLDS: Record<LifeStage, number> = {
  [LifeStage.Egg]: 0,      // Tap manual para nacer
  [LifeStage.Baby]: 3600,   // 60 min
  [LifeStage.Child]: 18000, // 300 min
  [LifeStage.Young]: 32400, // 540 min
  [LifeStage.Adult]: 32400, // 540 min
  [LifeStage.ReadyToAscend]: 0, // No evoluciona más
  [LifeStage.Dead]: 0       // No evoluciona
};
