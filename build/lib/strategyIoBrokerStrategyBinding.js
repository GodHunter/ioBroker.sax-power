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
var strategyIoBrokerStrategyBinding_exports = {};
__export(strategyIoBrokerStrategyBinding_exports, {
  createStrategyIoBrokerStrategyBinding: () => createStrategyIoBrokerStrategyBinding
});
module.exports = __toCommonJS(strategyIoBrokerStrategyBinding_exports);
var import_strategyIoBrokerStrategyLifecycle = require("./strategyIoBrokerStrategyLifecycle");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyRuntimeConfiguration = require("./strategyRuntimeConfiguration");
function createStrategyIoBrokerStrategyBinding(adapter, input, onError, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  const validation = (0, import_strategyRuntimeConfiguration.validateStrategyRuntimeConfiguration)(input);
  if (!validation.valid) {
    return Object.freeze({
      status: "invalid-configuration",
      configuration: null,
      issues: validation.issues,
      lifecycle: null
    });
  }
  if (!validation.configuration.enabled) {
    return Object.freeze({
      status: "disabled",
      configuration: validation.configuration,
      issues: validation.issues,
      lifecycle: null
    });
  }
  const configuration = validation.configuration;
  const lifecycle = (0, import_strategyIoBrokerStrategyLifecycle.createStrategyIoBrokerStrategyLifecycle)(
    adapter,
    configuration.configuration,
    configuration.maximumForecastAgeMs,
    configuration.requestedDischargePowerW,
    configuration.intervalMs,
    onError,
    contract,
    resolverOptions,
    configuration.modes,
    configuration.householdLearning
  );
  if (lifecycle === null) {
    return Object.freeze({
      status: "invalid-configuration",
      configuration: null,
      issues: Object.freeze([{
        field: "intervalMs",
        reason: "out-of-range"
      }]),
      lifecycle: null
    });
  }
  return Object.freeze({
    status: "ready",
    configuration,
    issues: validation.issues,
    lifecycle
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyIoBrokerStrategyBinding
});
//# sourceMappingURL=strategyIoBrokerStrategyBinding.js.map
