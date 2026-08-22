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
var strategyChargingShadowStates_exports = {};
__export(strategyChargingShadowStates_exports, {
  STRATEGY_CHARGING_SHADOW_STATE_IDS: () => STRATEGY_CHARGING_SHADOW_STATE_IDS,
  ensureStrategyChargingShadowStates: () => ensureStrategyChargingShadowStates,
  publishStrategyChargingShadowDecision: () => publishStrategyChargingShadowDecision,
  publishStrategyChargingShadowUnavailable: () => publishStrategyChargingShadowUnavailable
});
module.exports = __toCommonJS(strategyChargingShadowStates_exports);
const STRATEGY_CHARGING_SHADOW_STATE_IDS = Object.freeze({
  active: "strategy.shadowCharging.active",
  recommendedChargePowerW: "strategy.shadowCharging.recommendedChargePowerW",
  requiredAverageChargePowerW: "strategy.shadowCharging.requiredAverageChargePowerW",
  energyRequiredWh: "strategy.shadowCharging.energyRequiredWh",
  forecastEnergyRemainingWh: "strategy.shadowCharging.forecastEnergyRemainingWh",
  forecastMarginWh: "strategy.shadowCharging.forecastMarginWh",
  remainingDaylightMinutes: "strategy.shadowCharging.remainingDaylightMinutes",
  decisionReason: "strategy.shadowCharging.decisionReason",
  wouldWriteRegister44: "strategy.shadowCharging.wouldWriteRegister44",
  lastUpdate: "strategy.shadowCharging.lastUpdate"
});
const DEFINITIONS = Object.freeze([
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.active,
    type: "boolean",
    role: "indicator",
    name: "Shadow charging active",
    description: "Whether a valid automatic charging shadow decision is available."
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.recommendedChargePowerW,
    type: "number",
    role: "value.power",
    name: "Recommended charging power",
    description: "Charging power limit that the strategy would apply in active mode.",
    unit: "W"
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.requiredAverageChargePowerW,
    type: "number",
    role: "value.power",
    name: "Required average charging power",
    description: "Average charging power required to reach the configured target SOC during the remaining daylight window.",
    unit: "W"
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.energyRequiredWh,
    type: "number",
    role: "value.energy",
    name: "Energy required to target SOC",
    description: "Usable battery energy still required to reach the configured target SOC.",
    unit: "Wh"
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastEnergyRemainingWh,
    type: "number",
    role: "value.energy",
    name: "Remaining PV forecast energy",
    description: "PVForecast energy remaining until the end of the day.",
    unit: "Wh"
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastMarginWh,
    type: "number",
    role: "value.energy",
    name: "Forecast energy margin",
    description: "Remaining forecast energy after reserve minus battery energy still required.",
    unit: "Wh"
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.remainingDaylightMinutes,
    type: "number",
    role: "value.interval",
    name: "Remaining daylight",
    description: "Minutes remaining in the current daylight window.",
    unit: "min"
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.decisionReason,
    type: "string",
    role: "text",
    name: "Shadow charging decision reason",
    description: "Machine-readable reason for the current charging recommendation."
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.wouldWriteRegister44,
    type: "boolean",
    role: "indicator",
    name: "Register 44 write enabled",
    description: "Safety indicator. This remains false while shadow mode is active."
  },
  {
    id: STRATEGY_CHARGING_SHADOW_STATE_IDS.lastUpdate,
    type: "number",
    role: "value.time",
    name: "Shadow charging last update",
    description: "Timestamp of the latest shadow charging decision."
  }
]);
async function ensureStrategyChargingShadowStates(adapter) {
  await adapter.extendObjectAsync("strategy", {
    type: "channel",
    common: { name: "Battery strategy" },
    native: {}
  });
  await adapter.extendObjectAsync("strategy.shadowCharging", {
    type: "channel",
    common: { name: "Shadow charging" },
    native: {}
  });
  for (const definition of DEFINITIONS) {
    await adapter.extendObjectAsync(definition.id, {
      type: "state",
      common: {
        name: definition.name,
        desc: definition.description,
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
async function publishStrategyChargingShadowUnavailable(adapter, reason, createdAt) {
  await Promise.all([
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.active,
      { val: false, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.recommendedChargePowerW,
      { val: 0, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.requiredAverageChargePowerW,
      { val: 0, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.energyRequiredWh,
      { val: 0, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastEnergyRemainingWh,
      { val: 0, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastMarginWh,
      { val: 0, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.remainingDaylightMinutes,
      { val: 0, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.decisionReason,
      { val: reason, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.wouldWriteRegister44,
      { val: false, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.lastUpdate,
      { val: createdAt, ack: true }
    )
  ]);
}
async function publishStrategyChargingShadowDecision(adapter, decision, createdAt) {
  await Promise.all([
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.active,
      { val: decision.valid, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.recommendedChargePowerW,
      { val: decision.shadowChargePowerLimitW, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.requiredAverageChargePowerW,
      { val: decision.requiredAverageChargePowerW, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.energyRequiredWh,
      { val: decision.energyRequiredWh, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastEnergyRemainingWh,
      { val: decision.forecastEnergyRemainingWh, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastMarginWh,
      { val: decision.forecastMarginWh, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.remainingDaylightMinutes,
      { val: Math.max(0, decision.remainingDaylightMs / 6e4), ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.decisionReason,
      { val: decision.reason, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.wouldWriteRegister44,
      { val: false, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_CHARGING_SHADOW_STATE_IDS.lastUpdate,
      { val: createdAt, ack: true }
    )
  ]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_CHARGING_SHADOW_STATE_IDS,
  ensureStrategyChargingShadowStates,
  publishStrategyChargingShadowDecision,
  publishStrategyChargingShadowUnavailable
});
//# sourceMappingURL=strategyChargingShadowStates.js.map
