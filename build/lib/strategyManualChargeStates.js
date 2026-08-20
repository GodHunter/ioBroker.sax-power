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
var strategyManualChargeStates_exports = {};
__export(strategyManualChargeStates_exports, {
  STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS: () => STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS,
  STRATEGY_MANUAL_CHARGE_STATE_IDS: () => STRATEGY_MANUAL_CHARGE_STATE_IDS,
  ensureStrategyManualChargeIoBrokerStates: () => ensureStrategyManualChargeIoBrokerStates,
  publishStrategyManualChargeStatus: () => publishStrategyManualChargeStatus,
  readStrategyManualChargeInput: () => readStrategyManualChargeInput
});
module.exports = __toCommonJS(strategyManualChargeStates_exports);
const STRATEGY_MANUAL_CHARGE_STATE_IDS = Object.freeze({
  enabled: "strategy.manualCharge.enabled",
  requestedChargePowerW: "strategy.manualCharge.requestedChargePowerW",
  operatingMode: "strategy.status.operatingMode",
  automaticStrategyAllowed: "strategy.status.automaticStrategyAllowed",
  targetChargePowerW: "strategy.status.targetChargePowerW",
  decisionReason: "strategy.status.decisionReason"
});
const STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled,
    type: "boolean",
    role: "switch.enable",
    name: "Manual charging enabled",
    description: "Enables manual charging and suspends automatic strategy control.",
    read: true,
    write: true,
    def: false
  }),
  Object.freeze({
    id: STRATEGY_MANUAL_CHARGE_STATE_IDS.requestedChargePowerW,
    type: "number",
    role: "level.power",
    unit: "W",
    name: "Requested manual charge power",
    description: "Requested charge power while manual charging is enabled.",
    read: true,
    write: true,
    def: 0
  }),
  Object.freeze({
    id: STRATEGY_MANUAL_CHARGE_STATE_IDS.operatingMode,
    type: "string",
    role: "text",
    name: "Strategy operating mode",
    description: "Currently selected automatic or manual charging mode.",
    read: true,
    write: false,
    states: Object.freeze({
      automatic: "Automatic",
      "manual-charge": "Manual charging"
    })
  }),
  Object.freeze({
    id: STRATEGY_MANUAL_CHARGE_STATE_IDS.automaticStrategyAllowed,
    type: "boolean",
    role: "indicator",
    name: "Automatic strategy allowed",
    description: "Whether automatic strategy decisions may control the battery.",
    read: true,
    write: false
  }),
  Object.freeze({
    id: STRATEGY_MANUAL_CHARGE_STATE_IDS.targetChargePowerW,
    type: "number",
    role: "value.power",
    unit: "W",
    name: "Applied charge power target",
    description: "Safety-limited charge power target selected by the strategy.",
    read: true,
    write: false
  }),
  Object.freeze({
    id: STRATEGY_MANUAL_CHARGE_STATE_IDS.decisionReason,
    type: "string",
    role: "text",
    name: "Strategy decision reason",
    description: "Machine-readable reason for the current manual charge decision.",
    read: true,
    write: false
  })
]);
async function ensureStrategyManualChargeIoBrokerStates(adapter) {
  await adapter.extendObjectAsync("strategy", {
    type: "channel",
    common: { name: "Battery strategy" },
    native: {}
  });
  await adapter.extendObjectAsync("strategy.manualCharge", {
    type: "channel",
    common: { name: "Manual charging" },
    native: {}
  });
  await adapter.extendObjectAsync("strategy.status", {
    type: "channel",
    common: { name: "Strategy status" },
    native: {}
  });
  for (const definition of STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS) {
    await adapter.extendObjectAsync(definition.id, {
      type: "state",
      common: {
        name: definition.name,
        desc: definition.description,
        type: definition.type,
        role: definition.role,
        read: definition.read,
        write: definition.write,
        ...definition.unit === void 0 ? {} : { unit: definition.unit },
        ...definition.def === void 0 ? {} : { def: definition.def },
        ...definition.states === void 0 ? {} : { states: definition.states }
      },
      native: {}
    });
  }
}
async function readStrategyManualChargeInput(adapter) {
  const [enabledState, requestedPowerState] = await Promise.all([
    adapter.getStateAsync(STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled),
    adapter.getStateAsync(
      STRATEGY_MANUAL_CHARGE_STATE_IDS.requestedChargePowerW
    )
  ]);
  if (typeof (enabledState == null ? void 0 : enabledState.val) !== "boolean" || typeof (requestedPowerState == null ? void 0 : requestedPowerState.val) !== "number" || !Number.isFinite(requestedPowerState.val) || requestedPowerState.val < 0) {
    return null;
  }
  return Object.freeze({
    enabled: enabledState.val,
    requestedChargePowerW: requestedPowerState.val
  });
}
async function publishStrategyManualChargeStatus(adapter, control) {
  await Promise.all([
    adapter.setStateAsync(
      STRATEGY_MANUAL_CHARGE_STATE_IDS.operatingMode,
      { val: control.operatingMode, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_MANUAL_CHARGE_STATE_IDS.automaticStrategyAllowed,
      { val: control.automaticStrategyAllowed, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_MANUAL_CHARGE_STATE_IDS.targetChargePowerW,
      { val: control.targetChargePowerW, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_MANUAL_CHARGE_STATE_IDS.decisionReason,
      { val: control.reason, ack: true }
    )
  ]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS,
  STRATEGY_MANUAL_CHARGE_STATE_IDS,
  ensureStrategyManualChargeIoBrokerStates,
  publishStrategyManualChargeStatus,
  readStrategyManualChargeInput
});
//# sourceMappingURL=strategyManualChargeStates.js.map
