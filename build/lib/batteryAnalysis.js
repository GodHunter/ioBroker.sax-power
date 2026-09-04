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
var batteryAnalysis_exports = {};
__export(batteryAnalysis_exports, {
  SAX_POWER_BATTERY_MODELS: () => SAX_POWER_BATTERY_MODELS,
  calculateAggregateEquivalentFullCycles: () => calculateAggregateEquivalentFullCycles,
  calculateEquivalentFullCycles: () => calculateEquivalentFullCycles,
  getBatteryModel: () => getBatteryModel
});
module.exports = __toCommonJS(batteryAnalysis_exports);
const SAX_POWER_BATTERY_MODELS = [
  {
    id: "home-5.8",
    name: "SAX Power Home 5.8 kWh",
    nominalCapacityKwh: 5.76,
    usableCapacityKwh: 5.2,
    maximumChargePowerW: 2500,
    maximumDischargePowerW: 4600
  },
  {
    id: "home-plus-7.7",
    name: "SAX Power Home Plus 7.7 kWh",
    nominalCapacityKwh: 7.68,
    usableCapacityKwh: 7,
    maximumChargePowerW: 3500,
    maximumDischargePowerW: 4600
  }
];
function getBatteryModel(id) {
  var _a;
  return (_a = SAX_POWER_BATTERY_MODELS.find((model) => model.id === id)) != null ? _a : null;
}
function calculateEquivalentFullCycles(energy, nominalCapacityKwh) {
  if (!Number.isFinite(nominalCapacityKwh) || nominalCapacityKwh <= 0) return null;
  const throughputKwh = Math.abs(energy.chargedKwh) + Math.abs(energy.dischargedKwh);
  return Math.round((throughputKwh / (2 * nominalCapacityKwh) + Number.EPSILON) * 1e3) / 1e3;
}
function calculateAggregateEquivalentFullCycles(devices) {
  if (devices.length === 0 || devices.some((device) => device.nominalCapacityKwh <= 0)) return null;
  const throughputKwh = devices.reduce(
    (sum, device) => sum + Math.abs(device.energy.chargedKwh) + Math.abs(device.energy.dischargedKwh),
    0
  );
  const capacityKwh = devices.reduce((sum, device) => sum + device.nominalCapacityKwh, 0);
  return Math.round((throughputKwh / (2 * capacityKwh) + Number.EPSILON) * 1e3) / 1e3;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SAX_POWER_BATTERY_MODELS,
  calculateAggregateEquivalentFullCycles,
  calculateEquivalentFullCycles,
  getBatteryModel
});
//# sourceMappingURL=batteryAnalysis.js.map
