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
var strategyPvForecastErrorLearning_exports = {};
__export(strategyPvForecastErrorLearning_exports, {
  StrategyPvForecastErrorModel: () => StrategyPvForecastErrorModel
});
module.exports = __toCommonJS(strategyPvForecastErrorLearning_exports);
const MAX_SAMPLES = 30;
const MAX_INTEGRATION_GAP_MS = 12e4;
const MINIMUM_COMPLETE_COVERAGE_PERCENT = 80;
function finiteNonNegative(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
function percentile(values, fraction) {
  var _a;
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)));
  return (_a = sorted[index]) != null ? _a : null;
}
function localDateKey(timestampMs) {
  const value = new Date(timestampMs);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function sampleFromDay(day) {
  const daylightMs = Math.max(1, day.daylightEndsAt - day.daylightStartsAt);
  const coveragePercent = Math.min(100, day.coveredMs / daylightMs * 100);
  if (day.forecastWh <= 0 || coveragePercent < MINIMUM_COMPLETE_COVERAGE_PERCENT) return null;
  const errorWh = day.actualWh - day.forecastWh;
  const errorPercent = errorWh / day.forecastWh * 100;
  const ratio = day.actualWh / day.forecastWh;
  return Object.freeze({
    dateKey: day.dateKey,
    forecastWh: round(day.forecastWh),
    actualWh: round(day.actualWh),
    errorWh: round(errorWh),
    errorPercent: round(errorPercent),
    ratio: round(ratio, 4),
    coveragePercent: round(coveragePercent)
  });
}
class StrategyPvForecastErrorModel {
  currentDay;
  samples;
  constructor(snapshot = null) {
    this.currentDay = (snapshot == null ? void 0 : snapshot.version) === 1 && snapshot.currentDay != null ? { ...snapshot.currentDay } : null;
    this.samples = (snapshot == null ? void 0 : snapshot.version) === 1 && Array.isArray(snapshot.samples) ? snapshot.samples.slice(-MAX_SAMPLES).map((sample) => ({ ...sample })) : [];
  }
  finalizeCurrentDay() {
    if (this.currentDay === null) return;
    const sample = sampleFromDay(this.currentDay);
    if (sample !== null && !this.samples.some((existing) => existing.dateKey === sample.dateKey)) {
      this.samples.push(sample);
      while (this.samples.length > MAX_SAMPLES) this.samples.shift();
    }
    this.currentDay = null;
  }
  observe(input) {
    if (!Number.isFinite(input.nowMs) || !Number.isFinite(input.pvPowerW) || !Number.isFinite(input.forecastTodayWh) || !Number.isFinite(input.daylightStartsAt) || !Number.isFinite(input.daylightEndsAt) || input.daylightEndsAt <= input.daylightStartsAt) return;
    const dateKey = localDateKey(input.nowMs);
    if (this.currentDay !== null && this.currentDay.dateKey !== dateKey) this.finalizeCurrentDay();
    if (this.currentDay !== null && input.nowMs >= this.currentDay.daylightEndsAt) this.finalizeCurrentDay();
    if (input.nowMs < input.daylightStartsAt || input.nowMs >= input.daylightEndsAt) return;
    if (this.currentDay === null) {
      this.currentDay = {
        dateKey,
        forecastWh: finiteNonNegative(input.forecastTodayWh),
        actualWh: 0,
        coveredMs: 0,
        daylightStartsAt: input.daylightStartsAt,
        daylightEndsAt: input.daylightEndsAt,
        lastTimestampMs: input.nowMs,
        lastPowerW: finiteNonNegative(input.pvPowerW)
      };
      return;
    }
    const lastTimestampMs = this.currentDay.lastTimestampMs;
    const lastPowerW = this.currentDay.lastPowerW;
    let actualWh = this.currentDay.actualWh;
    let coveredMs = this.currentDay.coveredMs;
    if (lastTimestampMs !== null && lastPowerW !== null) {
      const deltaMs = input.nowMs - lastTimestampMs;
      if (deltaMs > 0 && deltaMs <= MAX_INTEGRATION_GAP_MS) {
        const currentPowerW = finiteNonNegative(input.pvPowerW);
        actualWh += (lastPowerW + currentPowerW) / 2 * deltaMs / 36e5;
        coveredMs += deltaMs;
      }
    }
    this.currentDay = {
      ...this.currentDay,
      actualWh,
      coveredMs,
      lastTimestampMs: input.nowMs,
      lastPowerW: finiteNonNegative(input.pvPowerW)
    };
  }
  finalizeIfPastDaylight(nowMs) {
    if (this.currentDay !== null && nowMs >= this.currentDay.daylightEndsAt) this.finalizeCurrentDay();
  }
  status() {
    var _a, _b, _c, _d, _e, _f, _g;
    const ratios = this.samples.map((sample) => sample.ratio).filter(Number.isFinite);
    const errors = this.samples.map((sample) => sample.errorPercent).filter(Number.isFinite);
    const medianRatio = percentile(ratios, 0.5);
    const conservativeRatio = percentile(ratios, 0.25);
    const conservativeFactor = conservativeRatio === null ? null : round(Math.max(0.5, Math.min(1.2, conservativeRatio)), 4);
    const meanErrorPercent = errors.length === 0 ? null : round(errors.reduce((sum, value) => sum + value, 0) / errors.length);
    const currentSample = this.currentDay === null ? null : sampleFromDay({ ...this.currentDay, coveredMs: Math.max(this.currentDay.coveredMs, 0) });
    const daylightMs = this.currentDay === null ? 1 : Math.max(1, this.currentDay.daylightEndsAt - this.currentDay.daylightStartsAt);
    const todayCoveragePercent = this.currentDay === null ? 0 : round(Math.min(100, this.currentDay.coveredMs / daylightMs * 100));
    const todayErrorWh = this.currentDay === null || this.currentDay.forecastWh <= 0 ? null : round(this.currentDay.actualWh - this.currentDay.forecastWh);
    const todayErrorPercent = this.currentDay === null || this.currentDay.forecastWh <= 0 ? null : round((this.currentDay.actualWh - this.currentDay.forecastWh) / this.currentDay.forecastWh * 100);
    const todayRatio = this.currentDay === null || this.currentDay.forecastWh <= 0 ? null : round(this.currentDay.actualWh / this.currentDay.forecastWh, 4);
    return Object.freeze({
      todayForecastWh: (_b = (_a = this.currentDay) == null ? void 0 : _a.forecastWh) != null ? _b : null,
      todayActualWh: round((_d = (_c = this.currentDay) == null ? void 0 : _c.actualWh) != null ? _d : 0),
      todayCoveragePercent,
      todayErrorWh,
      todayErrorPercent,
      todayRatio: (_e = currentSample == null ? void 0 : currentSample.ratio) != null ? _e : todayRatio,
      samples: this.samples.length,
      meanErrorPercent,
      medianRatio: medianRatio === null ? null : round(medianRatio, 4),
      conservativeFactor,
      confidence: this.samples.length >= 7 ? "established" : this.samples.length >= 3 ? "learning" : "none",
      lastCompletedDate: (_g = (_f = this.samples.at(-1)) == null ? void 0 : _f.dateKey) != null ? _g : null
    });
  }
  snapshot() {
    return Object.freeze({
      version: 1,
      currentDay: this.currentDay === null ? null : Object.freeze({ ...this.currentDay }),
      samples: Object.freeze(this.samples.map((sample) => Object.freeze({ ...sample })))
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StrategyPvForecastErrorModel
});
//# sourceMappingURL=strategyPvForecastErrorLearning.js.map
