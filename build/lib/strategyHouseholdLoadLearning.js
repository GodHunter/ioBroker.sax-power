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
var strategyHouseholdLoadLearning_exports = {};
__export(strategyHouseholdLoadLearning_exports, {
  HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT: () => HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT,
  HOUSEHOLD_LOAD_SLOTS_PER_DAY: () => HOUSEHOLD_LOAD_SLOTS_PER_DAY,
  HOUSEHOLD_LOAD_SLOT_MINUTES: () => HOUSEHOLD_LOAD_SLOT_MINUTES,
  addStrategyHouseholdLoadSample: () => addStrategyHouseholdLoadSample,
  createEmptyStrategyHouseholdLoadSlot: () => createEmptyStrategyHouseholdLoadSlot,
  estimateRemainingStrategyHouseholdEnergyWh: () => estimateRemainingStrategyHouseholdEnergyWh,
  estimateStrategyHouseholdLoad: () => estimateStrategyHouseholdLoad,
  resolveStrategyHouseholdDayClass: () => resolveStrategyHouseholdDayClass,
  resolveStrategyHouseholdLoadSlotIndex: () => resolveStrategyHouseholdLoadSlotIndex
});
module.exports = __toCommonJS(strategyHouseholdLoadLearning_exports);
const HOUSEHOLD_LOAD_SLOT_MINUTES = 15;
const HOUSEHOLD_LOAD_SLOTS_PER_DAY = 24 * 60 / HOUSEHOLD_LOAD_SLOT_MINUTES;
const HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT = 28;
function roundEnergy(value) {
  return Math.max(0, Math.round(value * 10) / 10);
}
function percentile(sorted, fraction) {
  var _a;
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return (_a = sorted[index]) != null ? _a : 0;
}
function conservativeFallbackWh(slots, dayClass) {
  const learned = slots.filter((slot) => slot.dayClass === dayClass && slot.samplesWh.length > 0).map((slot) => estimateStrategyHouseholdLoad(slot).expectedWh).filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  return roundEnergy(percentile(learned, 0.75));
}
function resolveStrategyHouseholdDayClass(date) {
  const day = date.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}
function resolveStrategyHouseholdLoadSlotIndex(date) {
  return Math.floor((date.getHours() * 60 + date.getMinutes()) / HOUSEHOLD_LOAD_SLOT_MINUTES);
}
function createEmptyStrategyHouseholdLoadSlot(dayClass, slotIndex) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= HOUSEHOLD_LOAD_SLOTS_PER_DAY) {
    throw new RangeError("invalid household load slot index");
  }
  return Object.freeze({ dayClass, slotIndex, samplesWh: Object.freeze([]) });
}
function addStrategyHouseholdLoadSample(slot, sample) {
  if (!Number.isFinite(sample.timestampMs) || !Number.isFinite(sample.averagePowerW) || sample.averagePowerW < 0) return slot;
  const date = new Date(sample.timestampMs);
  if (resolveStrategyHouseholdDayClass(date) !== slot.dayClass || resolveStrategyHouseholdLoadSlotIndex(date) !== slot.slotIndex) return slot;
  const energyWh = sample.averagePowerW * HOUSEHOLD_LOAD_SLOT_MINUTES / 60;
  const samplesWh = [...slot.samplesWh, roundEnergy(energyWh)].slice(-HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT);
  return Object.freeze({ dayClass: slot.dayClass, slotIndex: slot.slotIndex, samplesWh: Object.freeze(samplesWh) });
}
function estimateStrategyHouseholdLoad(slot) {
  var _a, _b, _c;
  const samples = slot.samplesWh.length;
  if (samples === 0) {
    return Object.freeze({ available: false, samples: 0, meanWh: 0, medianWh: 0, p75Wh: 0, expectedWh: 0 });
  }
  const sorted = [...slot.samplesWh].sort((a, b) => a - b);
  const meanWh = sorted.reduce((sum, value) => sum + value, 0) / samples;
  const medianWh = samples % 2 === 0 ? (((_a = sorted[samples / 2 - 1]) != null ? _a : 0) + ((_b = sorted[samples / 2]) != null ? _b : 0)) / 2 : (_c = sorted[Math.floor(samples / 2)]) != null ? _c : 0;
  const p75Wh = percentile(sorted, 0.75);
  const expectedWh = samples >= 4 ? p75Wh : meanWh;
  return Object.freeze({ available: true, samples, meanWh: roundEnergy(meanWh), medianWh: roundEnergy(medianWh), p75Wh: roundEnergy(p75Wh), expectedWh: roundEnergy(expectedWh) });
}
function estimateRemainingStrategyHouseholdEnergyWh(slots, from, until) {
  if (until.getTime() <= from.getTime()) return 0;
  const dayClass = resolveStrategyHouseholdDayClass(from);
  const firstSlot = resolveStrategyHouseholdLoadSlotIndex(from);
  const lastSlot = resolveStrategyHouseholdLoadSlotIndex(until);
  const fallbackWh = conservativeFallbackWh(slots, dayClass);
  let totalWh = 0;
  for (const slot of slots) {
    if (slot.dayClass !== dayClass || slot.slotIndex < firstSlot || slot.slotIndex > lastSlot) continue;
    const estimate = estimateStrategyHouseholdLoad(slot);
    totalWh += estimate.available ? estimate.expectedWh : fallbackWh;
  }
  return roundEnergy(totalWh);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT,
  HOUSEHOLD_LOAD_SLOTS_PER_DAY,
  HOUSEHOLD_LOAD_SLOT_MINUTES,
  addStrategyHouseholdLoadSample,
  createEmptyStrategyHouseholdLoadSlot,
  estimateRemainingStrategyHouseholdEnergyWh,
  estimateStrategyHouseholdLoad,
  resolveStrategyHouseholdDayClass,
  resolveStrategyHouseholdLoadSlotIndex
});
//# sourceMappingURL=strategyHouseholdLoadLearning.js.map
