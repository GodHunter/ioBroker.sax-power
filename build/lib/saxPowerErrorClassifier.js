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
var saxPowerErrorClassifier_exports = {};
__export(saxPowerErrorClassifier_exports, {
  SaxPowerErrorClassifier: () => SaxPowerErrorClassifier
});
module.exports = __toCommonJS(saxPowerErrorClassifier_exports);
var import_saxPowerApiClient = require("./saxPowerApiClient");
var import_saxPowerConnectionState = require("./saxPowerConnectionState");
const AUTHENTICATION_MESSAGE = "Authentication to the SAX Power Cloud failed. Please verify the username and password. After upgrading from an older adapter version, enter the password again and save the configuration.";
class SaxPowerErrorClassifier {
  static connected() {
    return {
      connected: true,
      state: import_saxPowerConnectionState.SaxPowerConnectionState.Connected,
      message: ""
    };
  }
  static connecting() {
    return {
      connected: false,
      state: import_saxPowerConnectionState.SaxPowerConnectionState.Connecting,
      message: ""
    };
  }
  static configurationError(message) {
    return {
      connected: false,
      state: import_saxPowerConnectionState.SaxPowerConnectionState.ConfigurationError,
      message
    };
  }
  static classify(error) {
    if (error instanceof import_saxPowerApiClient.SaxPowerApiError) {
      return this.classifyApiError(error);
    }
    if (error instanceof Error) {
      if (this.isTimeoutError(error)) {
        return {
          connected: false,
          state: import_saxPowerConnectionState.SaxPowerConnectionState.Timeout,
          message: "The connection to the SAX Power Cloud timed out."
        };
      }
      return {
        connected: false,
        state: import_saxPowerConnectionState.SaxPowerConnectionState.UnknownError,
        message: error.message || "An unknown SAX Power adapter error occurred."
      };
    }
    return {
      connected: false,
      state: import_saxPowerConnectionState.SaxPowerConnectionState.UnknownError,
      message: "An unknown SAX Power adapter error occurred."
    };
  }
  static classifyApiError(error) {
    const statusCode = error.statusCode;
    if (statusCode === 401) {
      return {
        connected: false,
        state: import_saxPowerConnectionState.SaxPowerConnectionState.AuthenticationFailed,
        message: AUTHENTICATION_MESSAGE,
        httpStatus: statusCode
      };
    }
    if (statusCode === 403) {
      return {
        connected: false,
        state: import_saxPowerConnectionState.SaxPowerConnectionState.Unauthorized,
        message: "The SAX Power Cloud rejected access to the requested resource.",
        httpStatus: statusCode
      };
    }
    if (statusCode !== void 0 && statusCode >= 500) {
      return {
        connected: false,
        state: import_saxPowerConnectionState.SaxPowerConnectionState.ServerError,
        message: `The SAX Power Cloud returned server error HTTP ${statusCode}.`,
        httpStatus: statusCode
      };
    }
    if (this.isInvalidResponseError(error)) {
      return {
        connected: false,
        state: import_saxPowerConnectionState.SaxPowerConnectionState.InvalidResponse,
        message: "The SAX Power Cloud returned an invalid response.",
        httpStatus: statusCode
      };
    }
    if (this.isTimeoutError(error)) {
      return {
        connected: false,
        state: import_saxPowerConnectionState.SaxPowerConnectionState.Timeout,
        message: "The connection to the SAX Power Cloud timed out.",
        httpStatus: statusCode
      };
    }
    if (statusCode !== void 0) {
      return {
        connected: false,
        state: import_saxPowerConnectionState.SaxPowerConnectionState.NetworkError,
        message: `The SAX Power Cloud request failed with HTTP ${statusCode}.`,
        httpStatus: statusCode
      };
    }
    return {
      connected: false,
      state: import_saxPowerConnectionState.SaxPowerConnectionState.NetworkError,
      message: "Unable to reach the SAX Power Cloud. Please check the network connection."
    };
  }
  static isTimeoutError(error) {
    const message = error.message.toLowerCase();
    return error.name === "AbortError" || error.name === "TimeoutError" || message.includes("timed out") || message.includes("timeout");
  }
  static isInvalidResponseError(error) {
    const message = error.message.toLowerCase();
    return message.includes("invalid json") || message.includes("did not contain an access token") || message.includes("invalid response");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SaxPowerErrorClassifier
});
//# sourceMappingURL=saxPowerErrorClassifier.js.map
