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
var strategyChargingStates_exports = {};
__export(strategyChargingStates_exports, {
  STRATEGY_CHARGING_STATE_IDS: () => STRATEGY_CHARGING_STATE_IDS,
  ensureStrategyChargingStates: () => ensureStrategyChargingStates,
  publishStrategyCharging: () => publishStrategyCharging,
  strategyChargingPublicationFromDecision: () => strategyChargingPublicationFromDecision
});
module.exports = __toCommonJS(strategyChargingStates_exports);
var import_strategyManualChargeStates = require("./strategyManualChargeStates");
const STRATEGY_CHARGING_STATE_IDS = Object.freeze({
  active: "strategy.charging.active",
  targetChargePowerW: "strategy.charging.targetChargePowerW",
  requiredAverageChargePowerW: "strategy.charging.requiredAverageChargePowerW",
  energyRequiredWh: "strategy.charging.energyRequiredWh",
  forecastEnergyRemainingWh: "strategy.charging.forecastEnergyRemainingWh",
  forecastMarginWh: "strategy.charging.forecastMarginWh",
  remainingDaylightMinutes: "strategy.charging.remainingDaylightMinutes",
  targetDeadlineRemainingMinutes: "strategy.charging.targetDeadlineRemainingMinutes",
  plannedSocPercent: "strategy.charging.plannedSocPercent",
  plannedSocLowerPercent: "strategy.charging.plannedSocLowerPercent",
  plannedSocUpperPercent: "strategy.charging.plannedSocUpperPercent",
  socDeviationPercent: "strategy.charging.socDeviationPercent",
  decisionReason: "strategy.charging.decisionReason",
  lastUpdate: "strategy.charging.lastUpdate",
  lastCommandAt: "strategy.charging.lastCommandAt"
});
async function ensureStrategyChargingStates(adapter) {
  await adapter.extendObjectAsync("strategy", {
    type: "channel",
    common: { name: "Battery strategy" },
    native: {}
  });
  await adapter.extendObjectAsync("strategy.charging", {
    type: "channel",
    common: { name: "Automatic charging" },
    native: {}
  });
  const definitions = [
    { id: STRATEGY_CHARGING_STATE_IDS.active, name: "Automatic charging active", desc: "Whether the automatic charging controller is active.", type: "boolean", role: "indicator" },
    { id: STRATEGY_CHARGING_STATE_IDS.targetChargePowerW, name: "Automatic charge power target", desc: "Charge power limit currently applied to SAX Power register 44.", type: "number", role: "value.power", unit: "W" },
    { id: STRATEGY_CHARGING_STATE_IDS.requiredAverageChargePowerW, name: "Required average charging power", desc: "Average charging power required to reach the configured target SOC before the target completion deadline.", type: "number", role: "value.power", unit: "W" },
    { id: STRATEGY_CHARGING_STATE_IDS.energyRequiredWh, name: "Energy required to target SOC", desc: "Usable battery energy still required to reach the configured target SOC.", type: "number", role: "value.energy", unit: "Wh" },
    { id: STRATEGY_CHARGING_STATE_IDS.forecastEnergyRemainingWh, name: "Remaining PV forecast energy", desc: "PVForecast energy remaining until the end of the day.", type: "number", role: "value.energy", unit: "Wh" },
    { id: STRATEGY_CHARGING_STATE_IDS.forecastMarginWh, name: "Forecast energy margin", desc: "Remaining forecast energy after household consumption and reserve minus battery energy still required.", type: "number", role: "value.energy", unit: "Wh" },
    { id: STRATEGY_CHARGING_STATE_IDS.remainingDaylightMinutes, name: "Remaining daylight", desc: "Minutes remaining in the current daylight window.", type: "number", role: "value.interval", unit: "min" },
    { id: STRATEGY_CHARGING_STATE_IDS.targetDeadlineRemainingMinutes, name: "Target completion deadline", desc: "Minutes remaining until the controller wants the configured target SOC reached. The deadline is one hour before sunset.", type: "number", role: "value.interval", unit: "min" },
    { id: STRATEGY_CHARGING_STATE_IDS.plannedSocPercent, name: "Planned SOC", desc: "Dynamic SOC target for the current point in the daylight window.", type: "number", role: "value", unit: "%" },
    { id: STRATEGY_CHARGING_STATE_IDS.plannedSocLowerPercent, name: "Planned SOC lower corridor", desc: "Lower limit of the dynamic SOC corridor. Falling below it triggers trajectory recovery.", type: "number", role: "value", unit: "%" },
    { id: STRATEGY_CHARGING_STATE_IDS.plannedSocUpperPercent, name: "Planned SOC upper corridor", desc: "Upper limit of the dynamic SOC corridor.", type: "number", role: "value", unit: "%" },
    { id: STRATEGY_CHARGING_STATE_IDS.socDeviationPercent, name: "SOC trajectory deviation", desc: "Actual SOC minus the current dynamic planned SOC.", type: "number", role: "value", unit: "%" },
    { id: STRATEGY_CHARGING_STATE_IDS.decisionReason, name: "Automatic charging decision reason", desc: "Machine-readable reason for the current automatic charging target.", type: "string", role: "text" },
    { id: STRATEGY_CHARGING_STATE_IDS.lastUpdate, name: "Automatic charging last update", desc: "Timestamp of the latest automatic charging decision.", type: "number", role: "value.time", unit: "ms" },
    { id: STRATEGY_CHARGING_STATE_IDS.lastCommandAt, name: "Register 44 last command", desc: "Timestamp of the latest successful register 44 write.", type: "number", role: "value.time", unit: "ms" }
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
  await adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.active, {
    val: false,
    ack: true
  });
}
function strategyChargingPublicationFromDecision(decision, createdAt) {
  return Object.freeze({
    active: true,
    targetChargePowerW: decision.chargePowerLimitW,
    requiredAverageChargePowerW: decision.requiredAverageChargePowerW,
    energyRequiredWh: decision.energyRequiredWh,
    forecastEnergyRemainingWh: decision.forecastEnergyRemainingWh,
    forecastMarginWh: decision.forecastMarginWh,
    remainingDaylightMinutes: decision.remainingDaylightMs / 6e4,
    targetDeadlineRemainingMinutes: decision.targetDeadlineRemainingMs / 6e4,
    plannedSocPercent: decision.plannedSocPercent,
    plannedSocLowerPercent: decision.plannedSocLowerPercent,
    plannedSocUpperPercent: decision.plannedSocUpperPercent,
    socDeviationPercent: decision.socDeviationPercent,
    decisionReason: decision.reason,
    lastUpdate: createdAt,
    lastCommandAt: createdAt
  });
}
async function publishStrategyCharging(adapter, publication) {
  await Promise.all([
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.active, { val: publication.active, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.targetChargePowerW, { val: publication.targetChargePowerW, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.requiredAverageChargePowerW, { val: publication.requiredAverageChargePowerW, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.energyRequiredWh, { val: publication.energyRequiredWh, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.forecastEnergyRemainingWh, { val: publication.forecastEnergyRemainingWh, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.forecastMarginWh, { val: publication.forecastMarginWh, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.remainingDaylightMinutes, { val: publication.remainingDaylightMinutes, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.targetDeadlineRemainingMinutes, { val: publication.targetDeadlineRemainingMinutes, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.plannedSocPercent, { val: publication.plannedSocPercent, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.plannedSocLowerPercent, { val: publication.plannedSocLowerPercent, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.plannedSocUpperPercent, { val: publication.plannedSocUpperPercent, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.socDeviationPercent, { val: publication.socDeviationPercent, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.decisionReason, { val: publication.decisionReason, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.lastUpdate, { val: publication.lastUpdate, ack: true }),
    adapter.setStateAsync(STRATEGY_CHARGING_STATE_IDS.lastCommandAt, { val: publication.lastCommandAt, ack: true }),
    adapter.setStateAsync(import_strategyManualChargeStates.STRATEGY_MANUAL_CHARGE_STATE_IDS.targetChargePowerW, { val: publication.targetChargePowerW, ack: true }),
    adapter.setStateAsync(import_strategyManualChargeStates.STRATEGY_MANUAL_CHARGE_STATE_IDS.decisionReason, { val: publication.decisionReason, ack: true })
  ]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_CHARGING_STATE_IDS,
  ensureStrategyChargingStates,
  publishStrategyCharging,
  strategyChargingPublicationFromDecision
});
//# sourceMappingURL=strategyChargingStates.js.map
