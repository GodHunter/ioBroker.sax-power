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
var strategyChargingShadow_exports = {};
__export(strategyChargingShadow_exports, {
  createStrategyChargingShadowDecision: () => createStrategyChargingShadowDecision
});
module.exports = __toCommonJS(strategyChargingShadow_exports);
var import_batteryAnalysis = require("./batteryAnalysis");
const CHARGE_POWER_HEADROOM_FACTOR = 1.25;
const MINIMUM_DAYLIGHT_MS = 6e4;
function invalidDecision(configuration, input) {
  return Object.freeze({
    valid: false,
    reason: "invalid-input",
    currentSocPercent: input.stateOfChargePercent,
    targetSocPercent: configuration.maximumStateOfChargePercent,
    usableCapacityWh: 0,
    energyRequiredWh: 0,
    forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
    forecastReserveWh: configuration.pvForecastReserveWh,
    usableForecastEnergyWh: 0,
    forecastMarginWh: 0,
    remainingDaylightMs: input.remainingDaylightMs,
    requiredAverageChargePowerW: 0,
    shadowChargePowerLimitW: 0,
    maximumChargePowerW: configuration.maximumChargePowerW,
    wouldWriteRegister44: false
  });
}
function roundPower(value) {
  return Math.max(0, Math.round(value));
}
function createStrategyChargingShadowDecision(configuration, input) {
  const model = (0, import_batteryAnalysis.getBatteryModel)(configuration.batteryModelId);
  if (model === null || !Number.isFinite(input.stateOfChargePercent) || input.stateOfChargePercent < 0 || input.stateOfChargePercent > 100 || !Number.isFinite(input.forecastEnergyRemainingWh) || input.forecastEnergyRemainingWh < 0 || !Number.isFinite(input.remainingDaylightMs) || input.remainingDaylightMs < 0) {
    return invalidDecision(configuration, input);
  }
  const usableCapacityWh = model.usableCapacityKwh * 1e3;
  const targetSocPercent = configuration.maximumStateOfChargePercent;
  const socGapPercent = Math.max(
    0,
    targetSocPercent - input.stateOfChargePercent
  );
  const energyRequiredWh = usableCapacityWh * socGapPercent / 100;
  const usableForecastEnergyWh = Math.max(
    0,
    input.forecastEnergyRemainingWh - configuration.pvForecastReserveWh
  );
  const forecastMarginWh = usableForecastEnergyWh - energyRequiredWh;
  const effectiveDaylightMs = Math.max(
    MINIMUM_DAYLIGHT_MS,
    input.remainingDaylightMs
  );
  const remainingHours = effectiveDaylightMs / 36e5;
  const requiredAverageChargePowerW = energyRequiredWh / remainingHours;
  if (energyRequiredWh <= 0) {
    return Object.freeze({
      valid: true,
      reason: "target-soc-reached",
      currentSocPercent: input.stateOfChargePercent,
      targetSocPercent,
      usableCapacityWh,
      energyRequiredWh,
      forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
      forecastReserveWh: configuration.pvForecastReserveWh,
      usableForecastEnergyWh,
      forecastMarginWh,
      remainingDaylightMs: input.remainingDaylightMs,
      requiredAverageChargePowerW: 0,
      shadowChargePowerLimitW: 0,
      maximumChargePowerW: configuration.maximumChargePowerW,
      wouldWriteRegister44: false
    });
  }
  const forecastInsufficient = usableForecastEnergyWh < energyRequiredWh;
  const desiredPowerW = forecastInsufficient ? configuration.maximumChargePowerW : requiredAverageChargePowerW * CHARGE_POWER_HEADROOM_FACTOR;
  const shadowChargePowerLimitW = roundPower(Math.min(
    configuration.maximumChargePowerW,
    desiredPowerW
  ));
  return Object.freeze({
    valid: true,
    reason: forecastInsufficient ? "forecast-insufficient" : "forecast-balanced",
    currentSocPercent: input.stateOfChargePercent,
    targetSocPercent,
    usableCapacityWh,
    energyRequiredWh,
    forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
    forecastReserveWh: configuration.pvForecastReserveWh,
    usableForecastEnergyWh,
    forecastMarginWh,
    remainingDaylightMs: input.remainingDaylightMs,
    requiredAverageChargePowerW: roundPower(requiredAverageChargePowerW),
    shadowChargePowerLimitW,
    maximumChargePowerW: configuration.maximumChargePowerW,
    wouldWriteRegister44: false
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyChargingShadowDecision
});
//# sourceMappingURL=strategyChargingShadow.js.map
