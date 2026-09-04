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
var strategyPlanning_exports = {};
__export(strategyPlanning_exports, {
  createStrategyPlanningDiagnostics: () => createStrategyPlanningDiagnostics
});
module.exports = __toCommonJS(strategyPlanning_exports);
function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}
function createStrategyPlanningDiagnostics(input) {
  const forecastEnergyRemainingWh = input.forecastEnergyRemainingWh !== null && finiteNonNegative(input.forecastEnergyRemainingWh) ? input.forecastEnergyRemainingWh : null;
  const householdEnergyRemainingWh = finiteNonNegative(input.householdEnergyRemainingWh) ? input.householdEnergyRemainingWh : 0;
  const forecastReserveWh = finiteNonNegative(input.forecastReserveWh) ? input.forecastReserveWh : 0;
  return Object.freeze({
    forecastEnergyRemainingWh,
    householdEnergyRemainingWh,
    batteryAvailableEnergyWh: forecastEnergyRemainingWh === null ? null : Math.max(
      0,
      Math.round(
        forecastEnergyRemainingWh - householdEnergyRemainingWh - forecastReserveWh
      )
    ),
    householdLearningApplied: false,
    householdLearningConfidence: input.householdLearningConfidence
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyPlanningDiagnostics
});
//# sourceMappingURL=strategyPlanning.js.map
