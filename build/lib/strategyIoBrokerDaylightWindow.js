"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var strategyIoBrokerDaylightWindow_exports = {};
__export(strategyIoBrokerDaylightWindow_exports, {
  createStrategyIoBrokerDaylightWindowProvider: () => createStrategyIoBrokerDaylightWindowProvider
});
module.exports = __toCommonJS(strategyIoBrokerDaylightWindow_exports);
var SunCalc = __toESM(require("suncalc"));
function parseCoordinate(value) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}
async function resolveSystemCoordinates(adapter) {
  const systemConfig = await adapter.getForeignObjectAsync("system.config");
  if (systemConfig == null || systemConfig.type !== "config") return null;
  const common = systemConfig.common;
  const latitude = parseCoordinate(common.latitude);
  const longitude = parseCoordinate(common.longitude);
  if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return Object.freeze({ latitude, longitude });
}
function createStrategyIoBrokerDaylightWindowProvider(adapter) {
  return Object.freeze({
    async getDaylightWindow(cycleTimestamp) {
      if (!Number.isFinite(cycleTimestamp)) return null;
      const coordinates = await resolveSystemCoordinates(adapter);
      if (coordinates === null) return null;
      const cycleDate = new Date(cycleTimestamp);
      const times = SunCalc.getTimes(
        cycleDate,
        coordinates.latitude,
        coordinates.longitude
      );
      if (times.sunrise == null || times.sunset == null) return null;
      const startsAt = times.sunrise.getTime();
      const endsAt = times.sunset.getTime();
      if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) {
        return null;
      }
      return Object.freeze({ startsAt, endsAt });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyIoBrokerDaylightWindowProvider
});
//# sourceMappingURL=strategyIoBrokerDaylightWindow.js.map
