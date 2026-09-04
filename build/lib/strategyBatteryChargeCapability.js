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
var strategyBatteryChargeCapability_exports = {};
__export(strategyBatteryChargeCapability_exports, {
  PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS: () => PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS,
  estimateStrategyChargeDuration: () => estimateStrategyChargeDuration,
  resolveStrategyBatteryTechnicalLimits: () => resolveStrategyBatteryTechnicalLimits
});
module.exports = __toCommonJS(strategyBatteryChargeCapability_exports);
const PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS = Object.freeze([
  Object.freeze({
    minimumStateOfChargePercent: 0,
    maximumStateOfChargePercent: 93,
    estimatedMaximumChargePowerW: Number.POSITIVE_INFINITY,
    source: "manufacturer-specification"
  }),
  Object.freeze({
    minimumStateOfChargePercent: 93,
    maximumStateOfChargePercent: 94,
    estimatedMaximumChargePowerW: 1800,
    source: "provisional-influx-estimate"
  }),
  Object.freeze({
    minimumStateOfChargePercent: 94,
    maximumStateOfChargePercent: 95,
    estimatedMaximumChargePowerW: 1500,
    source: "provisional-influx-estimate"
  }),
  Object.freeze({
    minimumStateOfChargePercent: 95,
    maximumStateOfChargePercent: 96,
    estimatedMaximumChargePowerW: 1200,
    source: "provisional-influx-estimate"
  }),
  Object.freeze({
    minimumStateOfChargePercent: 96,
    maximumStateOfChargePercent: 97,
    estimatedMaximumChargePowerW: 900,
    source: "provisional-influx-estimate"
  }),
  Object.freeze({
    minimumStateOfChargePercent: 97,
    maximumStateOfChargePercent: 98,
    estimatedMaximumChargePowerW: 550,
    source: "provisional-influx-estimate"
  }),
  Object.freeze({
    minimumStateOfChargePercent: 98,
    maximumStateOfChargePercent: 99,
    estimatedMaximumChargePowerW: 250,
    source: "provisional-influx-estimate"
  }),
  Object.freeze({
    minimumStateOfChargePercent: 99,
    maximumStateOfChargePercent: 100,
    estimatedMaximumChargePowerW: 150,
    source: "provisional-influx-estimate"
  })
]);
function resolveStrategyBatteryTechnicalLimits(model) {
  const usableCapacityWh = model.usableCapacityKwh * 1e3;
  const maximumChargePowerW = model.maximumChargePowerW;
  const maximumDischargePowerW = model.maximumDischargePowerW;
  if (!Number.isFinite(usableCapacityWh) || usableCapacityWh <= 0 || !Number.isFinite(maximumChargePowerW) || maximumChargePowerW <= 0 || !Number.isFinite(maximumDischargePowerW) || maximumDischargePowerW <= 0) {
    return null;
  }
  return Object.freeze({
    batteryModelId: model.id,
    usableCapacityWh,
    maximumChargePowerW,
    maximumDischargePowerW,
    source: "manufacturer-specification"
  });
}
function estimateStrategyChargeDuration(model, currentStateOfChargePercent, targetStateOfChargePercent, configuredMaximumChargePowerW) {
  const limits = resolveStrategyBatteryTechnicalLimits(model);
  if (limits === null || !Number.isFinite(currentStateOfChargePercent) || !Number.isFinite(targetStateOfChargePercent) || !Number.isFinite(configuredMaximumChargePowerW) || currentStateOfChargePercent < 0 || currentStateOfChargePercent > 100 || targetStateOfChargePercent < currentStateOfChargePercent || targetStateOfChargePercent > 100 || configuredMaximumChargePowerW <= 0) {
    return null;
  }
  const configuredAndTechnicalPowerW = Math.min(
    configuredMaximumChargePowerW,
    limits.maximumChargePowerW
  );
  const segments = PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS.map((segment) => {
    const minimumStateOfChargePercent = Math.max(
      currentStateOfChargePercent,
      segment.minimumStateOfChargePercent
    );
    const maximumStateOfChargePercent = Math.min(
      targetStateOfChargePercent,
      segment.maximumStateOfChargePercent
    );
    if (maximumStateOfChargePercent <= minimumStateOfChargePercent) {
      return null;
    }
    const energyWh = limits.usableCapacityWh * (maximumStateOfChargePercent - minimumStateOfChargePercent) / 100;
    const effectiveChargePowerW = Math.min(
      configuredAndTechnicalPowerW,
      segment.estimatedMaximumChargePowerW
    );
    const durationSeconds = energyWh / effectiveChargePowerW * 3600;
    return Object.freeze({
      minimumStateOfChargePercent,
      maximumStateOfChargePercent,
      energyWh,
      effectiveChargePowerW,
      durationSeconds,
      powerSource: segment.source
    });
  }).filter(
    (segment) => segment !== null
  );
  const requiredChargeEnergyWh = limits.usableCapacityWh * (targetStateOfChargePercent - currentStateOfChargePercent) / 100;
  const estimatedDurationSeconds = segments.reduce(
    (sum, segment) => sum + segment.durationSeconds,
    0
  );
  return Object.freeze({
    batteryModelId: model.id,
    requiredChargeEnergyWh,
    estimatedDurationSeconds,
    segments: Object.freeze(segments),
    provisional: segments.some(
      (segment) => segment.powerSource === "provisional-influx-estimate"
    )
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS,
  estimateStrategyChargeDuration,
  resolveStrategyBatteryTechnicalLimits
});
//# sourceMappingURL=strategyBatteryChargeCapability.js.map
