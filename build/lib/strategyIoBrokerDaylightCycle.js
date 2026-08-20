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
var strategyIoBrokerDaylightCycle_exports = {};
__export(strategyIoBrokerDaylightCycle_exports, {
  executeStrategyIoBrokerDaylightCycle: () => executeStrategyIoBrokerDaylightCycle
});
module.exports = __toCommonJS(strategyIoBrokerDaylightCycle_exports);
var import_strategyIoBrokerCycleExecution = require("./strategyIoBrokerCycleExecution");
var import_strategyIoBrokerDaylightWindow = require("./strategyIoBrokerDaylightWindow");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
async function executeStrategyIoBrokerDaylightCycle(adapter, configuration, maximumForecastAgeMs, requestedDischargePowerW, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  const daylightWindowProvider = (0, import_strategyIoBrokerDaylightWindow.createStrategyIoBrokerDaylightWindowProvider)(adapter);
  return (0, import_strategyIoBrokerCycleExecution.executeStrategyIoBrokerDayDischargeCycle)(
    adapter,
    daylightWindowProvider,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    contract,
    resolverOptions
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyIoBrokerDaylightCycle
});
//# sourceMappingURL=strategyIoBrokerDaylightCycle.js.map
