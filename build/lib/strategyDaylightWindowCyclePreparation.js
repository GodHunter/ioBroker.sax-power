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
var strategyDaylightWindowCyclePreparation_exports = {};
__export(strategyDaylightWindowCyclePreparation_exports, {
  prepareStrategyDayDischargeCycleWithDaylightWindow: () => prepareStrategyDayDischargeCycleWithDaylightWindow
});
module.exports = __toCommonJS(strategyDaylightWindowCyclePreparation_exports);
var import_strategyDayDischargeCyclePreparation = require("./strategyDayDischargeCyclePreparation");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
async function prepareStrategyDayDischargeCycleWithDaylightWindow(reader, daylightWindowProvider, configuration, maximumForecastAgeMs, requestedDischargePowerW, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  var _a;
  const createdAt = (_a = resolverOptions.now) != null ? _a : Date.now();
  if (!Number.isFinite(createdAt)) {
    return null;
  }
  const providedWindow = await daylightWindowProvider.getDaylightWindow(
    createdAt
  );
  if (providedWindow == null || !Number.isFinite(providedWindow.startsAt) || !Number.isFinite(providedWindow.endsAt) || providedWindow.startsAt >= providedWindow.endsAt) {
    return null;
  }
  const daylightWindow = Object.freeze({
    startsAt: providedWindow.startsAt,
    endsAt: providedWindow.endsAt
  });
  const cyclePreparation = await (0, import_strategyDayDischargeCyclePreparation.prepareStrategyDayDischargeCycle)(
    reader,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    daylightWindow.startsAt,
    daylightWindow.endsAt,
    contract,
    {
      ...resolverOptions,
      now: createdAt
    }
  );
  if (cyclePreparation === null || cyclePreparation.createdAt !== createdAt || cyclePreparation.cyclePlan.evaluation.daylightWindow.startsAt !== daylightWindow.startsAt || cyclePreparation.cyclePlan.evaluation.daylightWindow.endsAt !== daylightWindow.endsAt) {
    return null;
  }
  return Object.freeze({
    createdAt,
    daylightWindow,
    cyclePreparation
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  prepareStrategyDayDischargeCycleWithDaylightWindow
});
//# sourceMappingURL=strategyDaylightWindowCyclePreparation.js.map
