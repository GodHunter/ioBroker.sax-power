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
var batteryDischargeLoadLearning_exports = {};
__export(batteryDischargeLoadLearning_exports, {
  BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION: () => BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION,
  createBatteryDischargeLoadProgress: () => createBatteryDischargeLoadProgress,
  normalizeBatteryDischargeLoadProgress: () => normalizeBatteryDischargeLoadProgress,
  observeBatteryDischargeLoad: () => observeBatteryDischargeLoad
});
module.exports = __toCommonJS(batteryDischargeLoadLearning_exports);
const BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION = 1;
const MIN_DISCHARGE_POWER_W = 100;
const HIGH_LOAD_POWER_FACTOR = 0.5;
const MAX_SAMPLE_GAP_MS = 5 * 60 * 1e3;
const SUSTAINED_HIGH_LOAD_REFERENCE_MINUTES = 30;
function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
function loadStatus(actualDischargePowerW, index) {
  if (actualDischargePowerW < MIN_DISCHARGE_POWER_W) return "idle";
  if (index >= 70) return "high";
  if (index >= 40) return "elevated";
  return "normal";
}
function createBatteryDischargeLoadProgress(timestamp) {
  return {
    schemaVersion: BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION,
    dataCollectionStartedAt: timestamp,
    lastUpdate: timestamp,
    lastTimestamp: timestamp,
    lastDischargePowerW: 0,
    day: timestamp.slice(0, 10),
    dischargedEnergyTodayKwh: 0,
    highLoadDurationTodayMs: 0,
    consecutiveHighLoadMs: 0,
    peakDischargePowerTodayW: 0
  };
}
function normalizeBatteryDischargeLoadProgress(progress, timestamp) {
  if (progress.schemaVersion !== BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION) {
    return createBatteryDischargeLoadProgress(timestamp);
  }
  return {
    ...progress,
    lastDischargePowerW: Number.isFinite(progress.lastDischargePowerW) ? Math.max(0, progress.lastDischargePowerW) : 0,
    dischargedEnergyTodayKwh: Number.isFinite(progress.dischargedEnergyTodayKwh) ? Math.max(0, progress.dischargedEnergyTodayKwh) : 0,
    highLoadDurationTodayMs: Number.isFinite(progress.highLoadDurationTodayMs) ? Math.max(0, progress.highLoadDurationTodayMs) : 0,
    consecutiveHighLoadMs: Number.isFinite(progress.consecutiveHighLoadMs) ? Math.max(0, progress.consecutiveHighLoadMs) : 0,
    peakDischargePowerTodayW: Number.isFinite(progress.peakDischargePowerTodayW) ? Math.max(0, progress.peakDischargePowerTodayW) : 0
  };
}
function observeBatteryDischargeLoad(previous, sample, usableCapacityKwh, maximumDischargePowerW) {
  const initial = previous != null ? previous : createBatteryDischargeLoadProgress(sample.timestamp);
  let progress = normalizeBatteryDischargeLoadProgress(initial, sample.timestamp);
  const currentDay = sample.timestamp.slice(0, 10);
  const sameDay = currentDay === progress.day;
  let dischargedEnergyTodayKwh = sameDay ? progress.dischargedEnergyTodayKwh : 0;
  let highLoadDurationTodayMs = sameDay ? progress.highLoadDurationTodayMs : 0;
  let consecutiveHighLoadMs = sameDay ? progress.consecutiveHighLoadMs : 0;
  let peakDischargePowerTodayW = sameDay ? progress.peakDischargePowerTodayW : 0;
  const actualDischargePowerW = sample.direction === "discharging" && sample.batteryPower !== null ? Math.max(0, sample.batteryPower) : 0;
  const safeMaximumDischargePowerW = Number.isFinite(maximumDischargePowerW) && maximumDischargePowerW > 0 ? maximumDischargePowerW : 0;
  const highLoadThresholdW = safeMaximumDischargePowerW * HIGH_LOAD_POWER_FACTOR;
  const highLoadActive = safeMaximumDischargePowerW > 0 && actualDischargePowerW >= highLoadThresholdW;
  const time = Date.parse(sample.timestamp);
  const previousTime = Date.parse(progress.lastTimestamp);
  if (sameDay && Number.isFinite(time) && Number.isFinite(previousTime)) {
    const elapsedMs = time - previousTime;
    if (elapsedMs > 0 && elapsedMs <= MAX_SAMPLE_GAP_MS) {
      const averageDischargePowerW = (progress.lastDischargePowerW + actualDischargePowerW) / 2;
      dischargedEnergyTodayKwh += averageDischargePowerW * elapsedMs / 36e8;
      if (highLoadActive) {
        highLoadDurationTodayMs += elapsedMs;
        consecutiveHighLoadMs += elapsedMs;
      } else {
        consecutiveHighLoadMs = 0;
      }
    }
  }
  peakDischargePowerTodayW = Math.max(peakDischargePowerTodayW, actualDischargePowerW);
  progress = {
    ...progress,
    lastUpdate: sample.timestamp,
    lastTimestamp: sample.timestamp,
    lastDischargePowerW: actualDischargePowerW,
    day: currentDay,
    dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
    highLoadDurationTodayMs,
    consecutiveHighLoadMs,
    peakDischargePowerTodayW: round(peakDischargePowerTodayW, 0)
  };
  const utilization = safeMaximumDischargePowerW > 0 ? clamp01(actualDischargePowerW / safeMaximumDischargePowerW) : 0;
  const sustainedFactor = clamp01(consecutiveHighLoadMs / (SUSTAINED_HIGH_LOAD_REFERENCE_MINUTES * 6e4));
  const dischargeCycleFactor = usableCapacityKwh > 0 ? clamp01(dischargedEnergyTodayKwh / usableCapacityKwh) : 0;
  const index = actualDischargePowerW >= MIN_DISCHARGE_POWER_W ? round(70 * utilization * utilization + 20 * sustainedFactor + 10 * dischargeCycleFactor, 1) : 0;
  return {
    progress,
    actualDischargePowerW: round(actualDischargePowerW, 0),
    maximumDischargePowerW: round(safeMaximumDischargePowerW, 0),
    utilizationPercent: round(utilization * 100, 1),
    highLoadThresholdW: round(highLoadThresholdW, 0),
    highLoadActive,
    consecutiveHighLoadMinutes: round(consecutiveHighLoadMs / 6e4, 1),
    highLoadMinutesToday: round(highLoadDurationTodayMs / 6e4, 1),
    peakDischargePowerTodayW: round(peakDischargePowerTodayW, 0),
    dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
    equivalentDischargeCyclesToday: usableCapacityKwh > 0 ? round(dischargedEnergyTodayKwh / usableCapacityKwh, 3) : null,
    loadIndex: index,
    loadStatus: loadStatus(actualDischargePowerW, index)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION,
  createBatteryDischargeLoadProgress,
  normalizeBatteryDischargeLoadProgress,
  observeBatteryDischargeLoad
});
//# sourceMappingURL=batteryDischargeLoadLearning.js.map
