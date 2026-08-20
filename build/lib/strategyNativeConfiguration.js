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
var strategyNativeConfiguration_exports = {};
__export(strategyNativeConfiguration_exports, {
  strategyRuntimeConfigurationFromNative: () => strategyRuntimeConfigurationFromNative
});
module.exports = __toCommonJS(strategyNativeConfiguration_exports);
function strategyRuntimeConfigurationFromNative(native) {
  var _a, _b, _c, _d;
  return Object.freeze({
    enabled: (_a = native.strategyEnabled) != null ? _a : false,
    modbusInstance: native.strategyModbusInstance,
    batteryModelId: native.strategyBatteryModelId,
    minimumStateOfChargePercent: native.strategyMinimumStateOfChargePercent,
    maximumStateOfChargePercent: native.strategyMaximumStateOfChargePercent,
    maximumChargePowerW: native.strategyMaximumChargePowerW,
    maximumDischargePowerW: native.strategyMaximumDischargePowerW,
    pvForecastReserveWh: native.strategyPvForecastReserveWh,
    maximumForecastAgeMs: native.strategyMaximumForecastAgeMs,
    requestedDischargePowerW: native.strategyRequestedDischargePowerW,
    intervalMs: native.strategyIntervalMs,
    chargingControlEnabled: (_b = native.strategyChargingControlEnabled) != null ? _b : true,
    dayAvailabilityEnabled: (_c = native.strategyDayAvailabilityEnabled) != null ? _c : true,
    nightDischargeEnabled: (_d = native.strategyNightDischargeEnabled) != null ? _d : false
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  strategyRuntimeConfigurationFromNative
});
//# sourceMappingURL=strategyNativeConfiguration.js.map
