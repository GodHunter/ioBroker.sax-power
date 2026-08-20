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
var pollInterval_exports = {};
__export(pollInterval_exports, {
  MAX_POLL_INTERVAL_SECONDS: () => MAX_POLL_INTERVAL_SECONDS,
  MIN_POLL_INTERVAL_SECONDS: () => MIN_POLL_INTERVAL_SECONDS,
  isValidPollIntervalSeconds: () => isValidPollIntervalSeconds
});
module.exports = __toCommonJS(pollInterval_exports);
const MIN_POLL_INTERVAL_SECONDS = 60;
const MAX_POLL_INTERVAL_SECONDS = Math.floor(2147483647 / 1e3);
function isValidPollIntervalSeconds(value) {
  return Number.isFinite(value) && value >= MIN_POLL_INTERVAL_SECONDS && value <= MAX_POLL_INTERVAL_SECONDS;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MAX_POLL_INTERVAL_SECONDS,
  MIN_POLL_INTERVAL_SECONDS,
  isValidPollIntervalSeconds
});
//# sourceMappingURL=pollInterval.js.map
