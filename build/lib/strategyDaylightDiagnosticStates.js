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
var strategyDaylightDiagnosticStates_exports = {};
__export(strategyDaylightDiagnosticStates_exports, {
  STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS: () => STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS,
  ensureStrategyDaylightDiagnosticStates: () => ensureStrategyDaylightDiagnosticStates,
  publishStrategyDaylightDiagnostics: () => publishStrategyDaylightDiagnostics
});
module.exports = __toCommonJS(strategyDaylightDiagnosticStates_exports);
const STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS = Object.freeze({
  sunrise: "strategy.daylight.sunrise",
  sunset: "strategy.daylight.sunset",
  isDaylight: "strategy.daylight.isDaylight",
  source: "strategy.daylight.source",
  lastUpdate: "strategy.daylight.lastUpdate"
});
async function ensureStrategyDaylightDiagnosticStates(adapter) {
  await adapter.extendObjectAsync("strategy", {
    type: "channel",
    common: { name: "Battery strategy" },
    native: {}
  });
  await adapter.extendObjectAsync("strategy.daylight", {
    type: "channel",
    common: { name: "Daylight diagnostics" },
    native: {}
  });
  const definitions = [
    [STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.sunrise, {
      type: "state",
      common: { name: "Sunrise", type: "number", role: "value.time", read: true, write: false },
      native: {}
    }],
    [STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.sunset, {
      type: "state",
      common: { name: "Sunset", type: "number", role: "value.time", read: true, write: false },
      native: {}
    }],
    [STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.isDaylight, {
      type: "state",
      common: { name: "Is daylight", type: "boolean", role: "indicator", read: true, write: false },
      native: {}
    }],
    [STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.source, {
      type: "state",
      common: { name: "Daylight source", type: "string", role: "text", read: true, write: false },
      native: {}
    }],
    [STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.lastUpdate, {
      type: "state",
      common: { name: "Daylight last update", type: "number", role: "value.time", read: true, write: false },
      native: {}
    }]
  ];
  for (const [id, object] of definitions) {
    await adapter.extendObjectAsync(id, object);
  }
}
async function publishStrategyDaylightDiagnostics(adapter, createdAt, window) {
  var _a, _b;
  const valid = window !== null;
  const isDaylight = valid && createdAt >= window.startsAt && createdAt < window.endsAt;
  await Promise.all([
    adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.sunrise, {
      val: (_a = window == null ? void 0 : window.startsAt) != null ? _a : 0,
      ack: true
    }),
    adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.sunset, {
      val: (_b = window == null ? void 0 : window.endsAt) != null ? _b : 0,
      ack: true
    }),
    adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.isDaylight, {
      val: isDaylight,
      ack: true
    }),
    adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.source, {
      val: "suncalc-system-config",
      ack: true
    }),
    adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.lastUpdate, {
      val: createdAt,
      ack: true
    })
  ]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS,
  ensureStrategyDaylightDiagnosticStates,
  publishStrategyDaylightDiagnostics
});
//# sourceMappingURL=strategyDaylightDiagnosticStates.js.map
