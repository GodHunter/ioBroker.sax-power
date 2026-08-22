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
var strategyRuntimeConfiguration_exports = {};
__export(strategyRuntimeConfiguration_exports, {
  validateStrategyRuntimeConfiguration: () => validateStrategyRuntimeConfiguration
});
module.exports = __toCommonJS(strategyRuntimeConfiguration_exports);
var import_strategyConfiguration = require("./strategyConfiguration");
function invalid(issues) {
  return Object.freeze({
    valid: false,
    configuration: null,
    issues: Object.freeze([...issues])
  });
}
function validateStrategyRuntimeConfiguration(input) {
  if (typeof input.enabled !== "boolean") {
    return invalid([{ field: "enabled", reason: "invalid-boolean" }]);
  }
  if (!input.enabled) {
    return Object.freeze({
      valid: true,
      configuration: Object.freeze({ enabled: false }),
      issues: Object.freeze([])
    });
  }
  const strategyValidation = (0, import_strategyConfiguration.validateStrategyConfiguration)(input);
  const issues = [
    ...strategyValidation.issues
  ];
  if (typeof input.modbusInstance !== "string" || !/^modbus\.\d+$/.test(input.modbusInstance)) {
    issues.push({ field: "modbusInstance", reason: "invalid-instance" });
  }
  if (typeof input.pvForecastInstance !== "string" || !/^pvforecast\.\d+$/.test(input.pvForecastInstance)) {
    issues.push({
      field: "pvForecastInstance",
      reason: "invalid-instance"
    });
  }
  for (const field of [
    "maximumForecastAgeMs",
    "requestedDischargePowerW",
    "intervalMs"
  ]) {
    const value = input[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push({ field, reason: "invalid-number" });
    } else if (value < 0 || field === "intervalMs" && value === 0) {
      issues.push({ field, reason: "out-of-range" });
    }
  }
  for (const field of [
    "chargingControlEnabled",
    "dayAvailabilityEnabled",
    "nightDischargeEnabled"
  ]) {
    if (typeof input[field] !== "boolean") {
      issues.push({ field, reason: "invalid-boolean" });
    }
  }
  if (input.nightDischargeEnabled === true) {
    issues.push({ field: "nightDischargeEnabled", reason: "unsupported-mode" });
  }
  if (input.chargingControlEnabled === false && input.dayAvailabilityEnabled === false && input.nightDischargeEnabled === false) {
    issues.push({ field: "enabled", reason: "no-mode-enabled" });
  }
  if (!strategyValidation.valid || issues.length > 0) return invalid(issues);
  return Object.freeze({
    valid: true,
    configuration: Object.freeze({
      enabled: true,
      configuration: strategyValidation.configuration,
      modbusInstance: input.modbusInstance,
      pvForecastInstance: input.pvForecastInstance,
      maximumForecastAgeMs: input.maximumForecastAgeMs,
      requestedDischargePowerW: input.requestedDischargePowerW,
      intervalMs: input.intervalMs,
      modes: Object.freeze({
        chargingControlEnabled: input.chargingControlEnabled,
        dayAvailabilityEnabled: input.dayAvailabilityEnabled,
        nightDischargeEnabled: false
      })
    }),
    issues: Object.freeze([])
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validateStrategyRuntimeConfiguration
});
//# sourceMappingURL=strategyRuntimeConfiguration.js.map
