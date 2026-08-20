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
var strategyConfiguration_exports = {};
__export(strategyConfiguration_exports, {
  validateStrategyConfiguration: () => validateStrategyConfiguration
});
module.exports = __toCommonJS(strategyConfiguration_exports);
var import_batteryAnalysis = require("./batteryAnalysis");
var import_strategyBatteryChargeCapability = require("./strategyBatteryChargeCapability");
const NUMERIC_CONSTRAINTS = {
  minimumStateOfChargePercent: { minimum: 0, maximum: 100 },
  maximumStateOfChargePercent: { minimum: 0, maximum: 100 },
  maximumChargePowerW: { minimum: 0 },
  maximumDischargePowerW: { minimum: 0 },
  pvForecastReserveWh: { minimum: 0 }
};
function validateNumber(field, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { field, reason: "invalid-number" };
  }
  const constraint = NUMERIC_CONSTRAINTS[field];
  if (value < constraint.minimum || constraint.maximum !== void 0 && value > constraint.maximum) {
    return { field, reason: "out-of-range" };
  }
  return null;
}
function validateStrategyConfiguration(input) {
  const fields = Object.keys(NUMERIC_CONSTRAINTS);
  const issues = fields.map((field) => validateNumber(field, input[field])).filter((issue) => issue !== null);
  if (input.batteryModelId !== "home-5.8" && input.batteryModelId !== "home-plus-7.7") {
    issues.unshift({ field: "batteryModelId", reason: "invalid-model" });
  }
  const batteryModel = typeof input.batteryModelId === "string" ? (0, import_batteryAnalysis.getBatteryModel)(input.batteryModelId) : null;
  const technicalLimits = batteryModel === null ? null : (0, import_strategyBatteryChargeCapability.resolveStrategyBatteryTechnicalLimits)(batteryModel);
  if (technicalLimits !== null) {
    if (typeof input.maximumChargePowerW === "number" && Number.isFinite(input.maximumChargePowerW) && input.maximumChargePowerW > technicalLimits.maximumChargePowerW) {
      issues.push({
        field: "maximumChargePowerW",
        reason: "exceeds-model-limit"
      });
    }
    if (typeof input.maximumDischargePowerW === "number" && Number.isFinite(input.maximumDischargePowerW) && input.maximumDischargePowerW > technicalLimits.maximumDischargePowerW) {
      issues.push({
        field: "maximumDischargePowerW",
        reason: "exceeds-model-limit"
      });
    }
  }
  if (issues.length === 0 && input.minimumStateOfChargePercent >= input.maximumStateOfChargePercent) {
    issues.push({
      field: "maximumStateOfChargePercent",
      reason: "invalid-order"
    });
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
      batteryModelId: input.batteryModelId,
      minimumStateOfChargePercent: input.minimumStateOfChargePercent,
      maximumStateOfChargePercent: input.maximumStateOfChargePercent,
      maximumChargePowerW: input.maximumChargePowerW,
      maximumDischargePowerW: input.maximumDischargePowerW,
      pvForecastReserveWh: input.pvForecastReserveWh
    }),
    issues: Object.freeze([])
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validateStrategyConfiguration
});
//# sourceMappingURL=strategyConfiguration.js.map
