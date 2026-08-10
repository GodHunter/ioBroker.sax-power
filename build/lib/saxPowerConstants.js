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
var saxPowerConstants_exports = {};
__export(saxPowerConstants_exports, {
  SAX_POWER_API_URL: () => SAX_POWER_API_URL
});
module.exports = __toCommonJS(saxPowerConstants_exports);
const SAX_POWER_API_URL = "https://webserver.sax-power.net";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SAX_POWER_API_URL
});
//# sourceMappingURL=saxPowerConstants.js.map
