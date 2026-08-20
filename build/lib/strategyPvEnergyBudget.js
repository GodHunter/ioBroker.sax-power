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
var strategyPvEnergyBudget_exports = {};
__export(strategyPvEnergyBudget_exports, {
  createStrategyPvEnergyBudget: () => createStrategyPvEnergyBudget
});
module.exports = __toCommonJS(strategyPvEnergyBudget_exports);
function createStrategyPvEnergyBudget(snapshot, configuration, safetyEnvelope) {
  const forecastEnergyWh = snapshot.pvForecast.energyNowUntilEndOfDayWh;
  const reserveEnergyWh = configuration.pvForecastReserveWh;
  const requiredChargeEnergyWh = safetyEnvelope.availableChargeEnergyWh;
  if (!Number.isFinite(snapshot.createdAt) || snapshot.createdAt !== safetyEnvelope.createdAt || !Number.isFinite(forecastEnergyWh) || forecastEnergyWh < 0 || !Number.isFinite(reserveEnergyWh) || reserveEnergyWh < 0 || !Number.isFinite(requiredChargeEnergyWh) || requiredChargeEnergyWh < 0 || !Number.isFinite(safetyEnvelope.availableDischargeEnergyWh) || safetyEnvelope.availableDischargeEnergyWh < 0) {
    return null;
  }
  const usableForecastEnergyWh = Math.max(
    0,
    forecastEnergyWh - reserveEnergyWh
  );
  const forecastSurplusEnergyWh = Math.max(
    0,
    usableForecastEnergyWh - requiredChargeEnergyWh
  );
  const permittedDayDischargeEnergyWh = Math.min(
    forecastSurplusEnergyWh,
    safetyEnvelope.availableDischargeEnergyWh
  );
  return Object.freeze({
    createdAt: snapshot.createdAt,
    forecastEnergyWh,
    reserveEnergyWh,
    usableForecastEnergyWh,
    requiredChargeEnergyWh,
    forecastSurplusEnergyWh,
    permittedDayDischargeEnergyWh
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyPvEnergyBudget
});
//# sourceMappingURL=strategyPvEnergyBudget.js.map
