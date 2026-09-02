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
var strategyIoBrokerAutomaticChargingCycle_exports = {};
__export(strategyIoBrokerAutomaticChargingCycle_exports, {
  executeStrategyIoBrokerAutomaticChargingCycle: () => executeStrategyIoBrokerAutomaticChargingCycle
});
module.exports = __toCommonJS(strategyIoBrokerAutomaticChargingCycle_exports);
var import_strategyChargingShadow = require("./strategyChargingShadow");
var import_strategyChargingStates = require("./strategyChargingStates");
var import_strategyDaylightDiagnosticStates = require("./strategyDaylightDiagnosticStates");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
var import_strategyIoBrokerDaylightWindow = require("./strategyIoBrokerDaylightWindow");
var import_strategyIoBrokerRuntime = require("./strategyIoBrokerRuntime");
var import_strategyStateResolver = require("./strategyStateResolver");
function fallbackPublication(configuration, createdAt, reason, remainingDaylightMinutes = null) {
  return Object.freeze({
    active: true,
    targetChargePowerW: configuration.maximumChargePowerW,
    requiredAverageChargePowerW: null,
    energyRequiredWh: null,
    forecastEnergyRemainingWh: null,
    forecastMarginWh: null,
    remainingDaylightMinutes,
    decisionReason: reason,
    lastUpdate: createdAt,
    lastCommandAt: createdAt
  });
}
async function applyChargePowerTarget(adapter, configuration, contract, publication) {
  const runtime = (0, import_strategyIoBrokerRuntime.createStrategyIoBrokerRuntime)(adapter);
  const command = contract.modbus.chargePowerCommand;
  const targetChargePowerW = Math.max(
    0,
    Math.min(configuration.maximumChargePowerW, Math.round(publication.targetChargePowerW))
  );
  await runtime.writer.setForeignState(
    command.stateId,
    targetChargePowerW,
    false
  );
  await (0, import_strategyChargingStates.publishStrategyCharging)(adapter, {
    ...publication,
    targetChargePowerW,
    lastCommandAt: publication.lastUpdate
  });
  return Object.freeze({
    createdAt: publication.lastUpdate,
    targetChargePowerW,
    reason: publication.decisionReason,
    register44Written: true
  });
}
async function executeStrategyIoBrokerAutomaticChargingCycle(adapter, configuration, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  var _a;
  const createdAt = (_a = resolverOptions.now) != null ? _a : Date.now();
  if (!Number.isFinite(createdAt)) return null;
  const runtime = (0, import_strategyIoBrokerRuntime.createStrategyIoBrokerRuntime)(adapter);
  let resolution;
  try {
    resolution = await (0, import_strategyStateResolver.resolveStrategyStates)(
      runtime.reader,
      contract,
      { ...resolverOptions, now: createdAt }
    );
  } catch {
    return applyChargePowerTarget(
      adapter,
      configuration,
      contract,
      fallbackPublication(configuration, createdAt, "inputs-not-ready")
    );
  }
  if (!resolution.modbus.chargePowerCommand.available) {
    return null;
  }
  let daylightWindow;
  try {
    const daylightWindowProvider = (0, import_strategyIoBrokerDaylightWindow.createStrategyIoBrokerDaylightWindowProvider)(adapter);
    daylightWindow = await daylightWindowProvider.getDaylightWindow(createdAt);
  } catch {
    return applyChargePowerTarget(
      adapter,
      configuration,
      contract,
      fallbackPublication(configuration, createdAt, "daylight-unavailable")
    );
  }
  await (0, import_strategyDaylightDiagnosticStates.publishStrategyDaylightDiagnostics)(adapter, createdAt, daylightWindow != null ? daylightWindow : null);
  const stateOfChargePercent = resolution.modbus.stateOfCharge.value;
  if (stateOfChargePercent !== null && stateOfChargePercent < configuration.minimumStateOfChargePercent) {
    return applyChargePowerTarget(
      adapter,
      configuration,
      contract,
      fallbackPublication(configuration, createdAt, "below-minimum-soc")
    );
  }
  if (!resolution.strategyInputsReady) {
    return applyChargePowerTarget(
      adapter,
      configuration,
      contract,
      fallbackPublication(configuration, createdAt, "inputs-not-ready")
    );
  }
  if (daylightWindow == null) {
    return applyChargePowerTarget(
      adapter,
      configuration,
      contract,
      fallbackPublication(configuration, createdAt, "daylight-unavailable")
    );
  }
  const remainingDaylightMinutes = Math.max(
    0,
    (daylightWindow.endsAt - createdAt) / 6e4
  );
  if (createdAt < daylightWindow.startsAt || createdAt >= daylightWindow.endsAt) {
    return applyChargePowerTarget(
      adapter,
      configuration,
      contract,
      fallbackPublication(
        configuration,
        createdAt,
        "outside-daylight",
        remainingDaylightMinutes
      )
    );
  }
  const forecastEnergyRemainingWh = resolution.pvForecast.energyNowUntilEndOfDay.value;
  if (stateOfChargePercent === null || forecastEnergyRemainingWh === null) {
    return applyChargePowerTarget(
      adapter,
      configuration,
      contract,
      fallbackPublication(
        configuration,
        createdAt,
        "inputs-not-ready",
        remainingDaylightMinutes
      )
    );
  }
  const decision = (0, import_strategyChargingShadow.createStrategyChargingShadowDecision)(configuration, {
    stateOfChargePercent,
    forecastEnergyRemainingWh,
    remainingDaylightMs: daylightWindow.endsAt - createdAt
  });
  if (!decision.valid) {
    return applyChargePowerTarget(
      adapter,
      configuration,
      contract,
      fallbackPublication(
        configuration,
        createdAt,
        "invalid-input",
        remainingDaylightMinutes
      )
    );
  }
  return applyChargePowerTarget(
    adapter,
    configuration,
    contract,
    (0, import_strategyChargingStates.strategyChargingPublicationFromDecision)(decision, createdAt)
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeStrategyIoBrokerAutomaticChargingCycle
});
//# sourceMappingURL=strategyIoBrokerAutomaticChargingCycle.js.map
