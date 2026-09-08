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
const BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION = 1;
const BATTERY_POWER_ACCEPTANCE_MIN_SAMPLES = 5;
const MIN_CHARGE_POWER_W = 100;
const MIN_REQUEST_POWER_W = 500;
const MIN_EXPORT_EVIDENCE_W = 150;
const MIN_ACCEPTANCE_HEADROOM_W = 40;
const MAX_SAMPLE_GAP_MS = 5 * 60 * 1e3;
const MAX_SAMPLES_PER_BIN = 60;
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
    bins: createBins()
  };
}
function normalizeBatteryPowerAcceptanceProgress(progress, timestamp) {
  var _a;
  if (progress.schemaVersion !== BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION) {
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
  return { ...progress, bins };
}
function socBin(soc) {
  var _a, _b;
  if (soc === null || !Number.isFinite(soc)) return null;
  return (_b = (_a = BATTERY_POWER_ACCEPTANCE_SOC_BINS.find((bin) => soc >= bin.min && soc < bin.max)) == null ? void 0 : _a.id) != null ? _b : null;
}
function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index];
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
  var _a, _b;
  const initial = previous != null ? previous : createBatteryPowerAcceptanceProgress(sample.timestamp);
  let progress = normalizeBatteryPowerAcceptanceProgress(initial, sample.timestamp);
  const time = Date.parse(sample.timestamp);
  const previousTime = Date.parse(progress.lastTimestamp);
  const currentDay = sample.timestamp.slice(0, 10);
  let chargedEnergyTodayKwh = currentDay === progress.day ? progress.chargedEnergyTodayKwh : 0;
  let dischargedEnergyTodayKwh = currentDay === progress.day ? progress.dischargedEnergyTodayKwh : 0;
  if (Number.isFinite(time) && Number.isFinite(previousTime)) {
    const elapsedMs = time - previousTime;
    if (elapsedMs > 0 && elapsedMs <= MAX_SAMPLE_GAP_MS && progress.lastBatteryPowerW !== null && sample.batteryPower !== null) {
      const averagePowerW = (progress.lastBatteryPowerW + sample.batteryPower) / 2;
      const energyKwh = Math.abs(averagePowerW) * elapsedMs / 36e8;
      if (averagePowerW < 0) chargedEnergyTodayKwh += energyKwh;
      if (averagePowerW > 0) dischargedEnergyTodayKwh += energyKwh;
    }
  }
  const binId = socBin(sample.soc);
  const actualChargePowerW = sample.direction === "charging" && sample.batteryPower !== null ? Math.max(0, -sample.batteryPower) : 0;
  const requested = sample.requestedChargePowerW !== null && Number.isFinite(sample.requestedChargePowerW) ? Math.max(0, sample.requestedChargePowerW) : null;
  const exportEvidence = sample.gridExportPowerW !== null && sample.gridExportPowerW >= MIN_EXPORT_EVIDENCE_W;
  const batteryLimitedEvidence = requested !== null && requested >= MIN_REQUEST_POWER_W && actualChargePowerW >= MIN_CHARGE_POWER_W && requested - actualChargePowerW >= MIN_ACCEPTANCE_HEADROOM_W;
  const qualifiedAcceptanceSample = exportEvidence && batteryLimitedEvidence;
  if (binId && actualChargePowerW >= MIN_CHARGE_POWER_W) {
    const bin2 = progress.bins[binId];
    const updated = {
      samples: [...bin2.samples],
      observedSamples: bin2.observedSamples + 1,
      maxObservedChargePowerW: Math.max(bin2.maxObservedChargePowerW, actualChargePowerW)
    };
    if (qualifiedAcceptanceSample) {
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
    dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh)
  };
  const bin = binId ? progress.bins[binId] : null;
  const expected = bin ? percentile(bin.samples, 0.75) : null;
  const sampleConfidence = confidence((_a = bin == null ? void 0 : bin.samples.length) != null ? _a : 0);
  const ratio = requested !== null && requested > 0 && actualChargePowerW > 0 ? round(actualChargePowerW / requested * 100, 1) : null;
  const deviationW = expected !== null && actualChargePowerW > 0 ? round(actualChargePowerW - expected, 0) : null;
  const deviationPercent = expected !== null && expected > 0 && deviationW !== null ? round(deviationW / expected * 100, 1) : null;
  const stressIndex = sampleConfidence === "established" && qualifiedAcceptanceSample && deviationPercent !== null ? round(Math.max(0, Math.min(100, -deviationPercent)), 1) : null;
  const throughputTodayKwh = chargedEnergyTodayKwh + dischargedEnergyTodayKwh;
  return {
    progress,
    socBin: binId,
    requestedChargePowerW: requested,
    actualChargePowerW: round(actualChargePowerW, 0),
    acceptanceRatioPercent: ratio,
    expectedAcceptancePowerW: expected === null ? null : round(expected, 0),
    acceptanceDeviationW: deviationW,
    acceptanceDeviationPercent: deviationPercent,
    qualifiedSamples: (_b = bin == null ? void 0 : bin.samples.length) != null ? _b : 0,
    confidence: sampleConfidence,
    stressIndex,
    stressStatus: stressStatus(stressIndex, sampleConfidence),
    chargedEnergyTodayKwh: round(chargedEnergyTodayKwh),
    dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
    throughputTodayKwh: round(throughputTodayKwh),
    equivalentFullCyclesToday: usableCapacityKwh > 0 ? round(throughputTodayKwh / (2 * usableCapacityKwh), 3) : null,
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
