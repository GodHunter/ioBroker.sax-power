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
var strategyStateResolver_exports = {};
__export(strategyStateResolver_exports, {
  resolveStrategyState: () => resolveStrategyState,
  resolveStrategyStates: () => resolveStrategyStates
});
module.exports = __toCommonJS(strategyStateResolver_exports);
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
const DEFAULT_MAXIMUM_STATE_AGE_MS = 15 * 60 * 1e3;
const DEFAULT_MAXIMUM_TIMESTAMP_AGE_MS = 60 * 60 * 1e3;
function unavailable(contract, reason) {
  return {
    stateId: contract.stateId,
    contract,
    available: false,
    value: null,
    reason
  };
}
function available(contract, value) {
  return {
    stateId: contract.stateId,
    contract,
    available: true,
    value,
    reason: null
  };
}
function parseTimestamp(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }
  const parsedValue = Date.parse(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}
function isStale(timestamp, now, maximumAgeMs) {
  return typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp > now || now - timestamp > maximumAgeMs;
}
async function resolveState(reader, contract, now, maximumStateAgeMs, maximumTimestampAgeMs) {
  const object = await reader.getForeignObjectAsync(contract.stateId);
  if (!object) {
    return unavailable(contract, "object-missing");
  }
  if (contract.access === "command") {
    return available(contract, null);
  }
  const state = await reader.getForeignStateAsync(contract.stateId);
  if (!state) {
    return unavailable(contract, "state-missing");
  }
  if (state.val === null || state.val === void 0) {
    return unavailable(contract, "value-missing");
  }
  if (state.q !== void 0 && state.q !== 0) {
    return unavailable(contract, "bad-quality");
  }
  if (state.ack !== true) {
    return unavailable(contract, "not-acknowledged");
  }
  if (isStale(state.ts, now, maximumStateAgeMs)) {
    return unavailable(contract, "stale");
  }
  if (contract.unit === "timestamp") {
    const timestamp = parseTimestamp(state.val);
    if (timestamp === null) {
      return unavailable(contract, "invalid-timestamp");
    }
    if (isStale(timestamp, now, maximumTimestampAgeMs)) {
      return unavailable(contract, "stale");
    }
    return available(contract, timestamp);
  }
  if (typeof state.val !== "number" || !Number.isFinite(state.val)) {
    return unavailable(contract, "invalid-number");
  }
  return available(contract, state.val);
}
async function resolveStrategyState(reader, contract, options = {}) {
  var _a, _b, _c;
  const now = (_a = options.now) != null ? _a : Date.now();
  const maximumStateAgeMs = (_b = options.maximumStateAgeMs) != null ? _b : DEFAULT_MAXIMUM_STATE_AGE_MS;
  const maximumTimestampAgeMs = (_c = options.maximumTimestampAgeMs) != null ? _c : DEFAULT_MAXIMUM_TIMESTAMP_AGE_MS;
  return resolveState(
    reader,
    contract,
    now,
    maximumStateAgeMs,
    maximumTimestampAgeMs
  );
}
async function resolveStrategyStates(reader, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, options = {}) {
  var _a, _b, _c;
  const now = (_a = options.now) != null ? _a : Date.now();
  const maximumStateAgeMs = (_b = options.maximumStateAgeMs) != null ? _b : DEFAULT_MAXIMUM_STATE_AGE_MS;
  const maximumTimestampAgeMs = (_c = options.maximumTimestampAgeMs) != null ? _c : DEFAULT_MAXIMUM_TIMESTAMP_AGE_MS;
  const resolve = (stateContract) => resolveStrategyState(reader, stateContract, {
    now,
    maximumStateAgeMs,
    maximumTimestampAgeMs
  });
  const [
    dischargePowerCommand,
    chargePowerCommand,
    operatingState,
    stateOfCharge,
    batteryPower,
    smartMeterPower,
    energyNowUntilEndOfDay,
    energyToday,
    energyTomorrow,
    lastUpdated
  ] = await Promise.all([
    resolve(contract.modbus.dischargePowerCommand),
    resolve(contract.modbus.chargePowerCommand),
    resolve(contract.modbus.operatingState),
    resolve(contract.modbus.stateOfCharge),
    resolve(contract.modbus.batteryPower),
    resolve(contract.modbus.smartMeterPower),
    resolve(contract.pvForecast.energyNowUntilEndOfDay),
    resolve(contract.pvForecast.energyToday),
    resolve(contract.pvForecast.energyTomorrow),
    resolve(contract.pvForecast.lastUpdated)
  ]);
  const modbus = {
    dischargePowerCommand,
    chargePowerCommand,
    operatingState,
    stateOfCharge,
    batteryPower,
    smartMeterPower
  };
  const pvForecast = {
    energyNowUntilEndOfDay,
    energyToday,
    energyTomorrow,
    lastUpdated
  };
  const requiredModbusStates = [
    chargePowerCommand,
    operatingState,
    stateOfCharge,
    batteryPower,
    smartMeterPower
  ];
  const requiredStates = [
    ...requiredModbusStates,
    ...Object.values(pvForecast)
  ];
  const modbusReady = requiredModbusStates.every(
    ({ available: stateAvailable }) => stateAvailable
  );
  const pvForecastReady = Object.values(pvForecast).every(
    ({ available: stateAvailable }) => stateAvailable
  );
  return {
    modbus,
    pvForecast,
    modbusReady,
    pvForecastReady,
    strategyInputsReady: modbusReady && pvForecastReady,
    unavailableStateIds: requiredStates.filter(({ available: stateAvailable }) => !stateAvailable).map(({ stateId }) => stateId)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  resolveStrategyState,
  resolveStrategyStates
});
//# sourceMappingURL=strategyStateResolver.js.map
