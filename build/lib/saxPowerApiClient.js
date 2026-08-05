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
var saxPowerApiClient_exports = {};
__export(saxPowerApiClient_exports, {
  SaxPowerApiClient: () => SaxPowerApiClient,
  SaxPowerApiError: () => SaxPowerApiError
});
module.exports = __toCommonJS(saxPowerApiClient_exports);
class SaxPowerApiError extends Error {
  statusCode;
  responseBody;
  constructor(message, options) {
    super(message, {
      cause: options == null ? void 0 : options.cause
    });
    this.name = "SaxPowerApiError";
    this.statusCode = options == null ? void 0 : options.statusCode;
    this.responseBody = options == null ? void 0 : options.responseBody;
  }
}
class SaxPowerApiClient {
  baseUrl;
  username;
  password;
  requestTimeoutMs;
  accessToken;
  refreshToken;
  constructor(options) {
    var _a;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.username = options.username;
    this.password = options.password;
    this.requestTimeoutMs = (_a = options.requestTimeoutMs) != null ? _a : 3e4;
  }
  get hasAccessToken() {
    return Boolean(this.accessToken);
  }
  clearTokens() {
    this.accessToken = void 0;
    this.refreshToken = void 0;
  }
  async login() {
    var _a, _b, _c;
    const body = new globalThis.URLSearchParams({
      email: this.username,
      password: this.password,
      stayLoggedIn: "false"
    });
    const response = await this.request(
      "/api/auth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://app.sax-power.net",
          Referer: "https://app.sax-power.net/"
        },
        body: body.toString()
      },
      false
    );
    const accessToken = (_b = (_a = response.access) != null ? _a : response.access_token) != null ? _b : response.token;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new SaxPowerApiError(
        "The SAX Power login response did not contain an access token."
      );
    }
    this.accessToken = accessToken;
    const refreshToken = (_c = response.refresh) != null ? _c : response.refresh_token;
    this.refreshToken = typeof refreshToken === "string" && refreshToken.length > 0 ? refreshToken : void 0;
  }
  async getLiveData() {
    if (!this.accessToken) {
      await this.login();
    }
    try {
      return await this.request(
        "/api/auth/data/",
        {
          method: "GET"
        },
        true
      );
    } catch (error) {
      if (error instanceof SaxPowerApiError && error.statusCode === 401) {
        this.clearTokens();
        await this.login();
        return this.request(
          "/api/auth/data/",
          {
            method: "GET"
          },
          true
        );
      }
      throw error;
    }
  }
  async getEnergyChart(serialNumber, days) {
    if (!this.accessToken) {
      await this.login();
    }
    const query = new globalThis.URLSearchParams({
      sn: serialNumber,
      m2: "true",
      m4: "true",
      m5: "true",
      days
    });
    const path = `/api/auth/energy_chart/?${query.toString()}`;
    try {
      return await this.request(
        path,
        {
          method: "GET"
        },
        true
      );
    } catch (error) {
      if (error instanceof SaxPowerApiError && error.statusCode === 401) {
        this.clearTokens();
        await this.login();
        return this.request(
          path,
          {
            method: "GET"
          },
          true
        );
      }
      throw error;
    }
  }
  async request(path, init, authenticated) {
    const timeoutSignal = globalThis.AbortSignal.timeout(
      this.requestTimeoutMs
    );
    const headers = new globalThis.Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body !== void 0 && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (authenticated) {
      if (!this.accessToken) {
        throw new SaxPowerApiError(
          "An authenticated SAX Power request was attempted without an access token."
        );
      }
      headers.set(
        "Authorization",
        `Bearer ${this.accessToken}`
      );
    }
    try {
      const response = await globalThis.fetch(
        `${this.baseUrl}${path}`,
        {
          ...init,
          headers,
          signal: timeoutSignal
        }
      );
      const responseBody = await response.text();
      if (!response.ok) {
        throw new SaxPowerApiError(
          `SAX Power API request failed with HTTP ${response.status}.`,
          {
            statusCode: response.status,
            responseBody
          }
        );
      }
      if (responseBody.length === 0) {
        return {};
      }
      try {
        return JSON.parse(responseBody);
      } catch (error) {
        throw new SaxPowerApiError(
          "The SAX Power API returned invalid JSON.",
          {
            statusCode: response.status,
            responseBody,
            cause: error
          }
        );
      }
    } catch (error) {
      if (error instanceof SaxPowerApiError) {
        throw error;
      }
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new SaxPowerApiError(
          `SAX Power API request timed out after ${this.requestTimeoutMs} ms.`,
          {
            cause: error
          }
        );
      }
      throw new SaxPowerApiError(
        "Unable to communicate with the SAX Power API.",
        {
          cause: error
        }
      );
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SaxPowerApiClient,
  SaxPowerApiError
});
//# sourceMappingURL=saxPowerApiClient.js.map
