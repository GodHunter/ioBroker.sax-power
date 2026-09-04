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
var strategyHouseholdLoadModel_exports = {};
__export(strategyHouseholdLoadModel_exports, {
  StrategyHouseholdLoadModel: () => StrategyHouseholdLoadModel
});
module.exports = __toCommonJS(strategyHouseholdLoadModel_exports);
var import_strategyHouseholdLoadLearning = require("./strategyHouseholdLoadLearning");
function createSlots() {
  const slots = [];
  for (const dayClass of ["weekday", "weekend"]) {
    for (let slotIndex = 0; slotIndex < import_strategyHouseholdLoadLearning.HOUSEHOLD_LOAD_SLOTS_PER_DAY; slotIndex += 1) {
      slots.push((0, import_strategyHouseholdLoadLearning.createEmptyStrategyHouseholdLoadSlot)(dayClass, slotIndex));
    }
  }
  return slots;
}
function isValidSlot(slot) {
  return (slot.dayClass === "weekday" || slot.dayClass === "weekend") && Number.isInteger(slot.slotIndex) && slot.slotIndex >= 0 && slot.slotIndex < import_strategyHouseholdLoadLearning.HOUSEHOLD_LOAD_SLOTS_PER_DAY && Array.isArray(slot.samplesWh) && slot.samplesWh.every((value) => Number.isFinite(value) && value >= 0);
}
class StrategyHouseholdLoadModel {
  slots;
  constructor(snapshot) {
    this.slots = createSlots();
    if ((snapshot == null ? void 0 : snapshot.version) !== 1 || !Array.isArray(snapshot.slots)) return;
    for (const restored of snapshot.slots) {
      if (!isValidSlot(restored)) continue;
      const index = this.slotArrayIndex(restored.dayClass, restored.slotIndex);
      this.slots[index] = Object.freeze({
        dayClass: restored.dayClass,
        slotIndex: restored.slotIndex,
        samplesWh: Object.freeze([...restored.samplesWh])
      });
    }
  }
  addObservation(timestampMs, averagePowerW) {
    if (!Number.isFinite(timestampMs)) return;
    const date = new Date(timestampMs);
    const dayClass = (0, import_strategyHouseholdLoadLearning.resolveStrategyHouseholdDayClass)(date);
    const slotIndex = (0, import_strategyHouseholdLoadLearning.resolveStrategyHouseholdLoadSlotIndex)(date);
    const index = this.slotArrayIndex(dayClass, slotIndex);
    this.slots[index] = (0, import_strategyHouseholdLoadLearning.addStrategyHouseholdLoadSample)(this.slots[index], {
      timestampMs,
      averagePowerW
    });
  }
  status(now, until) {
    const dayClass = (0, import_strategyHouseholdLoadLearning.resolveStrategyHouseholdDayClass)(now);
    const slotIndex = (0, import_strategyHouseholdLoadLearning.resolveStrategyHouseholdLoadSlotIndex)(now);
    const current = (0, import_strategyHouseholdLoadLearning.estimateStrategyHouseholdLoad)(
      this.slots[this.slotArrayIndex(dayClass, slotIndex)]
    );
    const totalSamples = this.slots.reduce(
      (sum, slot) => sum + slot.samplesWh.length,
      0
    );
    const confidence = totalSamples === 0 ? "none" : current.samples >= 4 ? "established" : "learning";
    return Object.freeze({
      current,
      expectedRemainingEnergyWh: (0, import_strategyHouseholdLoadLearning.estimateRemainingStrategyHouseholdEnergyWh)(
        this.slots,
        now,
        until
      ),
      totalSamples,
      confidence
    });
  }
  snapshot() {
    return Object.freeze({
      version: 1,
      slots: Object.freeze(this.slots.map((slot) => Object.freeze({
        dayClass: slot.dayClass,
        slotIndex: slot.slotIndex,
        samplesWh: Object.freeze([...slot.samplesWh])
      })))
    });
  }
  slotArrayIndex(dayClass, slotIndex) {
    return (dayClass === "weekend" ? import_strategyHouseholdLoadLearning.HOUSEHOLD_LOAD_SLOTS_PER_DAY : 0) + slotIndex;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StrategyHouseholdLoadModel
});
//# sourceMappingURL=strategyHouseholdLoadModel.js.map
