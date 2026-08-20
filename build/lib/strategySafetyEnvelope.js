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
var strategySafetyEnvelope_exports = {};
__export(strategySafetyEnvelope_exports, {
  createStrategySafetyEnvelope: () => createStrategySafetyEnvelope
});
module.exports = __toCommonJS(strategySafetyEnvelope_exports);
var import_batteryAnalysis = require("./batteryAnalysis");
var import_strategyBatteryChargeCapability = require("./strategyBatteryChargeCapability");
function energyAtStateOfCharge(batteryCapacityWh, stateOfChargePercent) {
  return batteryCapacityWh * stateOfChargePercent / 100;
}
function createStrategySafetyEnvelope(snapshot, configuration) {
  const stateOfChargePercent = snapshot.modbus.stateOfChargePercent;
  const batteryModel = (0, import_batteryAnalysis.getBatteryModel)(configuration.batteryModelId);
  const technicalLimits = batteryModel === null ? null : (0, import_strategyBatteryChargeCapability.resolveStrategyBatteryTechnicalLimits)(batteryModel);
  if (technicalLimits === null || !Number.isFinite(snapshot.createdAt) || !Number.isFinite(stateOfChargePercent) || stateOfChargePercent < 0 || stateOfChargePercent > 100 || !Number.isFinite(configuration.maximumChargePowerW) || configuration.maximumChargePowerW < 0 || configuration.maximumChargePowerW > technicalLimits.maximumChargePowerW || !Number.isFinite(configuration.maximumDischargePowerW) || configuration.maximumDischargePowerW < 0 || configuration.maximumDischargePowerW > technicalLimits.maximumDischargePowerW) {
    return null;
  }
  const storedEnergyWh = energyAtStateOfCharge(
    technicalLimits.usableCapacityWh,
    stateOfChargePercent
  );
  const minimumStoredEnergyWh = energyAtStateOfCharge(
    technicalLimits.usableCapacityWh,
    configuration.minimumStateOfChargePercent
  );
  const maximumStoredEnergyWh = energyAtStateOfCharge(
    technicalLimits.usableCapacityWh,
    configuration.maximumStateOfChargePercent
  );
  const availableChargeEnergyWh = Math.max(
    0,
    maximumStoredEnergyWh - storedEnergyWh
  );
  const availableDischargeEnergyWh = Math.max(
    0,
    storedEnergyWh - minimumStoredEnergyWh
  );
  return Object.freeze({
    createdAt: snapshot.createdAt,
    stateOfChargePercent,
    storedEnergyWh,
    minimumStoredEnergyWh,
    maximumStoredEnergyWh,
    availableChargeEnergyWh,
    availableDischargeEnergyWh,
    maximumChargePowerW: availableChargeEnergyWh > 0 ? configuration.maximumChargePowerW : 0,
    maximumDischargePowerW: availableDischargeEnergyWh > 0 ? configuration.maximumDischargePowerW : 0
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategySafetyEnvelope
});
//# sourceMappingURL=strategySafetyEnvelope.js.map
