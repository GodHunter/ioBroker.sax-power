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
var strategyChargingInputGrace_exports = {};
__export(strategyChargingInputGrace_exports, {
  STRATEGY_CHARGING_INPUT_GRACE_MS: () => STRATEGY_CHARGING_INPUT_GRACE_MS,
  selectStrategyChargingInputGraceTarget: () => selectStrategyChargingInputGraceTarget
});
module.exports = __toCommonJS(strategyChargingInputGrace_exports);
const STRATEGY_CHARGING_INPUT_GRACE_MS = 6e4;
function selectStrategyChargingInputGraceTarget(snapshot, nowMs, maximumChargePowerW) {
  if (snapshot === null) return null;
  if (!Number.isFinite(nowMs) || !Number.isFinite(maximumChargePowerW) || maximumChargePowerW <= 0) return null;
  if (!Number.isFinite(snapshot.recordedAt) || !Number.isFinite(snapshot.targetChargePowerW)) return null;
  const ageMs = nowMs - snapshot.recordedAt;
  if (ageMs < 0 || ageMs > STRATEGY_CHARGING_INPUT_GRACE_MS) return null;
  return Math.max(0, Math.min(maximumChargePowerW, Math.round(snapshot.targetChargePowerW)));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_CHARGING_INPUT_GRACE_MS,
  selectStrategyChargingInputGraceTarget
});
//# sourceMappingURL=strategyChargingInputGrace.js.map
