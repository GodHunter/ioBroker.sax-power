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
var strategyIoBrokerPvForecastErrorCycle_exports = {};
__export(strategyIoBrokerPvForecastErrorCycle_exports, {
  createStrategyIoBrokerPvForecastErrorCycle: () => createStrategyIoBrokerPvForecastErrorCycle
});
module.exports = __toCommonJS(strategyIoBrokerPvForecastErrorCycle_exports);
var import_strategyPvForecastErrorLearning = require("./strategyPvForecastErrorLearning");
var import_strategyPvForecastErrorStates = require("./strategyPvForecastErrorStates");
const MAXIMUM_PV_INPUT_AGE_MS = 12e4;
function numericFreshValue(state, nowMs) {
  if (state == null || typeof state.val !== "number" || !Number.isFinite(state.val)) return null;
  if (state.q !== void 0 && state.q !== 0) return null;
  if (state.ack !== true) return null;
  if (!Number.isFinite(state.ts) || nowMs - state.ts > MAXIMUM_PV_INPUT_AGE_MS) return null;
  return state.val;
}
function numericValue(state) {
  if (state == null || typeof state.val !== "number" || !Number.isFinite(state.val)) return null;
  if (state.q !== void 0 && state.q !== 0) return null;
  if (state.ack !== true) return null;
  return state.val;
}
function parseSnapshot(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed.version !== 1 || !Array.isArray(parsed.samples)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function createStrategyIoBrokerPvForecastErrorCycle(adapter, configuration) {
  let model = null;
  async function loadModel() {
    if (model !== null) return model;
    const state = await adapter.getStateAsync(import_strategyPvForecastErrorStates.STRATEGY_PV_FORECAST_ERROR_STATE_IDS.modelSnapshot);
    model = new import_strategyPvForecastErrorLearning.StrategyPvForecastErrorModel(parseSnapshot(state == null ? void 0 : state.val));
    return model;
  }
  return Object.freeze({
    runOnce: async (nowMs, daylightStartsAt, daylightEndsAt) => {
      if (!configuration.enabled || configuration.pvPowerStateId === null) return;
      const activeModel = await loadModel();
      const [pvState, forecastState] = await Promise.all([
        adapter.getForeignStateAsync(configuration.pvPowerStateId),
        adapter.getForeignStateAsync(configuration.forecastTodayStateId)
      ]);
      const pvPowerW = numericFreshValue(pvState, nowMs);
      const forecastTodayWh = numericValue(forecastState);
      if (pvPowerW !== null && forecastTodayWh !== null) {
        activeModel.observe({
          nowMs,
          pvPowerW,
          forecastTodayWh,
          daylightStartsAt,
          daylightEndsAt
        });
      }
      activeModel.finalizeIfPastDaylight(nowMs);
      const status = activeModel.status();
      await (0, import_strategyPvForecastErrorStates.publishStrategyPvForecastError)(adapter, {
        ...status,
        lastUpdate: nowMs,
        modelSnapshot: JSON.stringify(activeModel.snapshot())
      });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyIoBrokerPvForecastErrorCycle
});
//# sourceMappingURL=strategyIoBrokerPvForecastErrorCycle.js.map
