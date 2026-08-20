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
var strategyIoBrokerManualChargeCycle_exports = {};
__export(strategyIoBrokerManualChargeCycle_exports, {
  executeStrategyIoBrokerManualChargeCycle: () => executeStrategyIoBrokerManualChargeCycle
});
module.exports = __toCommonJS(strategyIoBrokerManualChargeCycle_exports);
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyIoBrokerRuntime = require("./strategyIoBrokerRuntime");
var import_strategyManualChargeCycle = require("./strategyManualChargeCycle");
var import_strategyManualChargeSnapshot = require("./strategyManualChargeSnapshot");
async function executeStrategyIoBrokerManualChargeCycle(adapter, configuration, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  const runtime = (0, import_strategyIoBrokerRuntime.createStrategyIoBrokerRuntime)(adapter);
  const preparation = await (0, import_strategyManualChargeSnapshot.prepareStrategyManualChargeSnapshot)(
    runtime.reader,
    contract,
    resolverOptions
  );
  if (preparation === null) return null;
  return (0, import_strategyManualChargeCycle.executeStrategyManualChargeCycle)(
    adapter,
    runtime.writer,
    preparation.snapshot,
    configuration,
    contract.modbus.chargePowerCommand
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyIoBrokerManualChargeCycle
});
//# sourceMappingURL=strategyIoBrokerManualChargeCycle.js.map
