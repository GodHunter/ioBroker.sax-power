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
var strategyManualChargeCycle_exports = {};
__export(strategyManualChargeCycle_exports, {
  executeStrategyManualChargeCycle: () => executeStrategyManualChargeCycle
});
module.exports = __toCommonJS(strategyManualChargeCycle_exports);
var import_strategyManualChargeCommandExecutor = require("./strategyManualChargeCommandExecutor");
var import_strategyManualChargeCommandPlan = require("./strategyManualChargeCommandPlan");
var import_strategyManualChargeControl = require("./strategyManualChargeControl");
var import_strategyManualChargeStates = require("./strategyManualChargeStates");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
async function executeStrategyManualChargeCycle(adapter, writer, snapshot, configuration, commandContract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand) {
  const input = await (0, import_strategyManualChargeStates.readStrategyManualChargeInput)(adapter);
  if (input === null) {
    return null;
  }
  const control = (0, import_strategyManualChargeControl.createStrategyManualChargeControl)(
    snapshot,
    configuration,
    input
  );
  if (control === null || control.createdAt !== snapshot.createdAt) {
    return null;
  }
  await (0, import_strategyManualChargeStates.publishStrategyManualChargeStatus)(adapter, control);
  if (control.operatingMode === "automatic") {
    return Object.freeze({
      createdAt: control.createdAt,
      control,
      commandPlan: null,
      commandExecution: null
    });
  }
  const commandPlan = (0, import_strategyManualChargeCommandPlan.createStrategyManualChargeCommandPlan)(
    control,
    commandContract
  );
  if (commandPlan === null || commandPlan.control !== control) {
    return null;
  }
  const commandExecution = await (0, import_strategyManualChargeCommandExecutor.executeStrategyManualChargeCommand)(
    writer,
    commandPlan,
    commandContract
  );
  if (commandExecution === null || commandExecution.commandPlan !== commandPlan) {
    return null;
  }
  return Object.freeze({
    createdAt: control.createdAt,
    control,
    commandPlan,
    commandExecution
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyManualChargeCycle
});
//# sourceMappingURL=strategyManualChargeCycle.js.map
