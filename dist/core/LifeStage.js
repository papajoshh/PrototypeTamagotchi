export var LifeStage;
(function (LifeStage) {
    LifeStage[LifeStage["Egg"] = 0] = "Egg";
    LifeStage[LifeStage["Baby"] = 1] = "Baby";
    LifeStage[LifeStage["Child"] = 2] = "Child";
    LifeStage[LifeStage["Young"] = 3] = "Young";
    LifeStage[LifeStage["Adult"] = 4] = "Adult";
    LifeStage[LifeStage["ReadyToAscend"] = 5] = "ReadyToAscend";
    LifeStage[LifeStage["Dead"] = 6] = "Dead";
})(LifeStage || (LifeStage = {}));
// Tiempos de crecimiento por etapa (en segundos)
// Según ~Docs/Diseño Notion/Diseño - Tiempos (1).csv
export const GROWTH_THRESHOLDS = {
    [LifeStage.Egg]: 0, // Tap manual para nacer
    [LifeStage.Baby]: 3600, // 60 min
    [LifeStage.Child]: 18000, // 300 min
    [LifeStage.Young]: 32400, // 540 min
    [LifeStage.Adult]: 32400, // 540 min
};
