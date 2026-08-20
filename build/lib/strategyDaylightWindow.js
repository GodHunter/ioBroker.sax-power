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
var strategyDaylightWindow_exports = {};
__export(strategyDaylightWindow_exports, {
  assessStrategyDaylightWindow: () => assessStrategyDaylightWindow
});
module.exports = __toCommonJS(strategyDaylightWindow_exports);
function assessStrategyDaylightWindow(evaluatedAt, startsAt, endsAt) {
  if (!Number.isFinite(evaluatedAt) || !Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) {
    return null;
  }
  if (evaluatedAt < startsAt) {
    return Object.freeze({
      evaluatedAt,
      startsAt,
      endsAt,
      active: false,
      reason: "before-daylight-window"
    });
  }
  if (evaluatedAt >= endsAt) {
    return Object.freeze({
      evaluatedAt,
      startsAt,
      endsAt,
      active: false,
      reason: "after-daylight-window"
    });
  }
  return Object.freeze({
    evaluatedAt,
    startsAt,
    endsAt,
    active: true,
    reason: "within-daylight-window"
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assessStrategyDaylightWindow
});
//# sourceMappingURL=strategyDaylightWindow.js.map
