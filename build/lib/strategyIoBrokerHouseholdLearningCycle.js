"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var strategyIoBrokerHouseholdLearningCycle_exports = {};
__export(strategyIoBrokerHouseholdLearningCycle_exports, {
  createStrategyIoBrokerHouseholdLearningCycle: () => createStrategyIoBrokerHouseholdLearningCycle
});
module.exports = __toCommonJS(strategyIoBrokerHouseholdLearningCycle_exports);
var import_strategyHouseholdLoadObservation = require("./strategyHouseholdLoadObservation");
var import_strategyHouseholdLoadCollector = require("./strategyHouseholdLoadCollector");
var import_strategyHouseholdLoadModel = require("./strategyHouseholdLoadModel");
var import_strategyHouseholdLearningStates = require("./strategyHouseholdLearningStates");
var import_strategyPlanning = require("./strategyPlanning");
var import_strategyPlanningStates = require("./strategyPlanningStates");
const MAXIMUM_INPUT_AGE_MS = 12e4;
function numericFreshValue(state, nowMs) {
  if (state === null || state === void 0) return null;
  if (typeof state.val !== "number" || !Number.isFinite(state.val)) return null;
  if (state.q !== void 0 && state.q !== 0) return null;
  if (state.ack !== true) return null;
  if (!Number.isFinite(state.ts) || nowMs - state.ts > MAXIMUM_INPUT_AGE_MS) return null;
  return state.val;
}
function numericValue(state) {
  if (state === null || state === void 0) return null;
  if (typeof state.val !== "number" || !Number.isFinite(state.val)) return null;
  if (state.q !== void 0 && state.q !== 0) return null;
  if (state.ack !== true) return null;
  return state.val;
}
function parseSnapshot(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed.version !== 1 || !Array.isArray(parsed.slots)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function expectedPowerW(expectedWh) {
  return Math.round(expectedWh * 4);
}
function createStrategyIoBrokerHouseholdLearningCycle(adapter, configuration) {
  const collector = new import_strategyHouseholdLoadCollector.StrategyHouseholdLoadCollector();
  let model = null;
  async function loadModel() {
    if (model !== null) return model;
    const state = await adapter.getStateAsync(import_strategyHouseholdLearningStates.STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.modelSnapshot);
    model = new import_strategyHouseholdLoadModel.StrategyHouseholdLoadModel(parseSnapshot(state == null ? void 0 : state.val));
    return model;
  }
  return Object.freeze({
    runOnce: async (nowMs = Date.now(), untilMs = nowMs) => {
      var _a;
      if (!configuration.enabled) return;
      const activeModel = await loadModel();
      let currentPowerW = null;
      let source = "unavailable";
      if (configuration.pvPowerStateId !== null) {
        const [pvState, batteryState, gridState] = await Promise.all([
          adapter.getForeignStateAsync(configuration.pvPowerStateId),
          adapter.getForeignStateAsync(configuration.batteryPowerStateId),
          adapter.getForeignStateAsync(configuration.gridPowerStateId)
        ]);
        const pvPowerW = numericFreshValue(pvState, nowMs);
        const batteryPowerW = numericFreshValue(batteryState, nowMs);
        const gridPowerW = numericFreshValue(gridState, nowMs);
        if (pvPowerW !== null && batteryPowerW !== null && gridPowerW !== null) {
          const observation = (0, import_strategyHouseholdLoadObservation.createStrategyHouseholdLoadObservation)({
            pvPowerW,
            gridPowerW,
            batteryPowerW
          });
          const observedPowerW = observation.householdPowerW;
          if (observation.available && observedPowerW !== null) {
            currentPowerW = observedPowerW;
            source = "pv-grid-battery";
            const completed = collector.addObservation(nowMs, observedPowerW);
            if (completed !== null) {
              activeModel.addObservation(completed.timestampMs, completed.averagePowerW);
            }
          }
        }
      }
      const status = activeModel.status(new Date(nowMs), new Date(Math.max(nowMs, untilMs)));
      await (0, import_strategyHouseholdLearningStates.publishStrategyHouseholdLearning)(adapter, {
        currentPowerW,
        expectedPowerW: status.current.available ? expectedPowerW(status.current.expectedWh) : null,
        expectedRemainingEnergyWh: status.expectedRemainingEnergyWh,
        totalSamples: status.totalSamples,
        confidence: status.confidence,
        source,
        lastUpdate: nowMs,
        modelSnapshot: JSON.stringify(activeModel.snapshot())
      });
      const forecastState = configuration.pvForecastEnergyStateId === void 0 ? null : await adapter.getForeignStateAsync(configuration.pvForecastEnergyStateId);
      const planning = (0, import_strategyPlanning.createStrategyPlanningDiagnostics)({
        forecastEnergyRemainingWh: numericValue(forecastState),
        householdEnergyRemainingWh: status.expectedRemainingEnergyWh,
        forecastReserveWh: (_a = configuration.forecastReserveWh) != null ? _a : 0,
        householdLearningConfidence: status.confidence
      });
      await (0, import_strategyPlanningStates.publishStrategyPlanning)(adapter, {
        ...planning,
        lastUpdate: nowMs
      });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyIoBrokerHouseholdLearningCycle
});
//# sourceMappingURL=strategyIoBrokerHouseholdLearningCycle.js.map
