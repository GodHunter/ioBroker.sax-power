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
var strategyIoBrokerReadiness_exports = {};
__export(strategyIoBrokerReadiness_exports, {
  assessStrategyIoBrokerReadiness: () => assessStrategyIoBrokerReadiness,
  formatStrategyUnavailableInputs: () => formatStrategyUnavailableInputs
});
module.exports = __toCommonJS(strategyIoBrokerReadiness_exports);
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyStateResolver = require("./strategyStateResolver");
var import_strategyModes = require("./strategyModes");
async function assessStrategyIoBrokerReadiness(reader, maximumForecastAgeMs, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, modes = import_strategyModes.DEFAULT_STRATEGY_MODES) {
  const resolution = await (0, import_strategyStateResolver.resolveStrategyStates)(
    reader,
    contract,
    { maximumTimestampAgeMs: maximumForecastAgeMs }
  );
  const resolvedStates = [
    ...modes.chargingControlEnabled ? [resolution.modbus.chargePowerCommand] : [],
    resolution.modbus.operatingState,
    resolution.modbus.stateOfCharge,
    resolution.modbus.batteryPower,
    resolution.modbus.smartMeterPower,
    ...modes.dayAvailabilityEnabled ? Object.values(resolution.pvForecast) : []
  ];
  const unavailableInputs = resolvedStates.filter((state) => !state.available && state.reason !== null).map((state) => Object.freeze({
    stateId: state.stateId,
    reason: state.reason
  }));
  return Object.freeze({
    ready: unavailableInputs.length === 0,
    unavailableInputs: Object.freeze(unavailableInputs)
  });
}
function formatStrategyUnavailableInputs(inputs) {
  return inputs.map(({ stateId, reason }) => `${stateId}:${reason}`).join(", ");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assessStrategyIoBrokerReadiness,
  formatStrategyUnavailableInputs
});
//# sourceMappingURL=strategyIoBrokerReadiness.js.map
