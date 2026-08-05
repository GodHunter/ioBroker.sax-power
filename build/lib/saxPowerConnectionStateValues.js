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
var saxPowerConnectionStateValues_exports = {};
__export(saxPowerConnectionStateValues_exports, {
  createConnectionStateValues: () => createConnectionStateValues
});
module.exports = __toCommonJS(saxPowerConnectionStateValues_exports);
function createConnectionStateValues(result) {
  var _a;
  return {
    connection: result.connected,
    connectionState: result.state,
    lastError: result.message,
    lastHttpStatus: (_a = result.httpStatus) != null ? _a : 0
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createConnectionStateValues
});
//# sourceMappingURL=saxPowerConnectionStateValues.js.map
