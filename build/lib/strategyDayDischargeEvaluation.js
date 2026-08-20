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
var strategyDayDischargeEvaluation_exports = {};
__export(strategyDayDischargeEvaluation_exports, {
  createStrategyDayDischargeEvaluation: () => createStrategyDayDischargeEvaluation
});
module.exports = __toCommonJS(strategyDayDischargeEvaluation_exports);
var import_strategyDayDischargeDecision = require("./strategyDayDischargeDecision");
var import_strategyDayDischargeWindowGate = require("./strategyDayDischargeWindowGate");
var import_strategyDaylightWindow = require("./strategyDaylightWindow");
function createStrategyDayDischargeEvaluation(snapshot, configuration, maximumForecastAgeMs, requestedDischargePowerW, daylightWindowStartsAt, daylightWindowEndsAt) {
  const daylightWindow = (0, import_strategyDaylightWindow.assessStrategyDaylightWindow)(
    snapshot.createdAt,
    daylightWindowStartsAt,
    daylightWindowEndsAt
  );
  if (daylightWindow === null) {
    return null;
  }
  const decision = (0, import_strategyDayDischargeDecision.createStrategyDayDischargeDecision)(
    snapshot,
    configuration,
    maximumForecastAgeMs,
    requestedDischargePowerW,
    daylightWindowEndsAt,
    daylightWindow.active
  );
  if (decision === null) {
    return null;
  }
  const windowGate = (0, import_strategyDayDischargeWindowGate.applyStrategyDayDischargeWindowGate)(
    decision,
    daylightWindow
  );
  if (windowGate === null) {
    return null;
  }
  return Object.freeze({
    createdAt: snapshot.createdAt,
    decision,
    daylightWindow,
    windowGate
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyDayDischargeEvaluation
});
//# sourceMappingURL=strategyDayDischargeEvaluation.js.map
