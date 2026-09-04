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
var strategyHouseholdLoadObservation_exports = {};
__export(strategyHouseholdLoadObservation_exports, {
  createStrategyHouseholdLoadObservation: () => createStrategyHouseholdLoadObservation
});
module.exports = __toCommonJS(strategyHouseholdLoadObservation_exports);
function createStrategyHouseholdLoadObservation(input) {
  if (!Number.isFinite(input.gridPowerW) || !Number.isFinite(input.batteryPowerW) || input.pvPowerW === null || !Number.isFinite(input.pvPowerW) || input.pvPowerW < 0) {
    return Object.freeze({
      available: false,
      householdPowerW: null,
      source: "unavailable"
    });
  }
  const householdPowerW = Math.max(
    0,
    Math.round(input.pvPowerW + input.gridPowerW + input.batteryPowerW)
  );
  return Object.freeze({
    available: true,
    householdPowerW,
    source: "pv-grid-battery"
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyHouseholdLoadObservation
});
//# sourceMappingURL=strategyHouseholdLoadObservation.js.map
