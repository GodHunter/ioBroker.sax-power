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
var strategyIoBrokerDaylightWindow_exports = {};
__export(strategyIoBrokerDaylightWindow_exports, {
  createStrategyIoBrokerDaylightWindowProvider: () => createStrategyIoBrokerDaylightWindowProvider
});
module.exports = __toCommonJS(strategyIoBrokerDaylightWindow_exports);
function createStrategyIoBrokerDaylightWindowProvider(adapter) {
  return Object.freeze({
    async getDaylightWindow(cycleTimestamp) {
      if (!Number.isFinite(cycleTimestamp)) {
        return null;
      }
      const cycleDate = new Date(cycleTimestamp);
      const sunrise = adapter.getAstroDate("sunrise", cycleDate);
      const sunset = adapter.getAstroDate("sunset", cycleDate);
      const startsAt = sunrise.getTime();
      const endsAt = sunset.getTime();
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
