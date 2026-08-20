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
var strategyManualChargeSnapshot_exports = {};
__export(strategyManualChargeSnapshot_exports, {
  prepareStrategyManualChargeSnapshot: () => prepareStrategyManualChargeSnapshot
});
module.exports = __toCommonJS(strategyManualChargeSnapshot_exports);
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyStateResolver = require("./strategyStateResolver");
async function prepareStrategyManualChargeSnapshot(reader, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, options = {}) {
  var _a;
  const createdAt = (_a = options.now) != null ? _a : Date.now();
  if (!Number.isFinite(createdAt)) return null;
  const resolverOptions = { ...options, now: createdAt };
  const [chargePowerCommand, stateOfCharge] = await Promise.all([
    (0, import_strategyStateResolver.resolveStrategyState)(
      reader,
      contract.modbus.chargePowerCommand,
      resolverOptions
    ),
    (0, import_strategyStateResolver.resolveStrategyState)(
      reader,
      contract.modbus.stateOfCharge,
      resolverOptions
    )
  ]);
  if (!chargePowerCommand.available || chargePowerCommand.reason !== null || !stateOfCharge.available || stateOfCharge.reason !== null || stateOfCharge.value === null || !Number.isFinite(stateOfCharge.value)) {
    return null;
  }
  const resolution = Object.freeze({ chargePowerCommand, stateOfCharge });
  const snapshot = Object.freeze({
    createdAt,
    modbus: Object.freeze({
      stateOfChargePercent: stateOfCharge.value
    })
  });
  return Object.freeze({ createdAt, resolution, snapshot });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  prepareStrategyManualChargeSnapshot
});
//# sourceMappingURL=strategyManualChargeSnapshot.js.map
