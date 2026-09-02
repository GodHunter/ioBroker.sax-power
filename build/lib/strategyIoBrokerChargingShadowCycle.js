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
var strategyIoBrokerChargingShadowCycle_exports = {};
__export(strategyIoBrokerChargingShadowCycle_exports, {
  executeStrategyIoBrokerChargingShadowCycle: () => executeStrategyIoBrokerChargingShadowCycle
});
module.exports = __toCommonJS(strategyIoBrokerChargingShadowCycle_exports);
var import_strategyChargingShadow = require("./strategyChargingShadow");
var import_strategyChargingShadowStates = require("./strategyChargingShadowStates");
var import_strategyDaylightDiagnosticStates = require("./strategyDaylightDiagnosticStates");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyIoBrokerDaylightWindow = require("./strategyIoBrokerDaylightWindow");
var import_strategyIoBrokerRuntime = require("./strategyIoBrokerRuntime");
var import_strategyStateResolver = require("./strategyStateResolver");
async function executeStrategyIoBrokerChargingShadowCycle(adapter, configuration, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  var _a;
  const createdAt = (_a = resolverOptions.now) != null ? _a : Date.now();
  if (!Number.isFinite(createdAt)) return null;
  const runtime = (0, import_strategyIoBrokerRuntime.createStrategyIoBrokerRuntime)(adapter);
  const resolution = await (0, import_strategyStateResolver.resolveStrategyStates)(
    runtime.reader,
    contract,
    {
      ...resolverOptions,
      now: createdAt
    }
  );
  if (!resolution.strategyInputsReady) {
    await (0, import_strategyChargingShadowStates.publishStrategyChargingShadowUnavailable)(
      adapter,
      "inputs-not-ready",
      createdAt
    );
    return null;
  }
  const stateOfChargePercent = resolution.modbus.stateOfCharge.value;
  const forecastEnergyRemainingWh = resolution.pvForecast.energyNowUntilEndOfDay.value;
  if (stateOfChargePercent === null || forecastEnergyRemainingWh === null) {
    await (0, import_strategyChargingShadowStates.publishStrategyChargingShadowUnavailable)(
      adapter,
      "inputs-not-ready",
      createdAt
    );
    return null;
  }
  const daylightWindowProvider = (0, import_strategyIoBrokerDaylightWindow.createStrategyIoBrokerDaylightWindowProvider)(adapter);
  const daylightWindow = await daylightWindowProvider.getDaylightWindow(
    createdAt
  );
  await (0, import_strategyDaylightDiagnosticStates.publishStrategyDaylightDiagnostics)(
    adapter,
    createdAt,
    daylightWindow != null ? daylightWindow : null
  );
  if (daylightWindow == null || createdAt < daylightWindow.startsAt || createdAt >= daylightWindow.endsAt) {
    await (0, import_strategyChargingShadowStates.publishStrategyChargingShadowUnavailable)(
      adapter,
      "outside-daylight",
      createdAt
    );
    return null;
  }
  const decision = (0, import_strategyChargingShadow.createStrategyChargingShadowDecision)(
    configuration,
    {
      stateOfChargePercent,
      forecastEnergyRemainingWh,
      remainingDaylightMs: daylightWindow.endsAt - createdAt
    }
  );
  if (!decision.valid) {
    await (0, import_strategyChargingShadowStates.publishStrategyChargingShadowUnavailable)(
      adapter,
      "invalid-input",
      createdAt
    );
    return null;
  }
  await (0, import_strategyChargingShadowStates.publishStrategyChargingShadowDecision)(
    adapter,
    decision,
    createdAt
  );
  return Object.freeze({
    createdAt,
    decision
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyIoBrokerChargingShadowCycle
});
//# sourceMappingURL=strategyIoBrokerChargingShadowCycle.js.map
