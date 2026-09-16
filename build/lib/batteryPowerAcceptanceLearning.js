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
var batteryPowerAcceptanceLearning_exports = {};
__export(batteryPowerAcceptanceLearning_exports, {
  BATTERY_POWER_ACCEPTANCE_MIN_SAMPLES: () => BATTERY_POWER_ACCEPTANCE_MIN_SAMPLES,
  BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION: () => BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION,
  BATTERY_POWER_ACCEPTANCE_SOC_BINS: () => BATTERY_POWER_ACCEPTANCE_SOC_BINS,
  createBatteryPowerAcceptanceProgress: () => createBatteryPowerAcceptanceProgress,
  normalizeBatteryPowerAcceptanceProgress: () => normalizeBatteryPowerAcceptanceProgress,
  observeBatteryPowerAcceptance: () => observeBatteryPowerAcceptance
});
module.exports = __toCommonJS(batteryPowerAcceptanceLearning_exports);
const BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION = 3;
const BATTERY_POWER_ACCEPTANCE_MIN_SAMPLES = 5;
const MIN_CHARGE_POWER_W = 100;
const MIN_REQUEST_POWER_W = 500;
const MIN_EXPORT_EVIDENCE_W = 150;
const MIN_ACCEPTANCE_HEADROOM_W = 40;
const MAX_SAMPLE_GAP_MS = 5 * 60 * 1e3;
const MAX_SAMPLES_PER_BIN = 60;
const MAX_CAPABILITY_EPISODE_HISTORY = 20;
const LIMITED_RATIO = 0.7;
const RECOVERING_RATIO = 0.9;
const BATTERY_POWER_ACCEPTANCE_SOC_BINS = Object.freeze([
  { id: "30-80", min: 30, max: 80 },
  { id: "80-85", min: 80, max: 85 },
  { id: "85-90", min: 85, max: 90 },
  { id: "90-92", min: 90, max: 92 },
  { id: "92-94", min: 92, max: 94 },
  { id: "94-96", min: 94, max: 96 },
  { id: "96-98", min: 96, max: 98 },
  { id: "98-99", min: 98, max: 99 },
  { id: "99-100", min: 99, max: 100.0001 }
]);
function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
function createBins() {
  return Object.fromEntries(BATTERY_POWER_ACCEPTANCE_SOC_BINS.map((bin) => [bin.id, {
    samples: [],
    observedSamples: 0,
    maxObservedChargePowerW: 0
  }]));
}
function createBatteryPowerAcceptanceProgress(timestamp) {
  return {
    schemaVersion: BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION,
    dataCollectionStartedAt: timestamp,
    lastUpdate: timestamp,
    lastTimestamp: timestamp,
    lastBatteryPowerW: null,
    day: timestamp.slice(0, 10),
    chargedEnergyTodayKwh: 0,
    dischargedEnergyTodayKwh: 0,
    totalChargedEnergyKwh: 0,
    totalDischargedEnergyKwh: 0,
    totalThroughputKwh: 0,
    equivalentFullCyclesTotal: null,
    bins: createBins(),
    activeEpisode: null,
    episodeHistory: [],
    limitationEvents: 0,
    recoveryEvents: 0,
    lastRecoveryAt: null,
    lastRecoveryDurationMinutes: null
  };
}
function normalizeBatteryPowerAcceptanceProgress(progress, timestamp) {
  var _a, _b, _c, _d, _e, _f;
  if (progress.schemaVersion !== 1 && progress.schemaVersion !== 2 && progress.schemaVersion !== BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION) {
    return createBatteryPowerAcceptanceProgress(timestamp);
  }
  const bins = createBins();
  for (const bin of BATTERY_POWER_ACCEPTANCE_SOC_BINS) {
    const previous = (_a = progress.bins) == null ? void 0 : _a[bin.id];
    if (!previous) continue;
    bins[bin.id] = {
      samples: Array.isArray(previous.samples) ? previous.samples.filter(Number.isFinite).slice(-MAX_SAMPLES_PER_BIN) : [],
      observedSamples: Number.isFinite(previous.observedSamples) ? Math.max(0, previous.observedSamples) : 0,
      maxObservedChargePowerW: Number.isFinite(previous.maxObservedChargePowerW) ? Math.max(0, previous.maxObservedChargePowerW) : 0
    };
  }
  const legacy = progress;
  const isCurrentSchema = progress.schemaVersion === BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION;
  const totalChargedEnergyKwh = isCurrentSchema && Number.isFinite(legacy.totalChargedEnergyKwh) ? Math.max(0, legacy.totalChargedEnergyKwh) : Math.max(0, (_b = progress.chargedEnergyTodayKwh) != null ? _b : 0);
  const totalDischargedEnergyKwh = isCurrentSchema && Number.isFinite(legacy.totalDischargedEnergyKwh) ? Math.max(0, legacy.totalDischargedEnergyKwh) : Math.max(0, (_c = progress.dischargedEnergyTodayKwh) != null ? _c : 0);
  const totalThroughputKwh = isCurrentSchema && Number.isFinite(legacy.totalThroughputKwh) ? Math.max(0, legacy.totalThroughputKwh) : totalChargedEnergyKwh + totalDischargedEnergyKwh;
  const activeEpisode = progress.schemaVersion >= 2 && progress.activeEpisode ? {
    ...progress.activeEpisode,
    totalThroughputAtStartKwh: isCurrentSchema && Number.isFinite(progress.activeEpisode.totalThroughputAtStartKwh) ? progress.activeEpisode.totalThroughputAtStartKwh : round(totalThroughputKwh),
    equivalentFullCyclesTotalAtStart: isCurrentSchema ? (_d = progress.activeEpisode.equivalentFullCyclesTotalAtStart) != null ? _d : null : null
  } : null;
  return {
    ...progress,
    schemaVersion: BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION,
    bins,
    totalChargedEnergyKwh: round(totalChargedEnergyKwh),
    totalDischargedEnergyKwh: round(totalDischargedEnergyKwh),
    totalThroughputKwh: round(totalThroughputKwh),
    equivalentFullCyclesTotal: isCurrentSchema && Number.isFinite(legacy.equivalentFullCyclesTotal) ? legacy.equivalentFullCyclesTotal : null,
    activeEpisode,
    episodeHistory: isCurrentSchema && Array.isArray(legacy.episodeHistory) ? legacy.episodeHistory.slice(-MAX_CAPABILITY_EPISODE_HISTORY) : [],
    limitationEvents: progress.schemaVersion >= 2 && Number.isFinite(progress.limitationEvents) ? progress.limitationEvents : 0,
    recoveryEvents: progress.schemaVersion >= 2 && Number.isFinite(progress.recoveryEvents) ? progress.recoveryEvents : 0,
    lastRecoveryAt: progress.schemaVersion >= 2 ? (_e = progress.lastRecoveryAt) != null ? _e : null : null,
    lastRecoveryDurationMinutes: progress.schemaVersion >= 2 ? (_f = progress.lastRecoveryDurationMinutes) != null ? _f : null : null
  };
}
function socBin(soc) {
  var _a, _b;
  if (soc === null || !Number.isFinite(soc)) return null;
  return (_b = (_a = BATTERY_POWER_ACCEPTANCE_SOC_BINS.find((bin) => soc >= bin.min && soc < bin.max)) == null ? void 0 : _a.id) != null ? _b : null;
}
function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))];
}
function confidence(samples) {
  if (samples >= BATTERY_POWER_ACCEPTANCE_MIN_SAMPLES) return "established";
  if (samples > 0) return "learning";
  return "none";
}
function stressStatus(index, sampleConfidence) {
  if (index === null) return sampleConfidence === "none" ? "notAvailable" : "learning";
  if (index >= 60) return "high";
  if (index >= 30) return "elevated";
  return "normal";
}
function observeBatteryPowerAcceptance(previous, sample, usableCapacityKwh) {
  var _a, _b, _c;
  const initial = previous != null ? previous : createBatteryPowerAcceptanceProgress(sample.timestamp);
  let progress = normalizeBatteryPowerAcceptanceProgress(initial, sample.timestamp);
  const time = Date.parse(sample.timestamp);
  const previousTime = Date.parse(progress.lastTimestamp);
  const currentDay = sample.timestamp.slice(0, 10);
  let chargedEnergyTodayKwh = currentDay === progress.day ? progress.chargedEnergyTodayKwh : 0;
  let dischargedEnergyTodayKwh = currentDay === progress.day ? progress.dischargedEnergyTodayKwh : 0;
  let totalChargedEnergyKwh = progress.totalChargedEnergyKwh;
  let totalDischargedEnergyKwh = progress.totalDischargedEnergyKwh;
  if (Number.isFinite(time) && Number.isFinite(previousTime)) {
    const elapsedMs = time - previousTime;
    if (elapsedMs > 0 && elapsedMs <= MAX_SAMPLE_GAP_MS && progress.lastBatteryPowerW !== null && sample.batteryPower !== null) {
      const averagePowerW = (progress.lastBatteryPowerW + sample.batteryPower) / 2;
      const energyKwh = Math.abs(averagePowerW) * elapsedMs / 36e8;
      if (averagePowerW < 0) {
        chargedEnergyTodayKwh += energyKwh;
        totalChargedEnergyKwh += energyKwh;
      }
      if (averagePowerW > 0) {
        dischargedEnergyTodayKwh += energyKwh;
        totalDischargedEnergyKwh += energyKwh;
      }
    }
  }
  const throughputTodayKwh = chargedEnergyTodayKwh + dischargedEnergyTodayKwh;
  const equivalentFullCyclesToday = usableCapacityKwh > 0 ? round(throughputTodayKwh / (2 * usableCapacityKwh), 3) : null;
  const totalThroughputKwh = totalChargedEnergyKwh + totalDischargedEnergyKwh;
  const equivalentFullCyclesTotal = usableCapacityKwh > 0 ? round(totalThroughputKwh / (2 * usableCapacityKwh), 3) : null;
  const binId = socBin(sample.soc);
  const actualChargePowerW = sample.direction === "charging" && sample.batteryPower !== null ? Math.max(0, -sample.batteryPower) : 0;
  const requested = sample.requestedChargePowerW !== null && Number.isFinite(sample.requestedChargePowerW) ? Math.max(0, sample.requestedChargePowerW) : null;
  const exportEvidence = sample.gridExportPowerW !== null && sample.gridExportPowerW >= MIN_EXPORT_EVIDENCE_W;
  const requestHeadroom = requested !== null && requested >= MIN_REQUEST_POWER_W && actualChargePowerW >= MIN_CHARGE_POWER_W && requested - actualChargePowerW >= MIN_ACCEPTANCE_HEADROOM_W;
  const testable = Boolean(binId && exportEvidence && requestHeadroom);
  const currentBin = binId ? progress.bins[binId] : null;
  const expectedBeforeSample = currentBin ? percentile(currentBin.samples, 0.75) : null;
  const confidenceBeforeSample = confidence((_a = currentBin == null ? void 0 : currentBin.samples.length) != null ? _a : 0);
  const capabilityRatioPercent = testable && expectedBeforeSample !== null && expectedBeforeSample > 0 ? round(actualChargePowerW / expectedBeforeSample * 100, 1) : null;
  const limitationEvidence = confidenceBeforeSample === "established" && capabilityRatioPercent !== null && capabilityRatioPercent < LIMITED_RATIO * 100;
  let capabilityStatus = testable ? confidenceBeforeSample === "established" ? "normal" : "learning" : "notTestable";
  let activeEpisode = progress.activeEpisode;
  let limitationEvents = progress.limitationEvents;
  let recoveryEvents = progress.recoveryEvents;
  let lastRecoveryAt = progress.lastRecoveryAt;
  let lastRecoveryDurationMinutes = progress.lastRecoveryDurationMinutes;
  let episodeHistory = [...progress.episodeHistory];
  if (limitationEvidence) {
    capabilityStatus = "limited";
    if (!activeEpisode) {
      activeEpisode = {
        startedAt: sample.timestamp,
        socAtStart: sample.soc,
        minimumCapabilityPowerW: round(actualChargePowerW, 0),
        minimumCapabilityRatioPercent: capabilityRatioPercent != null ? capabilityRatioPercent : 0,
        throughputAtStartKwh: round(throughputTodayKwh),
        equivalentFullCyclesAtStart: equivalentFullCyclesToday,
        totalThroughputAtStartKwh: round(totalThroughputKwh),
        equivalentFullCyclesTotalAtStart: equivalentFullCyclesTotal,
        lastLimitedAt: sample.timestamp
      };
      limitationEvents += 1;
    } else {
      activeEpisode = {
        ...activeEpisode,
        minimumCapabilityPowerW: Math.min(activeEpisode.minimumCapabilityPowerW, round(actualChargePowerW, 0)),
        minimumCapabilityRatioPercent: Math.min(activeEpisode.minimumCapabilityRatioPercent, capabilityRatioPercent != null ? capabilityRatioPercent : activeEpisode.minimumCapabilityRatioPercent),
        lastLimitedAt: sample.timestamp
      };
    }
  } else if (activeEpisode && testable && confidenceBeforeSample === "established" && capabilityRatioPercent !== null) {
    if (capabilityRatioPercent >= RECOVERING_RATIO * 100) {
      capabilityStatus = "recovered";
      recoveryEvents += 1;
      lastRecoveryAt = sample.timestamp;
      lastRecoveryDurationMinutes = Number.isFinite(time) ? round((time - Date.parse(activeEpisode.startedAt)) / 6e4, 1) : null;
      const completedEpisode = {
        ...activeEpisode,
        recoveredAt: sample.timestamp,
        durationMinutes: lastRecoveryDurationMinutes,
        socAtRecovery: sample.soc,
        throughputAtRecoveryKwh: round(throughputTodayKwh),
        equivalentFullCyclesAtRecovery: equivalentFullCyclesToday,
        totalThroughputAtRecoveryKwh: round(totalThroughputKwh),
        equivalentFullCyclesTotalAtRecovery: equivalentFullCyclesTotal,
        throughputDuringEpisodeKwh: round(Math.max(0, totalThroughputKwh - activeEpisode.totalThroughputAtStartKwh)),
        recoveryCapabilityPowerW: round(actualChargePowerW, 0),
        recoveryCapabilityRatioPercent: capabilityRatioPercent
      };
      episodeHistory.push(completedEpisode);
      if (episodeHistory.length > MAX_CAPABILITY_EPISODE_HISTORY) {
        episodeHistory = episodeHistory.slice(-MAX_CAPABILITY_EPISODE_HISTORY);
      }
      activeEpisode = null;
    } else if (capabilityRatioPercent >= LIMITED_RATIO * 100) {
      capabilityStatus = "recovering";
    }
  }
  if (binId && actualChargePowerW >= MIN_CHARGE_POWER_W) {
    const bin2 = progress.bins[binId];
    const updated = {
      samples: [...bin2.samples],
      observedSamples: bin2.observedSamples + 1,
      maxObservedChargePowerW: Math.max(bin2.maxObservedChargePowerW, actualChargePowerW)
    };
    const normalLearningThresholdW = confidenceBeforeSample === "established" && expectedBeforeSample !== null ? expectedBeforeSample * RECOVERING_RATIO : null;
    const normalLearningEvidence = normalLearningThresholdW === null || actualChargePowerW >= normalLearningThresholdW;
    if (testable && !limitationEvidence && activeEpisode === null && normalLearningEvidence) {
      updated.samples.push(round(actualChargePowerW, 0));
      if (updated.samples.length > MAX_SAMPLES_PER_BIN) updated.samples.splice(0, updated.samples.length - MAX_SAMPLES_PER_BIN);
    }
    progress.bins[binId] = updated;
  }
  progress = {
    ...progress,
    lastUpdate: sample.timestamp,
    lastTimestamp: sample.timestamp,
    lastBatteryPowerW: sample.batteryPower,
    day: currentDay,
    chargedEnergyTodayKwh: round(chargedEnergyTodayKwh),
    dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
    totalChargedEnergyKwh: round(totalChargedEnergyKwh),
    totalDischargedEnergyKwh: round(totalDischargedEnergyKwh),
    totalThroughputKwh: round(totalThroughputKwh),
    equivalentFullCyclesTotal,
    activeEpisode,
    episodeHistory,
    limitationEvents,
    recoveryEvents,
    lastRecoveryAt,
    lastRecoveryDurationMinutes
  };
  const bin = binId ? progress.bins[binId] : null;
  const expected = expectedBeforeSample != null ? expectedBeforeSample : bin ? percentile(bin.samples, 0.75) : null;
  const sampleConfidence = confidence((_b = bin == null ? void 0 : bin.samples.length) != null ? _b : 0);
  const ratio = requested !== null && requested > 0 && actualChargePowerW > 0 ? round(actualChargePowerW / requested * 100, 1) : null;
  const deviationW = expected !== null && actualChargePowerW > 0 ? round(actualChargePowerW - expected, 0) : null;
  const deviationPercent = expected !== null && expected > 0 && deviationW !== null ? round(deviationW / expected * 100, 1) : null;
  const stressIndex = confidenceBeforeSample === "established" && testable && deviationPercent !== null ? round(Math.max(0, Math.min(100, -deviationPercent)), 1) : null;
  return {
    progress,
    socBin: binId,
    requestedChargePowerW: requested,
    actualChargePowerW: round(actualChargePowerW, 0),
    acceptanceRatioPercent: ratio,
    expectedAcceptancePowerW: expected === null ? null : round(expected, 0),
    acceptanceDeviationW: deviationW,
    acceptanceDeviationPercent: deviationPercent,
    capabilityRatioPercent,
    capabilityStatus,
    testable,
    limitationEvidence,
    qualifiedSamples: (_c = bin == null ? void 0 : bin.samples.length) != null ? _c : 0,
    confidence: sampleConfidence,
    stressIndex,
    stressStatus: stressStatus(stressIndex, sampleConfidence),
    chargedEnergyTodayKwh: round(chargedEnergyTodayKwh),
    dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
    throughputTodayKwh: round(throughputTodayKwh),
    equivalentFullCyclesToday,
    exportEvidence
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BATTERY_POWER_ACCEPTANCE_MIN_SAMPLES,
  BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION,
  BATTERY_POWER_ACCEPTANCE_SOC_BINS,
  createBatteryPowerAcceptanceProgress,
  normalizeBatteryPowerAcceptanceProgress,
  observeBatteryPowerAcceptance
});
//# sourceMappingURL=batteryPowerAcceptanceLearning.js.map
