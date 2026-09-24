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
var strategyDayDischargeAvailabilityStates_exports = {};
__export(strategyDayDischargeAvailabilityStates_exports, {
  STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS: () => STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS,
  createStrategyDayDischargeAvailability: () => createStrategyDayDischargeAvailability,
  ensureStrategyDayDischargeAvailabilityStates: () => ensureStrategyDayDischargeAvailabilityStates,
  publishStrategyDayDischargeAvailability: () => publishStrategyDayDischargeAvailability
});
module.exports = __toCommonJS(strategyDayDischargeAvailabilityStates_exports);
const DAY_DISCHARGE_TARGET_ENERGY_HEADROOM_FACTOR = 1.25;
const DAY_DISCHARGE_RELEASE_MIN_SOC_SURPLUS_PERCENT = 1;
const DAY_DISCHARGE_RELEASE_MIN_MARGIN_WH = 500;
const DAY_DISCHARGE_RELEASE_ENERGY_HEADROOM_FACTOR = 1.5;
const DAY_DISCHARGE_RELEASE_STABILITY_MS = 5 * 6e4;
const STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS = Object.freeze({
  allowed: "strategy.dayDischarge.allowed",
  availablePowerW: "strategy.dayDischarge.availablePowerW",
  reason: "strategy.dayDischarge.reason",
  validUntil: "strategy.dayDischarge.validUntil",
  corridorRecoveryLatched: "strategy.dayDischarge.corridorRecoveryLatched",
  releaseCandidateSince: "strategy.dayDischarge.releaseCandidateSince"
});
function corridorAvailability(context) {
  const current = context.currentSocPercent;
  const planned = context.plannedSocPercent;
  const lower = context.plannedSocLowerPercent;
  const upper = context.plannedSocUpperPercent;
  if (current === null || planned === null || lower === null || upper === null || !Number.isFinite(current) || !Number.isFinite(planned) || !Number.isFinite(lower) || !Number.isFinite(upper) || lower > planned || planned > upper || lower === upper) return { factor: null, recoveryLatched: context.recoveryLatchActive === true, zone: "unavailable" };
  if (current <= lower) return { factor: 0, recoveryLatched: true, zone: "below-corridor" };
  if (context.recoveryLatchActive === true && current < planned) return { factor: 0, recoveryLatched: true, zone: "latched" };
  if (current >= upper) return { factor: 1, recoveryLatched: false, zone: "above-corridor" };
  if (current < planned) return { factor: planned === lower ? 0.5 : 0.5 * (current - lower) / (planned - lower), recoveryLatched: false, zone: "below-plan" };
  if (current === planned) return { factor: 0.5, recoveryLatched: false, zone: "plan" };
  return { factor: upper === planned ? 1 : 0.5 + 0.5 * (current - planned) / (upper - planned), recoveryLatched: false, zone: "above-plan" };
}
function releaseQualification(context, corridor, createdAt) {
  if (context.previousAllowed !== false) return { qualified: true, candidateSince: null, reason: null };
  if (corridor.zone === "above-corridor") return { qualified: true, candidateSince: null, reason: null };
  const current = context.currentSocPercent;
  const planned = context.plannedSocPercent;
  const margin = context.forecastMarginWh;
  const required = context.energyRequiredWh;
  if (current === null || planned === null || margin === null || !Number.isFinite(current) || !Number.isFinite(planned) || !Number.isFinite(margin)) return { qualified: false, candidateSince: null, reason: "release-surplus-insufficient" };
  const requiredMargin = Math.max(DAY_DISCHARGE_RELEASE_MIN_MARGIN_WH, required !== null && Number.isFinite(required) && required > 0 ? required * DAY_DISCHARGE_RELEASE_ENERGY_HEADROOM_FACTOR : 0);
  if (current - planned < DAY_DISCHARGE_RELEASE_MIN_SOC_SURPLUS_PERCENT || margin < requiredMargin) return { qualified: false, candidateSince: null, reason: "release-surplus-insufficient" };
  const candidateSince = context.releaseCandidateSince !== null && context.releaseCandidateSince !== void 0 && Number.isFinite(context.releaseCandidateSince) && context.releaseCandidateSince <= createdAt ? context.releaseCandidateSince : createdAt;
  if (createdAt - candidateSince < DAY_DISCHARGE_RELEASE_STABILITY_MS) return { qualified: false, candidateSince, reason: "release-stability-pending" };
  return { qualified: true, candidateSince: null, reason: null };
}
async function ensureStrategyDayDischargeAvailabilityStates(adapter) {
  await adapter.extendObjectAsync("strategy.dayDischarge", { type: "channel", common: { name: "Day discharge availability" }, native: {} });
  const definitions = [
    { id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.allowed, type: "boolean", role: "indicator", name: "Day discharge allowed", desc: "Whether external consumers may currently use battery energy." },
    { id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.availablePowerW, type: "number", role: "value.power", unit: "W", name: "Available day discharge power", desc: "Maximum battery power currently available to external consumers." },
    { id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.reason, type: "string", role: "text", name: "Day discharge decision reason", desc: "Machine-readable reason for the current availability decision." },
    { id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.validUntil, type: "number", role: "value.time", unit: "ms", name: "Day discharge availability valid until", desc: "Timestamp at which the current daylight availability expires." },
    { id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.corridorRecoveryLatched, type: "boolean", role: "indicator", name: "SOC corridor recovery latched", desc: "True after SOC reached or crossed the lower corridor boundary; day discharge remains blocked until planned SOC is reached again." },
    { id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.releaseCandidateSince, type: "number", role: "value.time", unit: "ms", name: "Day discharge release candidate since", desc: "Timestamp since which a marginal release has continuously met the qualified surplus conditions; zero when no candidate is pending." }
  ];
  for (const definition of definitions) await adapter.extendObjectAsync(definition.id, { type: "state", common: { name: definition.name, desc: definition.desc, type: definition.type, role: definition.role, read: true, write: false, ...definition.unit === void 0 ? {} : { unit: definition.unit } }, native: {} });
}
function createStrategyDayDischargeAvailability(preparation, chargingContext = null) {
  var _a;
  const gate = preparation.cyclePreparation.cyclePlan.evaluation.windowGate;
  let availablePowerW = gate.targetDischargePowerW;
  let reason = gate.reason === "daylight-window-active" ? gate.decision.permission.reason : gate.reason;
  let corridorRecoveryLatched = (chargingContext == null ? void 0 : chargingContext.recoveryLatchActive) === true;
  let releaseCandidateSince = null;
  const corridor = chargingContext === null ? null : corridorAvailability(chargingContext);
  if (corridor !== null) corridorRecoveryLatched = corridor.recoveryLatched;
  if (availablePowerW <= 0 && reason === "insufficient-charge-time" && chargingContext !== null && chargingContext.forecastMarginWh !== null && Number.isFinite(chargingContext.forecastMarginWh) && chargingContext.forecastMarginWh > 0 && Number.isFinite(chargingContext.requestedDischargePowerW) && chargingContext.requestedDischargePowerW > 0) {
    availablePowerW = Math.round(chargingContext.requestedDischargePowerW);
    reason = "trajectory-budget-reconsidered";
  }
  if (availablePowerW > 0 && chargingContext !== null) {
    const hardBlock = chargingContext.reason === "target-soc-reached" || chargingContext.reason === "target-soc-maintenance" || chargingContext.reason === "below-minimum-soc" || chargingContext.reason === "inputs-not-ready" || chargingContext.reason === "invalid-input" || chargingContext.reason === "daylight-unavailable" || chargingContext.reason === "outside-daylight";
    const energyBudgetExhausted = chargingContext.forecastMarginWh === null || !Number.isFinite(chargingContext.forecastMarginWh) || chargingContext.forecastMarginWh <= 0;
    const targetEnergyHeadroomRequired = chargingContext.currentSocPercent !== null && chargingContext.plannedSocPercent !== null && Number.isFinite(chargingContext.currentSocPercent) && Number.isFinite(chargingContext.plannedSocPercent) && chargingContext.currentSocPercent >= chargingContext.plannedSocPercent && chargingContext.energyRequiredWh !== null && Number.isFinite(chargingContext.energyRequiredWh) && chargingContext.energyRequiredWh > 0 && chargingContext.forecastMarginWh !== null && Number.isFinite(chargingContext.forecastMarginWh) && chargingContext.forecastMarginWh <= chargingContext.energyRequiredWh * DAY_DISCHARGE_TARGET_ENERGY_HEADROOM_FACTOR;
    if (hardBlock) {
      availablePowerW = 0;
      reason = `charging-${chargingContext.reason}`;
    } else if (energyBudgetExhausted) {
      availablePowerW = 0;
      reason = "energy-budget-exhausted";
    } else if (targetEnergyHeadroomRequired) {
      availablePowerW = 0;
      reason = "target-energy-headroom";
    } else if (corridor === null || corridor.factor === null) {
      availablePowerW = 0;
      reason = "trajectory-unavailable";
    } else if (corridor.factor <= 0) {
      availablePowerW = 0;
      reason = corridor.zone === "latched" ? "trajectory-recovery-latched" : "trajectory-below-corridor";
    } else {
      const release = releaseQualification(chargingContext, corridor, preparation.createdAt);
      releaseCandidateSince = release.candidateSince;
      if (!release.qualified) {
        availablePowerW = 0;
        reason = (_a = release.reason) != null ? _a : "release-surplus-insufficient";
      } else {
        availablePowerW = Math.round(availablePowerW * corridor.factor);
        if (corridor.zone === "above-corridor") reason = "trajectory-above-corridor";
        else if (corridor.zone === "below-plan") reason = "trajectory-below-plan-throttled";
        else if (corridor.zone === "plan") reason = "trajectory-plan-balanced";
        else reason = "trajectory-above-plan-throttled";
      }
    }
  }
  return Object.freeze({ createdAt: preparation.createdAt, allowed: availablePowerW > 0, availablePowerW, reason, validUntil: preparation.daylightWindow.endsAt, corridorRecoveryLatched, releaseCandidateSince });
}
async function publishStrategyDayDischargeAvailability(adapter, availability) {
  var _a;
  await Promise.all([adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.allowed, { val: availability.allowed, ack: true }), adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.availablePowerW, { val: availability.availablePowerW, ack: true }), adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.reason, { val: availability.reason, ack: true }), adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.validUntil, { val: availability.validUntil, ack: true }), adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.corridorRecoveryLatched, { val: availability.corridorRecoveryLatched, ack: true }), adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.releaseCandidateSince, { val: (_a = availability.releaseCandidateSince) != null ? _a : 0, ack: true })]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS,
  createStrategyDayDischargeAvailability,
  ensureStrategyDayDischargeAvailabilityStates,
  publishStrategyDayDischargeAvailability
});
//# sourceMappingURL=strategyDayDischargeAvailabilityStates.js.map
