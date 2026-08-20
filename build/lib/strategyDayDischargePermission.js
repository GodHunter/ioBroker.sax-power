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
var strategyDayDischargePermission_exports = {};
__export(strategyDayDischargePermission_exports, {
  createStrategyDayDischargePermission: () => createStrategyDayDischargePermission
});
module.exports = __toCommonJS(strategyDayDischargePermission_exports);
function createStrategyDayDischargePermission(safetyEnvelope, pvEnergyBudget, pvForecastFreshness, chargeTime, chargeTimeRequired = true) {
  const { createdAt } = safetyEnvelope;
  if (!Number.isFinite(createdAt) || pvEnergyBudget.createdAt !== createdAt || pvForecastFreshness.createdAt !== createdAt || chargeTime.createdAt !== createdAt || typeof chargeTime.sufficient !== "boolean" || typeof chargeTimeRequired !== "boolean" || !Number.isFinite(safetyEnvelope.availableDischargeEnergyWh) || safetyEnvelope.availableDischargeEnergyWh < 0 || !Number.isFinite(safetyEnvelope.maximumDischargePowerW) || safetyEnvelope.maximumDischargePowerW < 0 || !Number.isFinite(pvEnergyBudget.permittedDayDischargeEnergyWh) || pvEnergyBudget.permittedDayDischargeEnergyWh < 0) {
    return null;
  }
  let reason = "discharge-allowed";
  if (!pvForecastFreshness.fresh) {
    reason = "forecast-stale";
  } else if (safetyEnvelope.availableDischargeEnergyWh === 0 || safetyEnvelope.maximumDischargePowerW === 0) {
    reason = "minimum-state-of-charge-reached";
  } else if (pvEnergyBudget.permittedDayDischargeEnergyWh === 0) {
    reason = "insufficient-pv-energy";
  } else if (chargeTimeRequired && !chargeTime.sufficient) {
    reason = "insufficient-charge-time";
  }
  const allowed = reason === "discharge-allowed";
  return Object.freeze({
    createdAt,
    allowed,
    reason,
    permittedDischargeEnergyWh: allowed ? Math.min(
      pvEnergyBudget.permittedDayDischargeEnergyWh,
      safetyEnvelope.availableDischargeEnergyWh
    ) : 0,
    maximumDischargePowerW: allowed ? safetyEnvelope.maximumDischargePowerW : 0
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyDayDischargePermission
});
//# sourceMappingURL=strategyDayDischargePermission.js.map
