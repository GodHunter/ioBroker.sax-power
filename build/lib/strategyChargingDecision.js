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
var strategyChargingDecision_exports = {};
__export(strategyChargingDecision_exports, {
  createStrategyChargingDecision: () => createStrategyChargingDecision
});
module.exports = __toCommonJS(strategyChargingDecision_exports);
var import_batteryAnalysis = require("./batteryAnalysis");
const CHARGE_POWER_HEADROOM_FACTOR = 1.25;
const TRAJECTORY_RECOVERY_HEADROOM_FACTOR = 1.15;
const TRAJECTORY_CORRIDOR_PERCENT = 3;
const TRAJECTORY_RECOVERY_WINDOW_MS = 2 * 60 * 60 * 1e3;
const TARGET_COMPLETION_BUFFER_MS = 60 * 60 * 1e3;
const MINIMUM_DAYLIGHT_MS = 6e4;
function roundPower(value) {
  return Math.max(0, Math.round(value));
}
function trajectory(configuration, input) {
  var _a, _b;
  const minimumSoc = configuration.minimumStateOfChargePercent;
  const targetSoc = configuration.maximumStateOfChargePercent;
  const totalDaylightMs = (_a = input.totalDaylightMs) != null ? _a : 0;
  const elapsedDaylightMs = (_b = input.elapsedDaylightMs) != null ? _b : 0;
  const progress = totalDaylightMs > 0 ? Math.max(0, Math.min(1, elapsedDaylightMs / totalDaylightMs)) : 0;
  const shapedProgress = Math.pow(progress, 0.85);
  const plannedSocPercent = minimumSoc + (targetSoc - minimumSoc) * shapedProgress;
  const plannedSocLowerPercent = Math.max(minimumSoc, plannedSocPercent - TRAJECTORY_CORRIDOR_PERCENT);
  const plannedSocUpperPercent = Math.min(targetSoc, plannedSocPercent + TRAJECTORY_CORRIDOR_PERCENT);
  return Object.freeze({
    plannedSocPercent,
    plannedSocLowerPercent,
    plannedSocUpperPercent,
    socDeviationPercent: input.stateOfChargePercent - plannedSocPercent
  });
}
function invalidDecision(configuration, input) {
  var _a;
  return Object.freeze({
    valid: false,
    reason: "invalid-input",
    currentSocPercent: input.stateOfChargePercent,
    targetSocPercent: configuration.maximumStateOfChargePercent,
    plannedSocPercent: configuration.minimumStateOfChargePercent,
    plannedSocLowerPercent: configuration.minimumStateOfChargePercent,
    plannedSocUpperPercent: configuration.minimumStateOfChargePercent,
    socDeviationPercent: 0,
    usableCapacityWh: 0,
    energyRequiredWh: 0,
    forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
    householdEnergyRemainingWh: (_a = input.householdEnergyRemainingWh) != null ? _a : 0,
    forecastReserveWh: configuration.pvForecastReserveWh,
    usableForecastEnergyWh: 0,
    forecastMarginWh: 0,
    remainingDaylightMs: input.remainingDaylightMs,
    targetDeadlineRemainingMs: 0,
    requiredAverageChargePowerW: 0,
    chargePowerLimitW: 0,
    maximumChargePowerW: configuration.maximumChargePowerW
  });
}
function createStrategyChargingDecision(configuration, input) {
  var _a, _b, _c;
  const model = (0, import_batteryAnalysis.getBatteryModel)(configuration.batteryModelId);
  const householdEnergyRemainingWh = (_a = input.householdEnergyRemainingWh) != null ? _a : 0;
  const elapsedDaylightMs = (_b = input.elapsedDaylightMs) != null ? _b : 0;
  const totalDaylightMs = (_c = input.totalDaylightMs) != null ? _c : 0;
  if (model === null || !Number.isFinite(input.stateOfChargePercent) || input.stateOfChargePercent < 0 || input.stateOfChargePercent > 100 || !Number.isFinite(input.forecastEnergyRemainingWh) || input.forecastEnergyRemainingWh < 0 || !Number.isFinite(input.remainingDaylightMs) || input.remainingDaylightMs < 0 || !Number.isFinite(householdEnergyRemainingWh) || householdEnergyRemainingWh < 0 || !Number.isFinite(elapsedDaylightMs) || elapsedDaylightMs < 0 || !Number.isFinite(totalDaylightMs) || totalDaylightMs < 0) {
    return invalidDecision(configuration, input);
  }
  const trajectoryState = trajectory(configuration, input);
  const usableCapacityWh = model.usableCapacityKwh * 1e3;
  const targetSocPercent = configuration.maximumStateOfChargePercent;
  const socGapPercent = Math.max(0, targetSocPercent - input.stateOfChargePercent);
  const energyRequiredWh = usableCapacityWh * socGapPercent / 100;
  const usableForecastEnergyWh = Math.max(
    0,
    input.forecastEnergyRemainingWh - householdEnergyRemainingWh - configuration.pvForecastReserveWh
  );
  const forecastMarginWh = usableForecastEnergyWh - energyRequiredWh;
  const effectiveDaylightMs = Math.max(MINIMUM_DAYLIGHT_MS, input.remainingDaylightMs);
  const targetDeadlineRemainingMs = Math.max(
    MINIMUM_DAYLIGHT_MS,
    input.remainingDaylightMs - TARGET_COMPLETION_BUFFER_MS
  );
  const remainingHoursToDeadline = targetDeadlineRemainingMs / 36e5;
  const requiredAverageChargePowerW = energyRequiredWh / remainingHoursToDeadline;
  if (energyRequiredWh <= 0) {
    return Object.freeze({
      valid: true,
      reason: "target-soc-reached",
      currentSocPercent: input.stateOfChargePercent,
      targetSocPercent,
      ...trajectoryState,
      usableCapacityWh,
      energyRequiredWh,
      forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
      householdEnergyRemainingWh,
      forecastReserveWh: configuration.pvForecastReserveWh,
      usableForecastEnergyWh,
      forecastMarginWh,
      remainingDaylightMs: input.remainingDaylightMs,
      targetDeadlineRemainingMs,
      requiredAverageChargePowerW: 0,
      chargePowerLimitW: 0,
      maximumChargePowerW: configuration.maximumChargePowerW
    });
  }
  const forecastInsufficient = usableForecastEnergyWh < energyRequiredWh;
  const deadlinePowerW = requiredAverageChargePowerW * CHARGE_POWER_HEADROOM_FACTOR;
  let desiredPowerW = forecastInsufficient ? configuration.maximumChargePowerW : deadlinePowerW;
  let reason = forecastInsufficient ? "forecast-insufficient" : "forecast-balanced";
  const deadlineUnderPressure = input.remainingDaylightMs <= TARGET_COMPLETION_BUFFER_MS || deadlinePowerW >= configuration.maximumChargePowerW;
  if (!forecastInsufficient && deadlineUnderPressure) {
    desiredPowerW = configuration.maximumChargePowerW;
    reason = "target-deadline-recovery";
  }
  const wasRecovering = input.previousDecisionReason === "trajectory-recovery";
  const recoveryRequired = wasRecovering ? input.stateOfChargePercent < trajectoryState.plannedSocUpperPercent : input.stateOfChargePercent < trajectoryState.plannedSocLowerPercent;
  if (!forecastInsufficient && !deadlineUnderPressure && recoveryRequired) {
    const recoveryTargetSocPercent = wasRecovering ? trajectoryState.plannedSocUpperPercent : trajectoryState.plannedSocPercent;
    const deficitPercent = recoveryTargetSocPercent - input.stateOfChargePercent;
    const deficitEnergyWh = usableCapacityWh * Math.max(0, deficitPercent) / 100;
    const recoveryWindowMs = Math.max(
      MINIMUM_DAYLIGHT_MS,
      Math.min(TRAJECTORY_RECOVERY_WINDOW_MS, effectiveDaylightMs)
    );
    const recoveryPowerW = deficitEnergyWh / (recoveryWindowMs / 36e5);
    desiredPowerW = Math.max(
      desiredPowerW,
      recoveryPowerW * TRAJECTORY_RECOVERY_HEADROOM_FACTOR
    );
    reason = "trajectory-recovery";
  }
  const chargePowerLimitW = roundPower(Math.min(
    configuration.maximumChargePowerW,
    desiredPowerW
  ));
  return Object.freeze({
    valid: true,
    reason,
    currentSocPercent: input.stateOfChargePercent,
    targetSocPercent,
    ...trajectoryState,
    usableCapacityWh,
    energyRequiredWh,
    forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
    householdEnergyRemainingWh,
    forecastReserveWh: configuration.pvForecastReserveWh,
    usableForecastEnergyWh,
    forecastMarginWh,
    remainingDaylightMs: input.remainingDaylightMs,
    targetDeadlineRemainingMs,
    requiredAverageChargePowerW: roundPower(requiredAverageChargePowerW),
    chargePowerLimitW,
    maximumChargePowerW: configuration.maximumChargePowerW
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyChargingDecision
});
//# sourceMappingURL=strategyChargingDecision.js.map
