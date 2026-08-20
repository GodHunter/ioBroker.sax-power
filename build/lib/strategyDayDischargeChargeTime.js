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
var strategyDayDischargeChargeTime_exports = {};
__export(strategyDayDischargeChargeTime_exports, {
  assessStrategyDayDischargeChargeTime: () => assessStrategyDayDischargeChargeTime
});
module.exports = __toCommonJS(strategyDayDischargeChargeTime_exports);
var import_batteryAnalysis = require("./batteryAnalysis");
var import_strategyBatteryChargeCapability = require("./strategyBatteryChargeCapability");
function assessStrategyDayDischargeChargeTime(safetyEnvelope, pvEnergyBudget, configuration, daylightWindowEndsAt) {
  const { createdAt, stateOfChargePercent } = safetyEnvelope;
  const model = (0, import_batteryAnalysis.getBatteryModel)(configuration.batteryModelId);
  const technicalLimits = model === null ? null : (0, import_strategyBatteryChargeCapability.resolveStrategyBatteryTechnicalLimits)(model);
  if (model === null || technicalLimits === null || !Number.isFinite(createdAt) || pvEnergyBudget.createdAt !== createdAt || !Number.isFinite(daylightWindowEndsAt) || !Number.isFinite(stateOfChargePercent) || stateOfChargePercent < 0 || stateOfChargePercent > 100 || !Number.isFinite(pvEnergyBudget.permittedDayDischargeEnergyWh) || pvEnergyBudget.permittedDayDischargeEnergyWh < 0) {
    return null;
  }
  const projectedDischargePercent = pvEnergyBudget.permittedDayDischargeEnergyWh / technicalLimits.usableCapacityWh * 100;
  const projectedStateOfChargePercent = Math.max(
    configuration.minimumStateOfChargePercent,
    stateOfChargePercent - projectedDischargePercent
  );
  const chargeDurationEstimate = (0, import_strategyBatteryChargeCapability.estimateStrategyChargeDuration)(
    model,
    projectedStateOfChargePercent,
    configuration.maximumStateOfChargePercent,
    configuration.maximumChargePowerW
  );
  if (chargeDurationEstimate === null) {
    return null;
  }
  const remainingDaylightSeconds = Math.max(
    0,
    (daylightWindowEndsAt - createdAt) / 1e3
  );
  return Object.freeze({
    createdAt,
    daylightWindowEndsAt,
    remainingDaylightSeconds,
    projectedStateOfChargePercent,
    chargeDurationEstimate,
    sufficient: chargeDurationEstimate.estimatedDurationSeconds <= remainingDaylightSeconds
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assessStrategyDayDischargeChargeTime
});
//# sourceMappingURL=strategyDayDischargeChargeTime.js.map
