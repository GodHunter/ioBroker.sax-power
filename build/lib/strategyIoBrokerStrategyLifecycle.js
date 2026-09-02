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
var strategyIoBrokerStrategyLifecycle_exports = {};
__export(strategyIoBrokerStrategyLifecycle_exports, {
  createStrategyIoBrokerStrategyLifecycle: () => createStrategyIoBrokerStrategyLifecycle
});
module.exports = __toCommonJS(strategyIoBrokerStrategyLifecycle_exports);
var import_strategyIoBrokerStrategyCycleScheduler = require("./strategyIoBrokerStrategyCycleScheduler");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyManualChargeStates = require("./strategyManualChargeStates");
var import_strategyChargingShadowStates = require("./strategyChargingShadowStates");
var import_strategyDaylightDiagnosticStates = require("./strategyDaylightDiagnosticStates");
var import_strategyDayDischargeAvailabilityStates = require("./strategyDayDischargeAvailabilityStates");
var import_strategyModes = require("./strategyModes");
function createStrategyIoBrokerStrategyLifecycle(adapter, configuration, maximumForecastAgeMs, requestedDischargePowerW, intervalMs, onError, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}, modes = import_strategyModes.DEFAULT_STRATEGY_MODES) {
  const scheduler = (0, import_strategyIoBrokerStrategyCycleScheduler.createStrategyIoBrokerStrategyCycleScheduler)(
    adapter,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    intervalMs,
    onError,
    contract,
    resolverOptions,
    modes
  );
  if (scheduler === null) return null;
  let requested = false;
  let startPromise;
  const start = () => {
    requested = true;
    if (startPromise !== void 0) return startPromise;
    startPromise = (async () => {
      try {
        if (modes.chargingControlEnabled || modes.dayAvailabilityEnabled) {
          await (0, import_strategyDaylightDiagnosticStates.ensureStrategyDaylightDiagnosticStates)(adapter);
        }
        if (modes.chargingControlEnabled) {
          await (0, import_strategyManualChargeStates.ensureStrategyManualChargeIoBrokerStates)(adapter);
          await (0, import_strategyChargingShadowStates.ensureStrategyChargingShadowStates)(adapter);
        }
        if (modes.dayAvailabilityEnabled) {
          await (0, import_strategyDayDischargeAvailabilityStates.ensureStrategyDayDischargeAvailabilityStates)(adapter);
        }
        if (requested) scheduler.start();
      } catch (error) {
        requested = false;
        throw error;
      } finally {
        startPromise = void 0;
      }
    })();
    return startPromise;
  };
  return Object.freeze({
    start,
    stop() {
      requested = false;
      scheduler.stop();
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyIoBrokerStrategyLifecycle
});
//# sourceMappingURL=strategyIoBrokerStrategyLifecycle.js.map
