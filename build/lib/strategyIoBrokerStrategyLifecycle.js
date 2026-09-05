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
var import_strategyIoBrokerHouseholdLearningCycle = require("./strategyIoBrokerHouseholdLearningCycle");
var import_strategyHouseholdLearningStates = require("./strategyHouseholdLearningStates");
var import_strategyIoBrokerPvForecastErrorCycle = require("./strategyIoBrokerPvForecastErrorCycle");
var import_strategyPvForecastErrorStates = require("./strategyPvForecastErrorStates");
var import_strategyIoBrokerDaylightWindow = require("./strategyIoBrokerDaylightWindow");
var import_strategyIoBrokerStrategyCycleScheduler = require("./strategyIoBrokerStrategyCycleScheduler");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyManualChargeStates = require("./strategyManualChargeStates");
var import_strategyChargingStates = require("./strategyChargingStates");
var import_strategyDaylightDiagnosticStates = require("./strategyDaylightDiagnosticStates");
var import_strategyDayDischargeAvailabilityStates = require("./strategyDayDischargeAvailabilityStates");
var import_strategyPlanningStates = require("./strategyPlanningStates");
var import_strategyModes = require("./strategyModes");
const DISABLED_HOUSEHOLD_LEARNING = Object.freeze({
  enabled: false,
  pvPowerSourceMode: "none",
  pvPowerStateId: null,
  pvNominalPowerWp: null
});
function createStrategyIoBrokerStrategyLifecycle(adapter, configuration, maximumForecastAgeMs, requestedDischargePowerW, intervalMs, onError, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}, modes = import_strategyModes.DEFAULT_STRATEGY_MODES, householdLearning = DISABLED_HOUSEHOLD_LEARNING) {
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
  const householdCycle = (0, import_strategyIoBrokerHouseholdLearningCycle.createStrategyIoBrokerHouseholdLearningCycle)(adapter, {
    enabled: householdLearning.enabled,
    pvPowerStateId: householdLearning.pvPowerStateId,
    batteryPowerStateId: contract.modbus.batteryPower.stateId,
    gridPowerStateId: contract.modbus.smartMeterPower.stateId,
    pvForecastEnergyStateId: contract.pvForecast.energyNowUntilEndOfDay.stateId,
    forecastReserveWh: configuration.pvForecastReserveWh
  });
  const forecastErrorCycle = (0, import_strategyIoBrokerPvForecastErrorCycle.createStrategyIoBrokerPvForecastErrorCycle)(adapter, {
    enabled: householdLearning.enabled,
    pvPowerStateId: householdLearning.pvPowerStateId,
    forecastTodayStateId: contract.pvForecast.energyToday.stateId
  });
  let requested = false;
  let startPromise;
  let householdTimer;
  let householdRunning = false;
  const scheduleHouseholdLearning = () => {
    if (!requested || !householdLearning.enabled || householdTimer !== void 0) return;
    householdTimer = adapter.setTimeout(async () => {
      householdTimer = void 0;
      if (!requested || householdRunning) {
        scheduleHouseholdLearning();
        return;
      }
      householdRunning = true;
      try {
        const now = Date.now();
        let until = now;
        let daylight = null;
        try {
          daylight = await (0, import_strategyIoBrokerDaylightWindow.createStrategyIoBrokerDaylightWindowProvider)(adapter).getDaylightWindow(now);
          if (daylight != null && daylight.endsAt > now) until = daylight.endsAt;
        } catch {
        }
        await householdCycle.runOnce(now, until);
        if (daylight != null) {
          await forecastErrorCycle.runOnce(now, daylight.startsAt, daylight.endsAt);
        }
      } catch (error) {
        onError(error);
      } finally {
        householdRunning = false;
        scheduleHouseholdLearning();
      }
    }, intervalMs);
  };
  const start = () => {
    requested = true;
    if (startPromise !== void 0) return startPromise;
    startPromise = (async () => {
      try {
        if (modes.chargingControlEnabled || modes.dayAvailabilityEnabled || householdLearning.enabled) {
          await (0, import_strategyDaylightDiagnosticStates.ensureStrategyDaylightDiagnosticStates)(adapter);
        }
        if (modes.chargingControlEnabled) {
          await (0, import_strategyManualChargeStates.ensureStrategyManualChargeIoBrokerStates)(adapter);
          await (0, import_strategyChargingStates.ensureStrategyChargingStates)(adapter);
        }
        if (modes.dayAvailabilityEnabled) {
          await (0, import_strategyDayDischargeAvailabilityStates.ensureStrategyDayDischargeAvailabilityStates)(adapter);
        }
        if (householdLearning.enabled) {
          await (0, import_strategyHouseholdLearningStates.ensureStrategyHouseholdLearningStates)(adapter);
          await (0, import_strategyPvForecastErrorStates.ensureStrategyPvForecastErrorStates)(adapter);
          await (0, import_strategyPlanningStates.ensureStrategyPlanningStates)(adapter);
        }
        if (requested) {
          scheduler.start();
          scheduleHouseholdLearning();
        }
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
      if (householdTimer !== void 0) {
        adapter.clearTimeout(householdTimer);
        householdTimer = void 0;
      }
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyIoBrokerStrategyLifecycle
});
//# sourceMappingURL=strategyIoBrokerStrategyLifecycle.js.map
