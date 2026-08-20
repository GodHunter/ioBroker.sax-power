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
var strategyDayDischargeAvailabilityStates_exports = {};
__export(strategyDayDischargeAvailabilityStates_exports, {
  STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS: () => STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS,
  createStrategyDayDischargeAvailability: () => createStrategyDayDischargeAvailability,
  ensureStrategyDayDischargeAvailabilityStates: () => ensureStrategyDayDischargeAvailabilityStates,
  publishStrategyDayDischargeAvailability: () => publishStrategyDayDischargeAvailability
});
module.exports = __toCommonJS(strategyDayDischargeAvailabilityStates_exports);
const STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS = Object.freeze({
  allowed: "strategy.dayDischarge.allowed",
  availablePowerW: "strategy.dayDischarge.availablePowerW",
  reason: "strategy.dayDischarge.reason",
  validUntil: "strategy.dayDischarge.validUntil"
});
async function ensureStrategyDayDischargeAvailabilityStates(adapter) {
  await adapter.extendObjectAsync("strategy.dayDischarge", {
    type: "channel",
    common: { name: "Day discharge availability" },
    native: {}
  });
  const definitions = [
    {
      id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.allowed,
      type: "boolean",
      role: "indicator",
      name: "Day discharge allowed",
      desc: "Whether external consumers may currently use battery energy."
    },
    {
      id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.availablePowerW,
      type: "number",
      role: "value.power",
      unit: "W",
      name: "Available day discharge power",
      desc: "Maximum battery power currently available to external consumers."
    },
    {
      id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.reason,
      type: "string",
      role: "text",
      name: "Day discharge decision reason",
      desc: "Machine-readable reason for the current availability decision."
    },
    {
      id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.validUntil,
      type: "number",
      role: "value.time",
      unit: "ms",
      name: "Day discharge availability valid until",
      desc: "Timestamp at which the current daylight availability expires."
    }
  ];
  for (const definition of definitions) {
    await adapter.extendObjectAsync(definition.id, {
      type: "state",
      common: {
        name: definition.name,
        desc: definition.desc,
        type: definition.type,
        role: definition.role,
        read: true,
        write: false,
        ...definition.unit === void 0 ? {} : { unit: definition.unit }
      },
      native: {}
    });
  }
}
function createStrategyDayDischargeAvailability(preparation) {
  const gate = preparation.cyclePreparation.cyclePlan.evaluation.windowGate;
  const availablePowerW = gate.targetDischargePowerW;
  return Object.freeze({
    createdAt: preparation.createdAt,
    allowed: availablePowerW > 0,
    availablePowerW,
    reason: gate.reason === "daylight-window-active" ? gate.decision.permission.reason : gate.reason,
    validUntil: preparation.daylightWindow.endsAt
  });
}
async function publishStrategyDayDischargeAvailability(adapter, availability) {
  await Promise.all([
    adapter.setStateAsync(
      STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.allowed,
      { val: availability.allowed, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.availablePowerW,
      { val: availability.availablePowerW, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.reason,
      { val: availability.reason, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.validUntil,
      { val: availability.validUntil, ack: true }
    )
  ]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS,
  createStrategyDayDischargeAvailability,
  ensureStrategyDayDischargeAvailabilityStates,
  publishStrategyDayDischargeAvailability
});
//# sourceMappingURL=strategyDayDischargeAvailabilityStates.js.map
