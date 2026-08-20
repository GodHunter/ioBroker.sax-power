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
var strategyIoBrokerReadinessRetry_exports = {};
__export(strategyIoBrokerReadinessRetry_exports, {
  createStrategyReadinessRetry: () => createStrategyReadinessRetry
});
module.exports = __toCommonJS(strategyIoBrokerReadinessRetry_exports);
function createStrategyReadinessRetry(adapter, intervalMs, retry, onError) {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return null;
  let timer;
  let stopped = false;
  const schedule = () => {
    if (stopped || timer !== void 0) return;
    timer = adapter.setTimeout(async () => {
      timer = void 0;
      if (stopped) return;
      try {
        await retry();
      } catch (error) {
        onError(error);
        schedule();
      }
    }, intervalMs);
  };
  return Object.freeze({
    schedule,
    stop() {
      stopped = true;
      if (timer !== void 0) {
        adapter.clearTimeout(timer);
        timer = void 0;
      }
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyReadinessRetry
});
//# sourceMappingURL=strategyIoBrokerReadinessRetry.js.map
