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
var strategyDayDischargePowerTarget_exports = {};
__export(strategyDayDischargePowerTarget_exports, {
  createStrategyDayDischargePowerTarget: () => createStrategyDayDischargePowerTarget
});
module.exports = __toCommonJS(strategyDayDischargePowerTarget_exports);
function createStrategyDayDischargePowerTarget(permission, requestedDischargePowerW) {
  if (!Number.isFinite(permission.createdAt) || !Number.isFinite(requestedDischargePowerW) || requestedDischargePowerW < 0 || !Number.isFinite(permission.permittedDischargeEnergyWh) || permission.permittedDischargeEnergyWh < 0 || !Number.isFinite(permission.maximumDischargePowerW) || permission.maximumDischargePowerW < 0 || permission.allowed && (permission.permittedDischargeEnergyWh === 0 || permission.maximumDischargePowerW === 0) || !permission.allowed && (permission.permittedDischargeEnergyWh !== 0 || permission.maximumDischargePowerW !== 0)) {
    return null;
  }
  const targetDischargePowerW = permission.allowed ? Math.min(requestedDischargePowerW, permission.maximumDischargePowerW) : 0;
  return Object.freeze({
    createdAt: permission.createdAt,
    requestedDischargePowerW,
    targetDischargePowerW,
    limited: targetDischargePowerW !== requestedDischargePowerW
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyDayDischargePowerTarget
});
//# sourceMappingURL=strategyDayDischargePowerTarget.js.map
