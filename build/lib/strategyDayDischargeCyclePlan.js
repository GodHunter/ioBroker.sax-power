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
var strategyDayDischargeCyclePlan_exports = {};
__export(strategyDayDischargeCyclePlan_exports, {
  createStrategyDayDischargeCyclePlan: () => createStrategyDayDischargeCyclePlan
});
module.exports = __toCommonJS(strategyDayDischargeCyclePlan_exports);
var import_strategyDayDischargeEvaluation = require("./strategyDayDischargeEvaluation");
function createStrategyDayDischargeCyclePlan(snapshot, configuration, maximumForecastAgeMs, requestedDischargePowerW, daylightWindowStartsAt, daylightWindowEndsAt) {
  const evaluation = (0, import_strategyDayDischargeEvaluation.createStrategyDayDischargeEvaluation)(
    snapshot,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    daylightWindowStartsAt,
    daylightWindowEndsAt
  );
  if (evaluation === null) {
    return null;
  }
  return Object.freeze({
    createdAt: evaluation.createdAt,
    evaluation
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyDayDischargeCyclePlan
});
//# sourceMappingURL=strategyDayDischargeCyclePlan.js.map
