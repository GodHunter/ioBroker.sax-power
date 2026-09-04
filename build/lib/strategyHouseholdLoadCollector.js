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
var strategyHouseholdLoadCollector_exports = {};
__export(strategyHouseholdLoadCollector_exports, {
  StrategyHouseholdLoadCollector: () => StrategyHouseholdLoadCollector
});
module.exports = __toCommonJS(strategyHouseholdLoadCollector_exports);
var import_strategyHouseholdLoadLearning = require("./strategyHouseholdLoadLearning");
function resolveSlotStartMs(timestampMs) {
  const date = new Date(timestampMs);
  date.setMinutes(
    Math.floor(date.getMinutes() / import_strategyHouseholdLoadLearning.HOUSEHOLD_LOAD_SLOT_MINUTES) * import_strategyHouseholdLoadLearning.HOUSEHOLD_LOAD_SLOT_MINUTES,
    0,
    0
  );
  return date.getTime();
}
class StrategyHouseholdLoadCollector {
  active = null;
  addObservation(timestampMs, powerW) {
    if (!Number.isFinite(timestampMs) || !Number.isFinite(powerW) || powerW < 0) {
      return null;
    }
    const date = new Date(timestampMs);
    const dayClass = (0, import_strategyHouseholdLoadLearning.resolveStrategyHouseholdDayClass)(date);
    const slotIndex = (0, import_strategyHouseholdLoadLearning.resolveStrategyHouseholdLoadSlotIndex)(date);
    const slotStartMs = resolveSlotStartMs(timestampMs);
    if (this.active === null) {
      this.active = {
        dayClass,
        slotIndex,
        slotStartMs,
        powerSumW: powerW,
        observationCount: 1
      };
      return null;
    }
    if (this.active.dayClass === dayClass && this.active.slotIndex === slotIndex && this.active.slotStartMs === slotStartMs) {
      this.active = {
        ...this.active,
        powerSumW: this.active.powerSumW + powerW,
        observationCount: this.active.observationCount + 1
      };
      return null;
    }
    const completed = Object.freeze({
      timestampMs: this.active.slotStartMs,
      averagePowerW: Math.round(
        this.active.powerSumW / this.active.observationCount
      ),
      dayClass: this.active.dayClass,
      slotIndex: this.active.slotIndex,
      observationCount: this.active.observationCount
    });
    this.active = {
      dayClass,
      slotIndex,
      slotStartMs,
      powerSumW: powerW,
      observationCount: 1
    };
    return completed;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StrategyHouseholdLoadCollector
});
//# sourceMappingURL=strategyHouseholdLoadCollector.js.map
