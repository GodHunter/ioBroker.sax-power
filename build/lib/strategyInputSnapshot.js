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
var strategyInputSnapshot_exports = {};
__export(strategyInputSnapshot_exports, {
  createStrategyInputSnapshot: () => createStrategyInputSnapshot
});
module.exports = __toCommonJS(strategyInputSnapshot_exports);
function resolvedNumber(state) {
  if (!state.available || state.reason !== null || state.value === null || !Number.isFinite(state.value)) {
    return null;
  }
  return state.value;
}
function createStrategyInputSnapshot(resolution, createdAt = Date.now()) {
  if (!Number.isFinite(createdAt)) {
    return null;
  }
  const operatingState = resolvedNumber(resolution.modbus.operatingState);
  const stateOfChargePercent = resolvedNumber(
    resolution.modbus.stateOfCharge
  );
  const batteryPowerW = resolvedNumber(resolution.modbus.batteryPower);
  const smartMeterPowerW = resolvedNumber(resolution.modbus.smartMeterPower);
  const energyNowUntilEndOfDayWh = resolvedNumber(
    resolution.pvForecast.energyNowUntilEndOfDay
  );
  const energyTodayWh = resolvedNumber(resolution.pvForecast.energyToday);
  const energyTomorrowWh = resolvedNumber(
    resolution.pvForecast.energyTomorrow
  );
  const lastUpdatedTimestamp = resolvedNumber(
    resolution.pvForecast.lastUpdated
  );
  if (operatingState === null || stateOfChargePercent === null || batteryPowerW === null || smartMeterPowerW === null || energyNowUntilEndOfDayWh === null || energyTodayWh === null || energyTomorrowWh === null || lastUpdatedTimestamp === null) {
    return null;
  }
  const modbus = Object.freeze({
    operatingState,
    stateOfChargePercent,
    batteryPowerW,
    smartMeterPowerW
  });
  const pvForecast = Object.freeze({
    energyNowUntilEndOfDayWh,
    energyTodayWh,
    energyTomorrowWh,
    lastUpdatedTimestamp
  });
  return Object.freeze({ createdAt, modbus, pvForecast });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyInputSnapshot
});
//# sourceMappingURL=strategyInputSnapshot.js.map
