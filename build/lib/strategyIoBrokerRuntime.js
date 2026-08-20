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
var strategyIoBrokerRuntime_exports = {};
__export(strategyIoBrokerRuntime_exports, {
  createStrategyIoBrokerRuntime: () => createStrategyIoBrokerRuntime
});
module.exports = __toCommonJS(strategyIoBrokerRuntime_exports);
var import_strategyIoBrokerCommandWriter = require("./strategyIoBrokerCommandWriter");
var import_strategyIoBrokerStateReader = require("./strategyIoBrokerStateReader");
function createStrategyIoBrokerRuntime(adapter) {
  return Object.freeze({
    reader: (0, import_strategyIoBrokerStateReader.createStrategyIoBrokerStateReader)(adapter),
    writer: (0, import_strategyIoBrokerCommandWriter.createStrategyIoBrokerCommandWriter)(adapter)
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStrategyIoBrokerRuntime
});
//# sourceMappingURL=strategyIoBrokerRuntime.js.map
