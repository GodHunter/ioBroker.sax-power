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
var strategyPvForecastErrorStates_exports = {};
__export(strategyPvForecastErrorStates_exports, {
  STRATEGY_PV_FORECAST_ERROR_STATE_IDS: () => STRATEGY_PV_FORECAST_ERROR_STATE_IDS,
  ensureStrategyPvForecastErrorStates: () => ensureStrategyPvForecastErrorStates,
  publishStrategyPvForecastError: () => publishStrategyPvForecastError
});
module.exports = __toCommonJS(strategyPvForecastErrorStates_exports);
const STRATEGY_PV_FORECAST_ERROR_STATE_IDS = Object.freeze({
  todayForecastWh: "strategy.learning.pvForecast.todayForecastWh",
  todayActualWh: "strategy.learning.pvForecast.todayActualWh",
  todayCoveragePercent: "strategy.learning.pvForecast.todayCoveragePercent",
  todayErrorWh: "strategy.learning.pvForecast.todayErrorWh",
  todayErrorPercent: "strategy.learning.pvForecast.todayErrorPercent",
  todayRatio: "strategy.learning.pvForecast.todayRatio",
  samples: "strategy.learning.pvForecast.samples",
  meanErrorPercent: "strategy.learning.pvForecast.meanErrorPercent",
  medianRatio: "strategy.learning.pvForecast.medianRatio",
  conservativeFactor: "strategy.learning.pvForecast.conservativeFactor",
  confidence: "strategy.learning.pvForecast.confidence",
  lastCompletedDate: "strategy.learning.pvForecast.lastCompletedDate",
  lastUpdate: "strategy.learning.pvForecast.lastUpdate",
  modelSnapshot: "strategy.learning.pvForecast.modelSnapshot"
});
async function ensureStrategyPvForecastErrorStates(adapter) {
  await adapter.extendObjectAsync("strategy.learning", { type: "channel", common: { name: "Strategy learning" }, native: {} });
  await adapter.extendObjectAsync("strategy.learning.pvForecast", { type: "channel", common: { name: "PV forecast error learning" }, native: {} });
  const definitions = [
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayForecastWh, name: "PV forecast captured for today", desc: "Whole-day PV forecast captured at the first valid daylight observation. It remains fixed for the daily comparison.", type: "number", role: "value.energy", unit: "Wh" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayActualWh, name: "Observed PV energy today", desc: "PV energy integrated from the configured actual PV power state during observed daylight time.", type: "number", role: "value.energy", unit: "Wh" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayCoveragePercent, name: "PV observation coverage today", desc: "Share of the daylight window covered by valid PV observations. At least 80 percent is required for a completed learning sample.", type: "number", role: "value", unit: "%" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayErrorWh, name: "PV forecast error today", desc: "Observed PV energy minus captured forecast. Negative means the forecast was too optimistic.", type: "number", role: "value.energy", unit: "Wh" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayErrorPercent, name: "PV forecast error today percent", desc: "Relative PV forecast error. Negative means the forecast was too optimistic.", type: "number", role: "value", unit: "%" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayRatio, name: "PV actual to forecast ratio today", desc: "Observed PV energy divided by the captured forecast for the current day.", type: "number", role: "value" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.samples, name: "PV forecast learning samples", desc: "Number of completed daily forecast-error samples retained by the model.", type: "number", role: "value" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.meanErrorPercent, name: "Mean PV forecast error percent", desc: "Mean relative error across retained completed days.", type: "number", role: "value", unit: "%" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.medianRatio, name: "Median PV forecast ratio", desc: "Median actual-to-forecast ratio across retained completed days.", type: "number", role: "value" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.conservativeFactor, name: "Conservative PV forecast factor", desc: "Observed lower-quartile actual-to-forecast ratio, clipped to 0.5..1.2. Diagnostic only and not yet applied to charging control.", type: "number", role: "value" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.confidence, name: "PV forecast learning confidence", desc: "Learning maturity: none below 3 completed days, learning from 3 days and established from 7 days.", type: "string", role: "text" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.lastCompletedDate, name: "Last completed PV forecast sample", desc: "Local calendar date of the most recently accepted daily sample.", type: "string", role: "text" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.lastUpdate, name: "PV forecast learning last update", desc: "Timestamp of the latest PV forecast learning publication.", type: "number", role: "value.time", unit: "ms" },
    { id: STRATEGY_PV_FORECAST_ERROR_STATE_IDS.modelSnapshot, name: "PV forecast learning model snapshot", desc: "Persistent JSON snapshot containing current-day integration state and retained completed daily samples.", type: "string", role: "json" }
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
async function publishStrategyPvForecastError(adapter, publication) {
  await Promise.all([
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayForecastWh, { val: publication.todayForecastWh, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayActualWh, { val: publication.todayActualWh, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayCoveragePercent, { val: publication.todayCoveragePercent, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayErrorWh, { val: publication.todayErrorWh, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayErrorPercent, { val: publication.todayErrorPercent, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.todayRatio, { val: publication.todayRatio, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.samples, { val: publication.samples, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.meanErrorPercent, { val: publication.meanErrorPercent, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.medianRatio, { val: publication.medianRatio, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.conservativeFactor, { val: publication.conservativeFactor, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.confidence, { val: publication.confidence, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.lastCompletedDate, { val: publication.lastCompletedDate, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.lastUpdate, { val: publication.lastUpdate, ack: true }),
    adapter.setStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.modelSnapshot, { val: publication.modelSnapshot, ack: true })
  ]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_PV_FORECAST_ERROR_STATE_IDS,
  ensureStrategyPvForecastErrorStates,
  publishStrategyPvForecastError
});
//# sourceMappingURL=strategyPvForecastErrorStates.js.map
