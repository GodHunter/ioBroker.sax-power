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
var strategyDaylightWindowCycleExecution_exports = {};
__export(strategyDaylightWindowCycleExecution_exports, {
  executeStrategyDayDischargeCycleWithDaylightWindow: () => executeStrategyDayDischargeCycleWithDaylightWindow
});
module.exports = __toCommonJS(strategyDaylightWindowCycleExecution_exports);
var import_strategyDayDischargeAvailabilityStates = require("./strategyDayDischargeAvailabilityStates");
var import_strategyDaylightWindowCyclePreparation = require("./strategyDaylightWindowCyclePreparation");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
async function executeStrategyDayDischargeCycleWithDaylightWindow(reader, daylightWindowProvider, statusAdapter, configuration, maximumForecastAgeMs, requestedDischargePowerW, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  const preparation = await (0, import_strategyDaylightWindowCyclePreparation.prepareStrategyDayDischargeCycleWithDaylightWindow)(
    reader,
    daylightWindowProvider,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    contract,
    resolverOptions
  );
  if (preparation === null) {
    return null;
  }
  const availability = (0, import_strategyDayDischargeAvailabilityStates.createStrategyDayDischargeAvailability)(preparation);
  await (0, import_strategyDayDischargeAvailabilityStates.publishStrategyDayDischargeAvailability)(statusAdapter, availability);
  return Object.freeze({
    createdAt: preparation.createdAt,
    preparation,
    availability
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyDayDischargeCycleWithDaylightWindow
});
//# sourceMappingURL=strategyDaylightWindowCycleExecution.js.map
