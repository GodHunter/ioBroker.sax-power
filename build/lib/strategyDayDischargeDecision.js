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
var strategyDayDischargeDecision_exports = {};
__export(strategyDayDischargeDecision_exports, {
  createStrategyDayDischargeDecision: () => createStrategyDayDischargeDecision
});
module.exports = __toCommonJS(strategyDayDischargeDecision_exports);
var import_strategyDayDischargeChargeTime = require("./strategyDayDischargeChargeTime");
var import_strategyDayDischargePermission = require("./strategyDayDischargePermission");
var import_strategyDayDischargePowerTarget = require("./strategyDayDischargePowerTarget");
var import_strategyPvEnergyBudget = require("./strategyPvEnergyBudget");
var import_strategyPvForecastFreshness = require("./strategyPvForecastFreshness");
var import_strategySafetyEnvelope = require("./strategySafetyEnvelope");
function createStrategyDayDischargeDecision(snapshot, configuration, maximumForecastAgeMs, requestedDischargePowerW, daylightWindowEndsAt, chargeTimeRequired = true) {
  const safetyEnvelope = (0, import_strategySafetyEnvelope.createStrategySafetyEnvelope)(
    snapshot,
    configuration
  );
  if (safetyEnvelope === null) {
    return null;
  }
  const pvEnergyBudget = (0, import_strategyPvEnergyBudget.createStrategyPvEnergyBudget)(
    snapshot,
    configuration,
    safetyEnvelope
  );
  if (pvEnergyBudget === null) {
    return null;
  }
  const pvForecastFreshness = (0, import_strategyPvForecastFreshness.assessStrategyPvForecastFreshness)(
    snapshot,
    maximumForecastAgeMs
  );
  if (pvForecastFreshness === null) {
    return null;
  }
  const chargeTime = (0, import_strategyDayDischargeChargeTime.assessStrategyDayDischargeChargeTime)(
    safetyEnvelope,
    pvEnergyBudget,
    configuration,
    daylightWindowEndsAt
  );
  if (chargeTime === null) {
    return null;
  }
  const permission = (0, import_strategyDayDischargePermission.createStrategyDayDischargePermission)(
    safetyEnvelope,
    pvEnergyBudget,
    pvForecastFreshness,
    chargeTime,
    chargeTimeRequired
  );
  if (permission === null) {
    return null;
  }
  const powerTarget = (0, import_strategyDayDischargePowerTarget.createStrategyDayDischargePowerTarget)(
    permission,
    requestedDischargePowerW
  );
  if (powerTarget === null) {
    return null;
  }
  return Object.freeze({
    createdAt: snapshot.createdAt,
    safetyEnvelope,
    pvEnergyBudget,
    pvForecastFreshness,
    chargeTime,
    permission,
    powerTarget
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyDayDischargeDecision
});
//# sourceMappingURL=strategyDayDischargeDecision.js.map
