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
var strategyChargeReserve_exports = {};
__export(strategyChargeReserve_exports, {
  CHARGE_RESERVE_HEADROOM_FACTOR: () => CHARGE_RESERVE_HEADROOM_FACTOR,
  createStrategyChargeReserve: () => createStrategyChargeReserve
});
module.exports = __toCommonJS(strategyChargeReserve_exports);
const CHARGE_RESERVE_HEADROOM_FACTOR = 1.1;
function createStrategyChargeReserve(strategyRequestedChargePowerW, maximumChargePowerW, currentSocPercent, learnedAcceptancePowerW) {
  const requested = Number.isFinite(strategyRequestedChargePowerW) ? Math.max(0, Math.min(maximumChargePowerW, Math.round(strategyRequestedChargePowerW))) : maximumChargePowerW;
  if (currentSocPercent !== null && Number.isFinite(currentSocPercent) && currentSocPercent >= 100) {
    return Object.freeze({ strategyRequestedChargePowerW: requested, effectiveChargeReserveW: 0, learnedAcceptancePowerW, reason: "full-soc" });
  }
  const learned = learnedAcceptancePowerW !== null && Number.isFinite(learnedAcceptancePowerW) && learnedAcceptancePowerW > 0 ? learnedAcceptancePowerW : null;
  if (learned === null) {
    return Object.freeze({ strategyRequestedChargePowerW: requested, effectiveChargeReserveW: requested, learnedAcceptancePowerW: null, reason: "strategy-target-fallback" });
  }
  const learnedLimit = Math.min(maximumChargePowerW, Math.round(learned * CHARGE_RESERVE_HEADROOM_FACTOR));
  const effective = Math.min(requested, learnedLimit);
  return Object.freeze({
    strategyRequestedChargePowerW: requested,
    effectiveChargeReserveW: effective,
    learnedAcceptancePowerW: learned,
    reason: learnedLimit < requested ? "learned-acceptance" : "strategy-target-with-learned-headroom"
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CHARGE_RESERVE_HEADROOM_FACTOR,
  createStrategyChargeReserve
});
//# sourceMappingURL=strategyChargeReserve.js.map
