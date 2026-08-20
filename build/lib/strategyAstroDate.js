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
var strategyAstroDate_exports = {};
__export(strategyAstroDate_exports, {
  resolveStrategyAstroDate: () => resolveStrategyAstroDate
});
module.exports = __toCommonJS(strategyAstroDate_exports);
var import_suncalc = __toESM(require("suncalc"));
function invalidDate() {
  return new Date(Number.NaN);
}
function resolveStrategyAstroDate(event, date, latitude, longitude, offsetMinutes = 0) {
  if (!Number.isFinite(date.getTime()) || typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(offsetMinutes)) {
    return invalidDate();
  }
  const times = import_suncalc.default.getTimes(date, latitude, longitude);
  const result = times[event];
  if (result === null) return invalidDate();
  const timestamp = result.getTime() + offsetMinutes * 6e4;
  return Number.isFinite(timestamp) ? new Date(timestamp) : invalidDate();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  resolveStrategyAstroDate
});
//# sourceMappingURL=strategyAstroDate.js.map
