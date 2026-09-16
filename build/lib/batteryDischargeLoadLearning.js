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
  BATTERY_DISCHARGE_CAPABILITY_MIN_SAMPLES: () => BATTERY_DISCHARGE_CAPABILITY_MIN_SAMPLES,
  BATTERY_DISCHARGE_CAPABILITY_SOC_BINS: () => BATTERY_DISCHARGE_CAPABILITY_SOC_BINS,
  BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION: () => BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION,
  createBatteryDischargeLoadProgress: () => createBatteryDischargeLoadProgress,
  normalizeBatteryDischargeLoadProgress: () => normalizeBatteryDischargeLoadProgress,
  observeBatteryDischargeLoad: () => observeBatteryDischargeLoad
});
module.exports = __toCommonJS(batteryDischargeLoadLearning_exports);
const BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION = 3;
const BATTERY_DISCHARGE_CAPABILITY_MIN_SAMPLES = 5;
const MIN_DISCHARGE_POWER_W = 100;
const HIGH_LOAD_POWER_FACTOR = 0.5;
const MAX_SAMPLE_GAP_MS = 5 * 60 * 1e3;
const SUSTAINED_HIGH_LOAD_REFERENCE_MINUTES = 30;
const MIN_GRID_IMPORT_EVIDENCE_W = 150;
const MIN_CAPABILITY_TEST_POWER_FACTOR = 0.5;
const MAX_CAPABILITY_SAMPLES_PER_BIN = 60;
const MAX_CAPABILITY_EPISODE_HISTORY = 20;
const LIMITED_RATIO = 0.7;
const RECOVERING_RATIO = 0.9;
const BATTERY_DISCHARGE_CAPABILITY_SOC_BINS = Object.freeze([
  { id: "0-20", min: 0, max: 20 },
  { id: "20-40", min: 20, max: 40 },
  { id: "40-60", min: 40, max: 60 },
  { id: "60-80", min: 60, max: 80 },
  { id: "80-100", min: 80, max: 100.0001 }
]);
function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
function createCapabilityBins() {
  return Object.fromEntries(BATTERY_DISCHARGE_CAPABILITY_SOC_BINS.map((bin) => [bin.id, {
    samples: [],
    observedSamples: 0,
    maxObservedDischargePowerW: 0
  }]));
}
function capabilitySocBin(soc) {
  var _a, _b;
  if (soc === null || !Number.isFinite(soc)) return null;
  return (_b = (_a = BATTERY_DISCHARGE_CAPABILITY_SOC_BINS.find((bin) => soc >= bin.min && soc < bin.max)) == null ? void 0 : _a.id) != null ? _b : null;
}
function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))];
}
function capabilityConfidence(samples) {
  if (samples >= BATTERY_DISCHARGE_CAPABILITY_MIN_SAMPLES) return "established";
  if (samples > 0) return "learning";
  return "none";
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
    peakDischargePowerTodayW: 0,
    totalDischargedEnergyKwh: 0,
    equivalentDischargeCyclesTotal: null,
    totalHighLoadDurationMs: 0,
    capabilityBins: createCapabilityBins(),
    activeCapabilityEpisode: null,
    capabilityEpisodeHistory: [],
    limitationEvents: 0,
    recoveryEvents: 0,
    lastRecoveryAt: null,
    lastRecoveryDurationMinutes: null
  };
}
function normalizeBatteryDischargeLoadProgress(progress, timestamp) {
  var _a, _b, _c, _d, _e, _f;
  if (progress.schemaVersion !== 1 && progress.schemaVersion !== 2 && progress.schemaVersion !== BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION) return createBatteryDischargeLoadProgress(timestamp);
  const capabilityBins = createCapabilityBins();
  if (progress.schemaVersion >= 2) {
    for (const bin of BATTERY_DISCHARGE_CAPABILITY_SOC_BINS) {
      const previous = (_a = progress.capabilityBins) == null ? void 0 : _a[bin.id];
      if (!previous) continue;
      capabilityBins[bin.id] = {
        samples: Array.isArray(previous.samples) ? previous.samples.filter(Number.isFinite).slice(-MAX_CAPABILITY_SAMPLES_PER_BIN) : [],
        observedSamples: Number.isFinite(previous.observedSamples) ? Math.max(0, previous.observedSamples) : 0,
        maxObservedDischargePowerW: Number.isFinite(previous.maxObservedDischargePowerW) ? Math.max(0, previous.maxObservedDischargePowerW) : 0
      };
    }
  }
  const legacy = progress;
  const isCurrentSchema = progress.schemaVersion === BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION;
  const totalDischargedEnergyKwh = isCurrentSchema && Number.isFinite(legacy.totalDischargedEnergyKwh) ? Math.max(0, legacy.totalDischargedEnergyKwh) : Math.max(0, (_b = progress.dischargedEnergyTodayKwh) != null ? _b : 0);
  const totalHighLoadDurationMs = isCurrentSchema && Number.isFinite(legacy.totalHighLoadDurationMs) ? Math.max(0, legacy.totalHighLoadDurationMs) : Math.max(0, (_c = progress.highLoadDurationTodayMs) != null ? _c : 0);
  const activeCapabilityEpisode = progress.schemaVersion >= 2 && progress.activeCapabilityEpisode ? {
    ...progress.activeCapabilityEpisode,
    totalDischargedEnergyAtStartKwh: isCurrentSchema && Number.isFinite(progress.activeCapabilityEpisode.totalDischargedEnergyAtStartKwh) ? progress.activeCapabilityEpisode.totalDischargedEnergyAtStartKwh : round(totalDischargedEnergyKwh),
    equivalentDischargeCyclesTotalAtStart: isCurrentSchema ? (_d = progress.activeCapabilityEpisode.equivalentDischargeCyclesTotalAtStart) != null ? _d : null : null,
    totalHighLoadMinutesAtStart: isCurrentSchema && Number.isFinite(progress.activeCapabilityEpisode.totalHighLoadMinutesAtStart) ? progress.activeCapabilityEpisode.totalHighLoadMinutesAtStart : round(totalHighLoadDurationMs / 6e4, 1)
  } : null;
  return {
    ...progress,
    schemaVersion: BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION,
    lastDischargePowerW: Number.isFinite(progress.lastDischargePowerW) ? Math.max(0, progress.lastDischargePowerW) : 0,
    dischargedEnergyTodayKwh: Number.isFinite(progress.dischargedEnergyTodayKwh) ? Math.max(0, progress.dischargedEnergyTodayKwh) : 0,
    highLoadDurationTodayMs: Number.isFinite(progress.highLoadDurationTodayMs) ? Math.max(0, progress.highLoadDurationTodayMs) : 0,
    consecutiveHighLoadMs: Number.isFinite(progress.consecutiveHighLoadMs) ? Math.max(0, progress.consecutiveHighLoadMs) : 0,
    peakDischargePowerTodayW: Number.isFinite(progress.peakDischargePowerTodayW) ? Math.max(0, progress.peakDischargePowerTodayW) : 0,
    totalDischargedEnergyKwh: round(totalDischargedEnergyKwh),
    equivalentDischargeCyclesTotal: isCurrentSchema && Number.isFinite(legacy.equivalentDischargeCyclesTotal) ? legacy.equivalentDischargeCyclesTotal : null,
    totalHighLoadDurationMs,
    capabilityBins,
    activeCapabilityEpisode,
    capabilityEpisodeHistory: isCurrentSchema && Array.isArray(legacy.capabilityEpisodeHistory) ? legacy.capabilityEpisodeHistory.slice(-MAX_CAPABILITY_EPISODE_HISTORY) : [],
    limitationEvents: progress.schemaVersion >= 2 && Number.isFinite(progress.limitationEvents) ? progress.limitationEvents : 0,
    recoveryEvents: progress.schemaVersion >= 2 && Number.isFinite(progress.recoveryEvents) ? progress.recoveryEvents : 0,
    lastRecoveryAt: progress.schemaVersion >= 2 ? (_e = progress.lastRecoveryAt) != null ? _e : null : null,
    lastRecoveryDurationMinutes: progress.schemaVersion >= 2 ? (_f = progress.lastRecoveryDurationMinutes) != null ? _f : null : null
  };
}
function observeBatteryDischargeLoad(previous, sample, usableCapacityKwh, maximumDischargePowerW) {
  var _a, _b, _c;
  const initial = previous != null ? previous : createBatteryDischargeLoadProgress(sample.timestamp);
  let progress = normalizeBatteryDischargeLoadProgress(initial, sample.timestamp);
  const currentDay = sample.timestamp.slice(0, 10);
  const sameDay = currentDay === progress.day;
  let dischargedEnergyTodayKwh = sameDay ? progress.dischargedEnergyTodayKwh : 0;
  let highLoadDurationTodayMs = sameDay ? progress.highLoadDurationTodayMs : 0;
  let consecutiveHighLoadMs = sameDay ? progress.consecutiveHighLoadMs : 0;
  let peakDischargePowerTodayW = sameDay ? progress.peakDischargePowerTodayW : 0;
  let totalDischargedEnergyKwh = progress.totalDischargedEnergyKwh;
  let totalHighLoadDurationMs = progress.totalHighLoadDurationMs;
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
      const dischargedEnergyKwh = averageDischargePowerW * elapsedMs / 36e8;
      dischargedEnergyTodayKwh += dischargedEnergyKwh;
      totalDischargedEnergyKwh += dischargedEnergyKwh;
      if (highLoadActive) {
        highLoadDurationTodayMs += elapsedMs;
        totalHighLoadDurationMs += elapsedMs;
        consecutiveHighLoadMs += elapsedMs;
      } else consecutiveHighLoadMs = 0;
    }
  }
  peakDischargePowerTodayW = Math.max(peakDischargePowerTodayW, actualDischargePowerW);
  const equivalentDischargeCyclesToday = usableCapacityKwh > 0 ? round(dischargedEnergyTodayKwh / usableCapacityKwh, 3) : null;
  const equivalentDischargeCyclesTotal = usableCapacityKwh > 0 ? round(totalDischargedEnergyKwh / usableCapacityKwh, 3) : null;
  const binId = capabilitySocBin(sample.soc);
  const gridImportPowerW = sample.gridImportPowerW !== null && Number.isFinite(sample.gridImportPowerW) ? Math.max(0, sample.gridImportPowerW) : 0;
  const demandEvidence = gridImportPowerW >= MIN_GRID_IMPORT_EVIDENCE_W;
  const minimumTestPowerW = safeMaximumDischargePowerW * MIN_CAPABILITY_TEST_POWER_FACTOR;
  const capabilityTestable = Boolean(binId && demandEvidence && actualDischargePowerW >= minimumTestPowerW && safeMaximumDischargePowerW > 0);
  const currentBin = binId ? progress.capabilityBins[binId] : null;
  const expectedBeforeSample = currentBin ? percentile(currentBin.samples, 0.75) : null;
  const confidenceBeforeSample = capabilityConfidence((_a = currentBin == null ? void 0 : currentBin.samples.length) != null ? _a : 0);
  const capabilityRatioPercent = capabilityTestable && expectedBeforeSample !== null && expectedBeforeSample > 0 ? round(actualDischargePowerW / expectedBeforeSample * 100, 1) : null;
  const limitationEvidence = confidenceBeforeSample === "established" && capabilityRatioPercent !== null && capabilityRatioPercent < LIMITED_RATIO * 100;
  let capabilityStatus = capabilityTestable ? confidenceBeforeSample === "established" ? "normal" : "learning" : "notTestable";
  let activeCapabilityEpisode = progress.activeCapabilityEpisode;
  let limitationEvents = progress.limitationEvents;
  let recoveryEvents = progress.recoveryEvents;
  let lastRecoveryAt = progress.lastRecoveryAt;
  let lastRecoveryDurationMinutes = progress.lastRecoveryDurationMinutes;
  let capabilityEpisodeHistory = [...progress.capabilityEpisodeHistory];
  if (limitationEvidence) {
    capabilityStatus = "limited";
    if (!activeCapabilityEpisode) {
      activeCapabilityEpisode = {
        startedAt: sample.timestamp,
        socAtStart: sample.soc,
        minimumCapabilityPowerW: round(actualDischargePowerW, 0),
        minimumCapabilityRatioPercent: capabilityRatioPercent != null ? capabilityRatioPercent : 0,
        dischargedEnergyAtStartKwh: round(dischargedEnergyTodayKwh),
        equivalentDischargeCyclesAtStart: equivalentDischargeCyclesToday,
        highLoadMinutesAtStart: round(highLoadDurationTodayMs / 6e4, 1),
        totalDischargedEnergyAtStartKwh: round(totalDischargedEnergyKwh),
        equivalentDischargeCyclesTotalAtStart: equivalentDischargeCyclesTotal,
        totalHighLoadMinutesAtStart: round(totalHighLoadDurationMs / 6e4, 1),
        lastLimitedAt: sample.timestamp
      };
      limitationEvents += 1;
    } else {
      activeCapabilityEpisode = {
        ...activeCapabilityEpisode,
        minimumCapabilityPowerW: Math.min(activeCapabilityEpisode.minimumCapabilityPowerW, round(actualDischargePowerW, 0)),
        minimumCapabilityRatioPercent: Math.min(activeCapabilityEpisode.minimumCapabilityRatioPercent, capabilityRatioPercent != null ? capabilityRatioPercent : activeCapabilityEpisode.minimumCapabilityRatioPercent),
        lastLimitedAt: sample.timestamp
      };
    }
  } else if (activeCapabilityEpisode && capabilityTestable && confidenceBeforeSample === "established" && capabilityRatioPercent !== null) {
    if (capabilityRatioPercent >= RECOVERING_RATIO * 100) {
      capabilityStatus = "recovered";
      recoveryEvents += 1;
      lastRecoveryAt = sample.timestamp;
      lastRecoveryDurationMinutes = Number.isFinite(time) ? round((time - Date.parse(activeCapabilityEpisode.startedAt)) / 6e4, 1) : null;
      const completedEpisode = {
        ...activeCapabilityEpisode,
        recoveredAt: sample.timestamp,
        durationMinutes: lastRecoveryDurationMinutes,
        socAtRecovery: sample.soc,
        dischargedEnergyAtRecoveryKwh: round(dischargedEnergyTodayKwh),
        equivalentDischargeCyclesAtRecovery: equivalentDischargeCyclesToday,
        highLoadMinutesAtRecovery: round(highLoadDurationTodayMs / 6e4, 1),
        totalDischargedEnergyAtRecoveryKwh: round(totalDischargedEnergyKwh),
        equivalentDischargeCyclesTotalAtRecovery: equivalentDischargeCyclesTotal,
        totalHighLoadMinutesAtRecovery: round(totalHighLoadDurationMs / 6e4, 1),
        dischargedEnergyDuringEpisodeKwh: round(Math.max(0, totalDischargedEnergyKwh - activeCapabilityEpisode.totalDischargedEnergyAtStartKwh)),
        highLoadMinutesDuringEpisode: round(Math.max(0, totalHighLoadDurationMs / 6e4 - activeCapabilityEpisode.totalHighLoadMinutesAtStart), 1),
        recoveryCapabilityPowerW: round(actualDischargePowerW, 0),
        recoveryCapabilityRatioPercent: capabilityRatioPercent
      };
      capabilityEpisodeHistory.push(completedEpisode);
      if (capabilityEpisodeHistory.length > MAX_CAPABILITY_EPISODE_HISTORY) {
        capabilityEpisodeHistory = capabilityEpisodeHistory.slice(-MAX_CAPABILITY_EPISODE_HISTORY);
      }
      activeCapabilityEpisode = null;
    } else if (capabilityRatioPercent >= LIMITED_RATIO * 100) capabilityStatus = "recovering";
  }
  if (binId && actualDischargePowerW >= MIN_DISCHARGE_POWER_W) {
    const bin2 = progress.capabilityBins[binId];
    const updated = {
      samples: [...bin2.samples],
      observedSamples: bin2.observedSamples + 1,
      maxObservedDischargePowerW: Math.max(bin2.maxObservedDischargePowerW, actualDischargePowerW)
    };
    const normalLearningThresholdW = confidenceBeforeSample === "established" && expectedBeforeSample !== null ? expectedBeforeSample * RECOVERING_RATIO : null;
    const normalLearningEvidence = normalLearningThresholdW === null || actualDischargePowerW >= normalLearningThresholdW;
    if (capabilityTestable && !limitationEvidence && activeCapabilityEpisode === null && normalLearningEvidence) {
      updated.samples.push(round(actualDischargePowerW, 0));
      if (updated.samples.length > MAX_CAPABILITY_SAMPLES_PER_BIN) updated.samples.splice(0, updated.samples.length - MAX_CAPABILITY_SAMPLES_PER_BIN);
    }
    progress.capabilityBins[binId] = updated;
  }
  progress = {
    ...progress,
    lastUpdate: sample.timestamp,
    lastTimestamp: sample.timestamp,
    lastDischargePowerW: actualDischargePowerW,
    day: currentDay,
    dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
    highLoadDurationTodayMs,
    consecutiveHighLoadMs,
    peakDischargePowerTodayW: round(peakDischargePowerTodayW, 0),
    totalDischargedEnergyKwh: round(totalDischargedEnergyKwh),
    equivalentDischargeCyclesTotal,
    totalHighLoadDurationMs,
    activeCapabilityEpisode,
    capabilityEpisodeHistory,
    limitationEvents,
    recoveryEvents,
    lastRecoveryAt,
    lastRecoveryDurationMinutes
  };
  const bin = binId ? progress.capabilityBins[binId] : null;
  const expected = expectedBeforeSample != null ? expectedBeforeSample : bin ? percentile(bin.samples, 0.75) : null;
  const sampleConfidence = capabilityConfidence((_b = bin == null ? void 0 : bin.samples.length) != null ? _b : 0);
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
    equivalentDischargeCyclesToday,
    loadIndex: index,
    loadStatus: loadStatus(actualDischargePowerW, index),
    capabilitySocBin: binId,
    expectedDischargePowerW: expected === null ? null : round(expected, 0),
    capabilityRatioPercent,
    capabilityStatus,
    capabilityTestable,
    demandEvidence,
    limitationEvidence,
    qualifiedCapabilitySamples: (_c = bin == null ? void 0 : bin.samples.length) != null ? _c : 0,
    capabilityConfidence: sampleConfidence
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BATTERY_DISCHARGE_CAPABILITY_MIN_SAMPLES,
  BATTERY_DISCHARGE_CAPABILITY_SOC_BINS,
  BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION,
  createBatteryDischargeLoadProgress,
  normalizeBatteryDischargeLoadProgress,
  observeBatteryDischargeLoad
});
//# sourceMappingURL=batteryDischargeLoadLearning.js.map
