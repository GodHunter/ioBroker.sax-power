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
var strategyHouseholdLearningStates_exports = {};
__export(strategyHouseholdLearningStates_exports, {
  STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS: () => STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS,
  ensureStrategyHouseholdLearningStates: () => ensureStrategyHouseholdLearningStates,
  publishStrategyHouseholdLearning: () => publishStrategyHouseholdLearning
});
module.exports = __toCommonJS(strategyHouseholdLearningStates_exports);
const STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS = Object.freeze({
  currentPowerW: "strategy.learning.household.currentPowerW",
  expectedPowerW: "strategy.learning.household.expectedPowerW",
  expectedRemainingEnergyWh: "strategy.learning.household.expectedRemainingEnergyWh",
  totalSamples: "strategy.learning.household.samples",
  confidence: "strategy.learning.household.confidence",
  source: "strategy.learning.household.source",
  lastUpdate: "strategy.learning.household.lastUpdate",
  modelSnapshot: "strategy.learning.household.modelSnapshot"
});
async function ensureStrategyHouseholdLearningStates(adapter) {
  await adapter.extendObjectAsync("strategy.learning", {
    type: "channel",
    common: { name: "Strategy learning" },
    native: {}
  });
  await adapter.extendObjectAsync("strategy.learning.household", {
    type: "channel",
    common: { name: "Household load learning" },
    native: {}
  });
  const definitions = [
    { id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.currentPowerW, name: "Current household power", desc: "Household power derived from PV, grid and battery flows when an actual PV power state is available.", type: "number", role: "value.power", unit: "W" },
    { id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedPowerW, name: "Expected household power", desc: "Learned expected household power for the current 15 minute time slot.", type: "number", role: "value.power", unit: "W" },
    { id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedRemainingEnergyWh, name: "Expected remaining household energy", desc: "Learned household energy expected for the remaining planning window.", type: "number", role: "value.energy", unit: "Wh" },
    { id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.totalSamples, name: "Household learning samples", desc: "Number of observations retained by the household load model.", type: "number", role: "value" },
    { id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.confidence, name: "Household learning confidence", desc: "Learning maturity of the current household load profile.", type: "string", role: "text" },
    { id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.source, name: "Household load source", desc: "Measurement basis used for the current household load observation.", type: "string", role: "text" },
    { id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.lastUpdate, name: "Household learning last update", desc: "Timestamp of the latest household learning publication.", type: "number", role: "value.time", unit: "ms" },
    { id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.modelSnapshot, name: "Household learning model snapshot", desc: "Persistent compact JSON snapshot of the learned household load model.", type: "string", role: "json" }
  ];
  for (const definition of definitions) {
    await adapter.extendObjectAsync(definition.id, {
      type: "state",
      common: {
        name: definition.name,
        desc: definition.desc,
        type: definition.type,
        role: definition.role,
        read: true,
        write: false,
        ...definition.unit === void 0 ? {} : { unit: definition.unit }
      },
      native: {}
    });
  }
}
async function publishStrategyHouseholdLearning(adapter, publication) {
  await Promise.all([
    adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.currentPowerW, { val: publication.currentPowerW, ack: true }),
    adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedPowerW, { val: publication.expectedPowerW, ack: true }),
    adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedRemainingEnergyWh, { val: publication.expectedRemainingEnergyWh, ack: true }),
    adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.totalSamples, { val: publication.totalSamples, ack: true }),
    adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.confidence, { val: publication.confidence, ack: true }),
    adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.source, { val: publication.source, ack: true }),
    adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.lastUpdate, { val: publication.lastUpdate, ack: true }),
    adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.modelSnapshot, { val: publication.modelSnapshot, ack: true })
  ]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS,
  ensureStrategyHouseholdLearningStates,
  publishStrategyHouseholdLearning
});
//# sourceMappingURL=strategyHouseholdLearningStates.js.map
