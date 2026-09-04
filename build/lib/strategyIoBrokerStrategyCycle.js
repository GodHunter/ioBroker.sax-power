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
var strategyIoBrokerStrategyCycle_exports = {};
__export(strategyIoBrokerStrategyCycle_exports, {
  executeStrategyIoBrokerStrategyCycle: () => executeStrategyIoBrokerStrategyCycle
});
module.exports = __toCommonJS(strategyIoBrokerStrategyCycle_exports);
var import_strategyIoBrokerDaylightCycle = require("./strategyIoBrokerDaylightCycle");
var import_strategyIoBrokerManualChargeCycle = require("./strategyIoBrokerManualChargeCycle");
var import_strategyIoBrokerAutomaticChargingCycle = require("./strategyIoBrokerAutomaticChargingCycle");
var import_strategyManualChargeStates = require("./strategyManualChargeStates");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyModes = require("./strategyModes");
async function executeStrategyIoBrokerStrategyCycle(adapter, configuration, maximumForecastAgeMs, requestedDischargePowerW, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}, modes = import_strategyModes.DEFAULT_STRATEGY_MODES) {
  var _a, _b;
  const manualInput = modes.chargingControlEnabled ? await (0, import_strategyManualChargeStates.readStrategyManualChargeInput)(adapter) : null;
  if (modes.chargingControlEnabled && manualInput === null) return null;
  const manualCharge = modes.chargingControlEnabled ? await (0, import_strategyIoBrokerManualChargeCycle.executeStrategyIoBrokerManualChargeCycle)(
    adapter,
    configuration,
    contract,
    resolverOptions
  ) : null;
  if ((manualInput == null ? void 0 : manualInput.enabled) === true) {
    if (manualCharge === null) return null;
    return Object.freeze({
      createdAt: manualCharge.createdAt,
      manualCharge,
      chargingShadow: null,
      automatic: null
    });
  }
  if (modes.chargingControlEnabled && manualCharge === null) {
    await Promise.all([
      adapter.setStateAsync(
        import_strategyManualChargeStates.STRATEGY_MANUAL_CHARGE_STATE_IDS.operatingMode,
        { val: "automatic", ack: true }
      ),
      adapter.setStateAsync(
        import_strategyManualChargeStates.STRATEGY_MANUAL_CHARGE_STATE_IDS.automaticStrategyAllowed,
        { val: true, ack: true }
      )
    ]);
  }
  const chargingControl = modes.chargingControlEnabled ? await (0, import_strategyIoBrokerAutomaticChargingCycle.executeStrategyIoBrokerAutomaticChargingCycle)(
    adapter,
    configuration,
    contract,
    resolverOptions
  ) : null;
  if (!modes.dayAvailabilityEnabled) {
    return Object.freeze({
      createdAt: (_b = (_a = manualCharge == null ? void 0 : manualCharge.createdAt) != null ? _a : resolverOptions.now) != null ? _b : Date.now(),
      manualCharge,
      chargingShadow: chargingControl,
      automatic: null
    });
  }
  const automatic = await (0, import_strategyIoBrokerDaylightCycle.executeStrategyIoBrokerDaylightCycle)(
    adapter,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    contract,
    resolverOptions,
    chargingControl === null ? null : {
      reason: chargingControl.reason,
      currentSocPercent: chargingControl.currentSocPercent,
      plannedSocUpperPercent: chargingControl.plannedSocUpperPercent,
      forecastMarginWh: chargingControl.forecastMarginWh
    }
  );
  if (automatic === null || manualCharge !== null && automatic.createdAt !== manualCharge.createdAt) {
    return null;
  }
  return Object.freeze({
    createdAt: automatic.createdAt,
    manualCharge,
    chargingShadow: chargingControl,
    automatic
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyIoBrokerStrategyCycle
});
//# sourceMappingURL=strategyIoBrokerStrategyCycle.js.map
