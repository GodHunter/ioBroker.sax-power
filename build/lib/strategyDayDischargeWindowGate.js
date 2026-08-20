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
var strategyDayDischargeWindowGate_exports = {};
__export(strategyDayDischargeWindowGate_exports, {
  applyStrategyDayDischargeWindowGate: () => applyStrategyDayDischargeWindowGate
});
module.exports = __toCommonJS(strategyDayDischargeWindowGate_exports);
function applyStrategyDayDischargeWindowGate(decision, daylightWindow) {
  const decisionTargetW = decision.powerTarget.targetDischargePowerW;
  if (!Number.isFinite(decision.createdAt) || !Number.isFinite(decisionTargetW) || decisionTargetW < 0 || !Number.isFinite(daylightWindow.evaluatedAt) || !Number.isFinite(daylightWindow.startsAt) || !Number.isFinite(daylightWindow.endsAt) || daylightWindow.startsAt >= daylightWindow.endsAt || daylightWindow.evaluatedAt !== decision.createdAt || daylightWindow.active !== (daylightWindow.evaluatedAt >= daylightWindow.startsAt && daylightWindow.evaluatedAt < daylightWindow.endsAt) || daylightWindow.active && daylightWindow.reason !== "within-daylight-window" || !daylightWindow.active && daylightWindow.evaluatedAt < daylightWindow.startsAt && daylightWindow.reason !== "before-daylight-window" || !daylightWindow.active && daylightWindow.evaluatedAt >= daylightWindow.endsAt && daylightWindow.reason !== "after-daylight-window") {
    return null;
  }
  const targetDischargePowerW = daylightWindow.active ? decisionTargetW : 0;
  const reason = daylightWindow.active ? "daylight-window-active" : daylightWindow.evaluatedAt < daylightWindow.startsAt ? "before-daylight-window" : "after-daylight-window";
  return Object.freeze({
    createdAt: decision.createdAt,
    daylightWindow,
    decision,
    targetDischargePowerW,
    limitedByDaylightWindow: targetDischargePowerW !== decisionTargetW,
    reason
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyStrategyDayDischargeWindowGate
});
//# sourceMappingURL=strategyDayDischargeWindowGate.js.map
