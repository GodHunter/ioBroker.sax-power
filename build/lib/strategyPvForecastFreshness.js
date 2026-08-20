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
var strategyPvForecastFreshness_exports = {};
__export(strategyPvForecastFreshness_exports, {
  assessStrategyPvForecastFreshness: () => assessStrategyPvForecastFreshness
});
module.exports = __toCommonJS(strategyPvForecastFreshness_exports);
function assessStrategyPvForecastFreshness(snapshot, maximumAgeMs) {
  const { createdAt } = snapshot;
  const { lastUpdatedTimestamp } = snapshot.pvForecast;
  if (!Number.isFinite(createdAt) || !Number.isFinite(lastUpdatedTimestamp) || lastUpdatedTimestamp > createdAt || !Number.isFinite(maximumAgeMs) || maximumAgeMs < 0) {
    return null;
  }
  const ageMs = createdAt - lastUpdatedTimestamp;
  return Object.freeze({
    createdAt,
    lastUpdatedTimestamp,
    ageMs,
    maximumAgeMs,
    fresh: ageMs <= maximumAgeMs
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assessStrategyPvForecastFreshness
});
//# sourceMappingURL=strategyPvForecastFreshness.js.map
