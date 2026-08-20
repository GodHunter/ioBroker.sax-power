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
var strategyManualChargeCommandPlan_exports = {};
__export(strategyManualChargeCommandPlan_exports, {
  createStrategyManualChargeCommandPlan: () => createStrategyManualChargeCommandPlan
});
module.exports = __toCommonJS(strategyManualChargeCommandPlan_exports);
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
function isConsistentManualControl(control) {
  if (control.operatingMode !== "manual-charge" || control.automaticStrategyAllowed || !Number.isFinite(control.createdAt) || control.safetyEnvelope.createdAt !== control.createdAt || !Number.isFinite(control.requestedChargePowerW) || control.requestedChargePowerW < 0 || !Number.isFinite(control.targetChargePowerW) || control.targetChargePowerW < 0 || control.targetChargePowerW > control.safetyEnvelope.maximumChargePowerW) {
    return false;
  }
  switch (control.reason) {
    case "apply-manual-charge-target":
      return control.targetChargePowerW > 0 && control.targetChargePowerW === control.requestedChargePowerW;
    case "limit-manual-charge-target":
      return control.targetChargePowerW > 0 && control.targetChargePowerW < control.requestedChargePowerW;
    case "requested-charge-power-zero":
      return control.requestedChargePowerW === 0 && control.targetChargePowerW === 0;
    case "maximum-state-of-charge-reached":
      return control.safetyEnvelope.availableChargeEnergyWh === 0 && control.targetChargePowerW === 0;
    default:
      return false;
  }
}
function createStrategyManualChargeCommandPlan(control, commandContract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand) {
  if (!isConsistentManualControl(control) || commandContract.stateId.trim() === "" || !Number.isInteger(commandContract.register) || commandContract.register < 0 || commandContract.unit !== "W" || commandContract.access !== "command" || commandContract.confirmation !== "transient-command") {
    return null;
  }
  return Object.freeze({
    createdAt: control.createdAt,
    stateId: commandContract.stateId,
    register: commandContract.register,
    valueW: control.targetChargePowerW,
    unit: "W",
    confirmation: "transient-command",
    reason: control.targetChargePowerW === 0 ? "apply-manual-charge-stop" : "apply-manual-charge-target",
    control
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyManualChargeCommandPlan
});
//# sourceMappingURL=strategyManualChargeCommandPlan.js.map
