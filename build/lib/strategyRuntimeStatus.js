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
var strategyRuntimeStatus_exports = {};
__export(strategyRuntimeStatus_exports, {
  STRATEGY_RUNTIME_STATUS_STATE_IDS: () => STRATEGY_RUNTIME_STATUS_STATE_IDS,
  publishStrategyRuntimeStatus: () => publishStrategyRuntimeStatus
});
module.exports = __toCommonJS(strategyRuntimeStatus_exports);
const STRATEGY_RUNTIME_STATUS_STATE_IDS = Object.freeze({
  state: "info.strategyState",
  detail: "info.strategyDetail"
});
async function publishStrategyRuntimeStatus(adapter, state, detail = "") {
  await Promise.all([
    adapter.setStateAsync(
      STRATEGY_RUNTIME_STATUS_STATE_IDS.state,
      { val: state, ack: true }
    ),
    adapter.setStateAsync(
      STRATEGY_RUNTIME_STATUS_STATE_IDS.detail,
      { val: detail, ack: true }
    )
  ]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_RUNTIME_STATUS_STATE_IDS,
  publishStrategyRuntimeStatus
});
//# sourceMappingURL=strategyRuntimeStatus.js.map
