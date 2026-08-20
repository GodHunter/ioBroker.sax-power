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
var strategyIoBrokerDaylightCycleScheduler_exports = {};
__export(strategyIoBrokerDaylightCycleScheduler_exports, {
  createStrategyIoBrokerDaylightCycleScheduler: () => createStrategyIoBrokerDaylightCycleScheduler
});
module.exports = __toCommonJS(strategyIoBrokerDaylightCycleScheduler_exports);
var import_strategyIoBrokerDaylightCycle = require("./strategyIoBrokerDaylightCycle");
var import_strategyIntegrationContract = require("./strategyIntegrationContract");
function createStrategyIoBrokerDaylightCycleScheduler(adapter, configuration, maximumForecastAgeMs, requestedDischargePowerW, intervalMs, onError, contract = import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT, resolverOptions = {}) {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return null;
  }
  let timer;
  let started = false;
  let running = false;
  const scheduleNext = () => {
    if (!started || timer !== void 0) {
      return;
    }
    timer = adapter.setTimeout(async () => {
      timer = void 0;
      try {
        await runNow();
      } catch (error) {
        onError(error);
      } finally {
        scheduleNext();
      }
    }, intervalMs);
  };
  const runNow = async () => {
    if (!started || running) {
      return null;
    }
    running = true;
    try {
      return await (0, import_strategyIoBrokerDaylightCycle.executeStrategyIoBrokerDaylightCycle)(
        adapter,
        configuration,
        maximumForecastAgeMs,
        requestedDischargePowerW,
        contract,
        resolverOptions
      );
    } finally {
      running = false;
    }
  };
  return Object.freeze({
    start() {
      if (started) {
        return;
      }
      started = true;
      scheduleNext();
    },
    stop() {
      started = false;
      if (timer !== void 0) {
        adapter.clearTimeout(timer);
        timer = void 0;
      }
    },
    runNow
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyIoBrokerDaylightCycleScheduler
});
//# sourceMappingURL=strategyIoBrokerDaylightCycleScheduler.js.map
