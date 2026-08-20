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
var strategyIoBrokerCycleExecution_exports = {};
__export(strategyIoBrokerCycleExecution_exports, {
  executeStrategyIoBrokerDayDischargeCycle: () => executeStrategyIoBrokerDayDischargeCycle
});
module.exports = __toCommonJS(strategyIoBrokerCycleExecution_exports);
var import_strategyDaylightWindowCycleExecution = require("./strategyDaylightWindowCycleExecution");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyIoBrokerRuntime = require("./strategyIoBrokerRuntime");
async function executeStrategyIoBrokerDayDischargeCycle(adapter, daylightWindowProvider, configuration, maximumForecastAgeMs, requestedDischargePowerW, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  const runtime = (0, import_strategyIoBrokerRuntime.createStrategyIoBrokerRuntime)(adapter);
  return (0, import_strategyDaylightWindowCycleExecution.executeStrategyDayDischargeCycleWithDaylightWindow)(
    runtime.reader,
    daylightWindowProvider,
    adapter,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    contract,
    resolverOptions
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyIoBrokerDayDischargeCycle
});
//# sourceMappingURL=strategyIoBrokerCycleExecution.js.map
