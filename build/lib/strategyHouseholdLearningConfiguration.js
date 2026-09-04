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
var strategyHouseholdLearningConfiguration_exports = {};
__export(strategyHouseholdLearningConfiguration_exports, {
  validateStrategyHouseholdLearningConfiguration: () => validateStrategyHouseholdLearningConfiguration
});
module.exports = __toCommonJS(strategyHouseholdLearningConfiguration_exports);
function validateStrategyHouseholdLearningConfiguration(input) {
  const issues = [];
  if (typeof input.enabled !== "boolean") {
    issues.push({ field: "enabled", reason: "invalid-boolean" });
  }
  if (input.pvPowerSourceMode !== "state" && input.pvPowerSourceMode !== "none") {
    issues.push({ field: "pvPowerSourceMode", reason: "invalid-source" });
  }
  let pvPowerStateId = null;
  if (input.pvPowerSourceMode === "state") {
    if (typeof input.pvPowerStateId !== "string" || input.pvPowerStateId.trim().length === 0) {
      issues.push({ field: "pvPowerStateId", reason: "invalid-state-id" });
    } else {
      pvPowerStateId = input.pvPowerStateId.trim();
    }
  }
  let pvNominalPowerWp = null;
  if (input.pvNominalPowerWp !== void 0 && input.pvNominalPowerWp !== null && input.pvNominalPowerWp !== "") {
    if (typeof input.pvNominalPowerWp !== "number" || !Number.isFinite(input.pvNominalPowerWp)) {
      issues.push({ field: "pvNominalPowerWp", reason: "invalid-number" });
    } else if (input.pvNominalPowerWp <= 0) {
      issues.push({ field: "pvNominalPowerWp", reason: "out-of-range" });
    } else {
      pvNominalPowerWp = input.pvNominalPowerWp;
    }
  }
  if (issues.length > 0) {
    return Object.freeze({
      valid: false,
      configuration: null,
      issues: Object.freeze(issues)
    });
  }
  return Object.freeze({
    valid: true,
    configuration: Object.freeze({
      enabled: input.enabled,
      pvPowerSourceMode: input.pvPowerSourceMode,
      pvPowerStateId,
      pvNominalPowerWp
    }),
    issues: Object.freeze([])
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validateStrategyHouseholdLearningConfiguration
});
//# sourceMappingURL=strategyHouseholdLearningConfiguration.js.map
