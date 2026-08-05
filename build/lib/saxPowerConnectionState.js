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
var saxPowerConnectionState_exports = {};
__export(saxPowerConnectionState_exports, {
  SaxPowerConnectionState: () => SaxPowerConnectionState
});
module.exports = __toCommonJS(saxPowerConnectionState_exports);
var SaxPowerConnectionState = /* @__PURE__ */ ((SaxPowerConnectionState2) => {
  SaxPowerConnectionState2["Connecting"] = "connecting";
  SaxPowerConnectionState2["Connected"] = "connected";
  SaxPowerConnectionState2["AuthenticationFailed"] = "authentication_failed";
  SaxPowerConnectionState2["Unauthorized"] = "unauthorized";
  SaxPowerConnectionState2["NetworkError"] = "network_error";
  SaxPowerConnectionState2["Timeout"] = "timeout";
  SaxPowerConnectionState2["ServerError"] = "server_error";
  SaxPowerConnectionState2["InvalidResponse"] = "invalid_response";
  SaxPowerConnectionState2["ConfigurationError"] = "configuration_error";
  SaxPowerConnectionState2["UnknownError"] = "unknown_error";
  return SaxPowerConnectionState2;
})(SaxPowerConnectionState || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SaxPowerConnectionState
});
//# sourceMappingURL=saxPowerConnectionState.js.map
