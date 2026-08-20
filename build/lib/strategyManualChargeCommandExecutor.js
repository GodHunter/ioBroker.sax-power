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
var strategyManualChargeCommandExecutor_exports = {};
__export(strategyManualChargeCommandExecutor_exports, {
  executeStrategyManualChargeCommand: () => executeStrategyManualChargeCommand
});
module.exports = __toCommonJS(strategyManualChargeCommandExecutor_exports);
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyManualChargeCommandPlan = require("./strategyManualChargeCommandPlan");
async function executeStrategyManualChargeCommand(writer, commandPlan, commandContract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand) {
  const validatedPlan = (0, import_strategyManualChargeCommandPlan.createStrategyManualChargeCommandPlan)(
    commandPlan.control,
    commandContract
  );
  if (validatedPlan === null || commandPlan.createdAt !== validatedPlan.createdAt || commandPlan.stateId !== validatedPlan.stateId || commandPlan.register !== validatedPlan.register || commandPlan.valueW !== validatedPlan.valueW || commandPlan.unit !== validatedPlan.unit || commandPlan.confirmation !== validatedPlan.confirmation || commandPlan.reason !== validatedPlan.reason || commandPlan.control !== validatedPlan.control) {
    return null;
  }
  await writer.setForeignState(
    validatedPlan.stateId,
    validatedPlan.valueW,
    false
  );
  return Object.freeze({
    stateId: validatedPlan.stateId,
    register: validatedPlan.register,
    valueW: validatedPlan.valueW,
    acknowledged: false,
    reason: validatedPlan.reason,
    commandPlan
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyManualChargeCommand
});
//# sourceMappingURL=strategyManualChargeCommandExecutor.js.map
