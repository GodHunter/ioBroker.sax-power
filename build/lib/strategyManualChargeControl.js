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
var strategyManualChargeControl_exports = {};
__export(strategyManualChargeControl_exports, {
  createStrategyManualChargeControl: () => createStrategyManualChargeControl
});
module.exports = __toCommonJS(strategyManualChargeControl_exports);
var import_strategySafetyEnvelope = require("./strategySafetyEnvelope");
function createStrategyManualChargeControl(snapshot, configuration, input) {
  if (typeof input.enabled !== "boolean" || !Number.isFinite(input.requestedChargePowerW) || input.requestedChargePowerW < 0) {
    return null;
  }
  const safetyEnvelope = (0, import_strategySafetyEnvelope.createStrategySafetyEnvelope)(
    snapshot,
    configuration
  );
  if (safetyEnvelope === null) {
    return null;
  }
  if (!input.enabled) {
    return Object.freeze({
      createdAt: snapshot.createdAt,
      operatingMode: "automatic",
      automaticStrategyAllowed: true,
      requestedChargePowerW: input.requestedChargePowerW,
      targetChargePowerW: 0,
      reason: "manual-mode-disabled",
      safetyEnvelope
    });
  }
  const targetChargePowerW = Math.min(
    input.requestedChargePowerW,
    safetyEnvelope.maximumChargePowerW
  );
  let reason;
  if (safetyEnvelope.availableChargeEnergyWh === 0) {
    reason = "maximum-state-of-charge-reached";
  } else if (input.requestedChargePowerW === 0) {
    reason = "requested-charge-power-zero";
  } else if (targetChargePowerW < input.requestedChargePowerW) {
    reason = "limit-manual-charge-target";
  } else {
    reason = "apply-manual-charge-target";
  }
  return Object.freeze({
    createdAt: snapshot.createdAt,
    operatingMode: "manual-charge",
    automaticStrategyAllowed: false,
    requestedChargePowerW: input.requestedChargePowerW,
    targetChargePowerW,
    reason,
    safetyEnvelope
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyManualChargeControl
});
//# sourceMappingURL=strategyManualChargeControl.js.map
