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
var batteryHealth_exports = {};
__export(batteryHealth_exports, {
  BATTERY_HEALTH_SCHEMA_VERSION: () => BATTERY_HEALTH_SCHEMA_VERSION,
  MIN_HEALTH_SOC_SPAN: () => MIN_HEALTH_SOC_SPAN,
  REQUIRED_HEALTH_RUNS: () => REQUIRED_HEALTH_RUNS,
  createBatteryHealthProgress: () => createBatteryHealthProgress,
  normalizeBatteryHealthProgress: () => normalizeBatteryHealthProgress,
  observeBatteryHealth: () => observeBatteryHealth
});
module.exports = __toCommonJS(batteryHealth_exports);
const REQUIRED_HEALTH_RUNS = 5;
const MIN_HEALTH_SOC_SPAN = 40;
const BATTERY_HEALTH_SCHEMA_VERSION = 2;
const MIN_REJECTED_RUN_SOC_SPAN = 5;
const MIN_POWER_W = 100;
const MAX_GAP_MS = 15 * 60 * 1e3;
function createBatteryHealthProgress(timestamp) {
  return {
    schemaVersion: BATTERY_HEALTH_SCHEMA_VERSION,
    validRuns: 0,
    requiredRuns: REQUIRED_HEALTH_RUNS,
    rejectedRuns: 0,
    dataCollectionStartedAt: timestamp,
    lastEvaluation: "",
    estimates: [],
    activeRun: null
  };
}
function normalizeBatteryHealthProgress(progress) {
  if (progress.schemaVersion === BATTERY_HEALTH_SCHEMA_VERSION) return progress;
  return {
    ...progress,
    schemaVersion: BATTERY_HEALTH_SCHEMA_VERSION,
    // Version 1 counted charging phases and tiny power fluctuations as
    // rejected discharge measurements. The historical value cannot be
    // corrected reliably, so reset this diagnostic counter during migration.
    rejectedRuns: 0
  };
}
function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
function healthValue(progress) {
  if (progress.validRuns < progress.requiredRuns) return null;
  const value = median(progress.estimates.slice(-progress.requiredRuns));
  return value === null ? null : round(Math.max(0, Math.min(110, value)), 1);
}
function result(progress) {
  const value = healthValue(progress);
  return {
    progress,
    status: value !== null ? "available" : progress.validRuns > 0 || progress.rejectedRuns > 0 ? "insufficientData" : "collectingData",
    value
  };
}
function finishRun(progress, usableCapacityKwh, timestamp) {
  const run = progress.activeRun;
  if (!run) return;
  const socSpan = run.startSoc - run.currentSoc;
  const valid = run.direction === "discharging" && !run.invalid && socSpan >= MIN_HEALTH_SOC_SPAN && run.energyKwh > 0;
  if (valid && usableCapacityKwh > 0) {
    const expectedEnergy = usableCapacityKwh * socSpan / 100;
    const estimate = run.energyKwh / expectedEnergy * 100;
    if (Number.isFinite(estimate) && estimate >= 50 && estimate <= 120) {
      progress.validRuns += 1;
      progress.estimates.push(round(estimate, 2));
      progress.estimates = progress.estimates.slice(-20);
    } else {
      progress.rejectedRuns += 1;
    }
  } else if (run.direction === "discharging" && socSpan >= MIN_REJECTED_RUN_SOC_SPAN) {
    progress.rejectedRuns += 1;
  }
  progress.lastEvaluation = timestamp;
  progress.activeRun = null;
}
function observeBatteryHealth(previous, sample, usableCapacityKwh) {
  var _a;
  const progress = previous != null ? previous : createBatteryHealthProgress(sample.timestamp);
  const time = Date.parse(sample.timestamp);
  const usableSample = Number.isFinite(time) && sample.soc !== null && sample.soc >= 0 && sample.soc <= 100 && sample.batteryPower !== null;
  const direction = sample.direction === "charging" || sample.direction === "discharging" ? sample.direction : null;
  if (!usableSample || !direction || Math.abs((_a = sample.batteryPower) != null ? _a : 0) < MIN_POWER_W) {
    if (progress.activeRun) {
      if (sample.soc !== null && sample.soc >= 0 && sample.soc <= 100) {
        progress.activeRun.currentSoc = sample.soc;
      }
      finishRun(progress, usableCapacityKwh, sample.timestamp);
    }
    return result(progress);
  }
  if (!progress.activeRun || progress.activeRun.direction !== direction) {
    if (progress.activeRun) finishRun(progress, usableCapacityKwh, sample.timestamp);
    progress.activeRun = {
      direction,
      startedAt: sample.timestamp,
      lastTimestamp: sample.timestamp,
      startSoc: sample.soc,
      currentSoc: sample.soc,
      energyKwh: 0,
      invalid: false
    };
    return result(progress);
  }
  const run = progress.activeRun;
  const elapsedMs = time - Date.parse(run.lastTimestamp);
  if (elapsedMs <= 0 || elapsedMs > MAX_GAP_MS) {
    run.invalid = true;
  } else {
    run.energyKwh += Math.abs(sample.batteryPower) * elapsedMs / 36e8;
  }
  if (direction === "discharging" && sample.soc > run.currentSoc + 2 || direction === "charging" && sample.soc < run.currentSoc - 2) {
    run.invalid = true;
  }
  run.currentSoc = sample.soc;
  run.lastTimestamp = sample.timestamp;
  return result(progress);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BATTERY_HEALTH_SCHEMA_VERSION,
  MIN_HEALTH_SOC_SPAN,
  REQUIRED_HEALTH_RUNS,
  createBatteryHealthProgress,
  normalizeBatteryHealthProgress,
  observeBatteryHealth
});
//# sourceMappingURL=batteryHealth.js.map
