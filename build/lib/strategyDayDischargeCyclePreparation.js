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
var strategyDayDischargeCyclePreparation_exports = {};
__export(strategyDayDischargeCyclePreparation_exports, {
  prepareStrategyDayDischargeCycle: () => prepareStrategyDayDischargeCycle
});
module.exports = __toCommonJS(strategyDayDischargeCyclePreparation_exports);
var import_strategyDayDischargeCyclePlan = require("./strategyDayDischargeCyclePlan");
var import_strategyInputSnapshot = require("./strategyInputSnapshot");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyStateResolver = require("./strategyStateResolver");
async function prepareStrategyDayDischargeCycle(reader, configuration, maximumForecastAgeMs, requestedDischargePowerW, daylightWindowStartsAt, daylightWindowEndsAt, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  var _a;
  const createdAt = (_a = resolverOptions.now) != null ? _a : Date.now();
  if (!Number.isFinite(createdAt)) {
    return null;
  }
  const resolution = await (0, import_strategyStateResolver.resolveStrategyStates)(reader, contract, {
    ...resolverOptions,
    now: createdAt
  });
  const snapshot = (0, import_strategyInputSnapshot.createStrategyInputSnapshot)(resolution, createdAt);
  if (snapshot === null) {
    return null;
  }
  const cyclePlan = (0, import_strategyDayDischargeCyclePlan.createStrategyDayDischargeCyclePlan)(
    snapshot,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    daylightWindowStartsAt,
    daylightWindowEndsAt
  );
  if (cyclePlan === null || cyclePlan.createdAt !== createdAt || cyclePlan.evaluation.createdAt !== snapshot.createdAt) {
    return null;
  }
  return Object.freeze({
    createdAt,
    resolution,
    snapshot,
    cyclePlan
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  prepareStrategyDayDischargeCycle
});
//# sourceMappingURL=strategyDayDischargeCyclePreparation.js.map
