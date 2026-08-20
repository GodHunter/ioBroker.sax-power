"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_saxPowerApiClient = require("./lib/saxPowerApiClient");
var import_saxPowerErrorClassifier = require("./lib/saxPowerErrorClassifier");
var import_saxPowerConnectionStateValues = require("./lib/saxPowerConnectionStateValues");
var import_saxPowerParser = require("./lib/saxPowerParser");
var import_saxPowerHistoryParser = require("./lib/saxPowerHistoryParser");
var import_stateEngine = require("./lib/stateEngine");
var import_modbusDiscovery = require("./lib/modbusDiscovery");
var import_strategyCapabilities = require("./lib/strategyCapabilities");
var import_saxPowerConstants = require("./lib/saxPowerConstants");
var import_strategyIoBrokerStrategyBinding = require("./lib/strategyIoBrokerStrategyBinding");
var import_strategyNativeConfiguration = require("./lib/strategyNativeConfiguration");
var import_strategyAstroDate = require("./lib/strategyAstroDate");
var import_strategyRuntimeStatus = require("./lib/strategyRuntimeStatus");
var import_strategyIoBrokerReadiness = require("./lib/strategyIoBrokerReadiness");
var import_strategyIoBrokerReadinessRetry = require("./lib/strategyIoBrokerReadinessRetry");
var import_strategyIntegrationContract = require("./lib/strategyIntegrationContract");
var import_pollInterval = require("./lib/pollInterval");
class SaxPower extends utils.Adapter {
  apiClient;
  stateEngine;
  pollTimer;
  historyTimer;
  strategyBinding;
  strategyReadinessRetry;
  pollRunning = false;
  historyPollRunning = false;
  historyInitialized = false;
  latestDevices = [];
  static HISTORY_INTERVAL_MS = 3e5;
  static STRATEGY_READINESS_RETRY_INTERVAL_MS = 3e4;
  constructor(options = {}) {
    super({
      ...options,
      name: "sax-power",
      useFormatDate: true
    });
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.on(
      "message",
      this.onMessage.bind(this)
    );
  }
  get saxConfig() {
    return this.config;
  }
  async onReady() {
    await this.applyConnectionResult(
      import_saxPowerErrorClassifier.SaxPowerErrorClassifier.connecting()
    );
    await this.startStrategy();
    const validationError = this.validateConfiguration();
    if (validationError) {
      this.log.warn(validationError);
      await this.applyConnectionResult(
        import_saxPowerErrorClassifier.SaxPowerErrorClassifier.configurationError(
          validationError
        )
      );
      return;
    }
    this.apiClient = new import_saxPowerApiClient.SaxPowerApiClient({
      baseUrl: import_saxPowerConstants.SAX_POWER_API_URL,
      username: this.saxConfig.username,
      password: this.saxConfig.password
    });
    this.stateEngine = new import_stateEngine.SaxPowerStateEngine(this);
    await this.pollLiveData();
    this.scheduleNextPoll();
  }
  getAstroDate(event, date = /* @__PURE__ */ new Date(), offsetMinutes = 0) {
    return (0, import_strategyAstroDate.resolveStrategyAstroDate)(
      event,
      date,
      this.latitude,
      this.longitude,
      offsetMinutes
    );
  }
  strategyAdapter() {
    return {
      getAstroDate: (event, date, offsetMinutes) => this.getAstroDate(event, date, offsetMinutes),
      extendObjectAsync: (id, object) => this.extendObjectAsync(id, object),
      getStateAsync: (id) => this.getStateAsync(id),
      setStateAsync: (id, state) => this.setStateAsync(id, state),
      getForeignObjectAsync: (id) => this.getForeignObjectAsync(id),
      getForeignStateAsync: (id) => this.getForeignStateAsync(id),
      setForeignStateAsync: (id, value, acknowledged) => this.setForeignStateAsync(id, value, acknowledged),
      setTimeout: (callback, delay) => {
        const timeout = this.setTimeout(callback, delay);
        if (timeout === void 0) {
          throw new Error("ioBroker did not create the strategy timer.");
        }
        return timeout;
      },
      clearTimeout: (timeout) => this.clearTimeout(timeout)
    };
  }
  async startStrategy() {
    var _a;
    const runtimeConfiguration = (0, import_strategyNativeConfiguration.strategyRuntimeConfigurationFromNative)(
      this.saxConfig
    );
    let contract = typeof runtimeConfiguration.modbusInstance === "string" ? (0, import_strategyIntegrationContract.createStrategyIntegrationContract)(runtimeConfiguration.modbusInstance) : null;
    let capabilities = null;
    let capabilityDiscoveryError;
    if (runtimeConfiguration.enabled === true && typeof runtimeConfiguration.modbusInstance === "string" && contract !== null) {
      const modbusInstance = runtimeConfiguration.modbusInstance;
      try {
        const objects = await this.getForeignObjectsAsync(
          `${modbusInstance}.*`,
          "state"
        );
        capabilities = (0, import_strategyCapabilities.discoverStrategyCapabilities)(
          modbusInstance,
          objects
        );
        contract = capabilities === null ? contract : (0, import_strategyIntegrationContract.createDetectedStrategyIntegrationContract)(
          modbusInstance,
          capabilities.registers
        );
      } catch (error) {
        capabilityDiscoveryError = error;
        this.log.warn(
          `Unable to detect SAX Modbus registers during strategy startup: ${this.formatError(error)}`
        );
      }
    }
    const binding = (0, import_strategyIoBrokerStrategyBinding.createStrategyIoBrokerStrategyBinding)(
      this.strategyAdapter(),
      runtimeConfiguration,
      (error) => {
        this.logStrategyError("cycle", error);
        void this.publishStrategyErrorStatus("cycle", error);
      },
      contract != null ? contract : import_strategyIntegrationContract.STRATEGY_INTEGRATION_CONTRACT
    );
    this.strategyBinding = binding;
    (_a = this.strategyReadinessRetry) == null ? void 0 : _a.stop();
    this.strategyReadinessRetry = void 0;
    if (binding.status === "disabled") {
      await (0, import_strategyRuntimeStatus.publishStrategyRuntimeStatus)(this, "disabled");
      this.log.debug("SAX Power strategy is disabled.");
      return;
    }
    if (binding.status === "invalid-configuration") {
      const detail = binding.issues.map((issue) => `${issue.field}:${issue.reason}`).join(", ");
      await (0, import_strategyRuntimeStatus.publishStrategyRuntimeStatus)(
        this,
        "invalid-configuration",
        detail
      );
      this.log.error(
        `SAX Power strategy configuration is invalid: ${detail}`
      );
      return;
    }
    if (contract === null) {
      await (0, import_strategyRuntimeStatus.publishStrategyRuntimeStatus)(
        this,
        "invalid-configuration",
        "modbusInstance:invalid-instance"
      );
      return;
    }
    if (binding.status === "ready" && capabilityDiscoveryError !== void 0) {
      await this.publishStrategyErrorStatus(
        "Modbus register detection",
        capabilityDiscoveryError
      );
      return;
    }
    if (binding.status === "ready" && capabilities !== null) {
      const enabledModes = /* @__PURE__ */ new Map([
        ["chargingControl", binding.configuration.modes.chargingControlEnabled],
        ["dayAvailability", binding.configuration.modes.dayAvailabilityEnabled],
        ["nightDischarge", binding.configuration.modes.nightDischargeEnabled]
      ]);
      const unavailableModes = capabilities.modes.filter((mode) => enabledModes.get(mode.id) === true && !mode.selectable);
      if (unavailableModes.length > 0) {
        const detail = unavailableModes.map(
          (mode) => `${mode.id}:${mode.reason}${mode.missingRegisters.length > 0 ? `(${mode.missingRegisters.join(",")})` : ""}`
        ).join(", ");
        await (0, import_strategyRuntimeStatus.publishStrategyRuntimeStatus)(
          this,
          "invalid-configuration",
          detail
        );
        this.log.error(`SAX Power strategy mode is unavailable: ${detail}`);
        return;
      }
    }
    const readinessRetry = (0, import_strategyIoBrokerReadinessRetry.createStrategyReadinessRetry)(
      this.strategyAdapter(),
      SaxPower.STRATEGY_READINESS_RETRY_INTERVAL_MS,
      async () => this.startReadyStrategy(binding, contract),
      (error) => {
        this.logStrategyError("readiness retry", error);
        void this.publishStrategyErrorStatus("readiness retry", error);
      }
    );
    if (readinessRetry === null) {
      await this.publishStrategyErrorStatus(
        "readiness retry",
        new Error("Invalid readiness retry interval.")
      );
      return;
    }
    this.strategyReadinessRetry = readinessRetry;
    await this.startReadyStrategy(binding, contract);
  }
  async startReadyStrategy(binding, contract) {
    var _a, _b, _c;
    if (this.strategyBinding !== binding) return;
    let readiness;
    try {
      readiness = await (0, import_strategyIoBrokerReadiness.assessStrategyIoBrokerReadiness)(
        this.strategyAdapter(),
        binding.configuration.maximumForecastAgeMs,
        contract,
        binding.configuration.modes
      );
    } catch (error) {
      this.logStrategyError("readiness check", error);
      await this.publishStrategyErrorStatus("readiness check", error);
      (_a = this.strategyReadinessRetry) == null ? void 0 : _a.schedule();
      return;
    }
    if (!readiness.ready) {
      const detail = (0, import_strategyIoBrokerReadiness.formatStrategyUnavailableInputs)(
        readiness.unavailableInputs
      );
      await (0, import_strategyRuntimeStatus.publishStrategyRuntimeStatus)(
        this,
        "waiting-for-inputs",
        detail
      );
      this.log.warn(
        `SAX Power strategy is waiting for required inputs: ${detail}`
      );
      (_b = this.strategyReadinessRetry) == null ? void 0 : _b.schedule();
      return;
    }
    try {
      (_c = this.strategyReadinessRetry) == null ? void 0 : _c.stop();
      this.strategyReadinessRetry = void 0;
      await (0, import_strategyRuntimeStatus.publishStrategyRuntimeStatus)(this, "starting");
      await binding.lifecycle.start();
      await (0, import_strategyRuntimeStatus.publishStrategyRuntimeStatus)(this, "running");
      this.log.info("SAX Power strategy scheduler started.");
    } catch (error) {
      binding.lifecycle.stop();
      this.logStrategyError("initialization", error);
      await this.publishStrategyErrorStatus("initialization", error);
    }
  }
  async publishStrategyErrorStatus(context, error) {
    try {
      await (0, import_strategyRuntimeStatus.publishStrategyRuntimeStatus)(
        this,
        "error",
        `${context}: ${error instanceof Error ? error.message : String(error)}`
      );
    } catch (statusError) {
      this.logStrategyError("status publication", statusError);
    }
  }
  logStrategyError(context, error) {
    this.log.error(
      `SAX Power strategy ${context} failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  validateConfiguration() {
    var _a;
    if (!((_a = this.saxConfig.username) == null ? void 0 : _a.trim())) {
      return "The SAX Power username is not configured.";
    }
    if (!this.saxConfig.password) {
      return "The SAX Power password is not configured.";
    }
    if (!(0, import_pollInterval.isValidPollIntervalSeconds)(this.saxConfig.pollInterval)) {
      return `The polling interval must be between ${import_pollInterval.MIN_POLL_INTERVAL_SECONDS} and ${import_pollInterval.MAX_POLL_INTERVAL_SECONDS.toLocaleString("en-US")} seconds.`;
    }
    return void 0;
  }
  scheduleNextPoll() {
    if (this.pollTimer) {
      this.clearTimeout(this.pollTimer);
    }
    const intervalMs = this.saxConfig.pollInterval * 1e3;
    this.pollTimer = this.setTimeout(
      async () => {
        await this.pollLiveData();
        this.scheduleNextPoll();
      },
      intervalMs
    );
  }
  async pollLiveData() {
    if (this.pollRunning) {
      this.log.debug(
        "Skipping SAX Power poll because a previous request is still running."
      );
      return;
    }
    if (!this.apiClient) {
      this.log.warn(
        "SAX Power API client is not initialized."
      );
      return;
    }
    this.pollRunning = true;
    await this.applyConnectionResult(
      import_saxPowerErrorClassifier.SaxPowerErrorClassifier.connecting()
    );
    try {
      const response = await this.apiClient.getLiveData();
      await this.processLiveData(response);
      await this.applyConnectionResult(
        import_saxPowerErrorClassifier.SaxPowerErrorClassifier.connected()
      );
      await this.setStateAsync(
        "info.lastUpdate",
        (/* @__PURE__ */ new Date()).toISOString(),
        true
      );
      this.log.debug(
        "SAX Power live data updated successfully."
      );
    } catch (error) {
      const result = import_saxPowerErrorClassifier.SaxPowerErrorClassifier.classify(
        error
      );
      this.log.error(result.message);
      await this.applyConnectionResult(result);
    } finally {
      this.pollRunning = false;
    }
  }
  async processLiveData(response) {
    var _a;
    const receivedTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    const devices = (0, import_saxPowerParser.parseLiveDataResponse)(
      response,
      receivedTimestamp
    );
    if (devices.length === 0) {
      throw new Error(
        "The SAX Power API response did not contain any valid devices."
      );
    }
    if (!this.stateEngine) {
      throw new Error(
        "The SAX Power state engine is not initialized."
      );
    }
    await this.stateEngine.writeDevices(
      devices
    );
    await this.stateEngine.observeBatteryHealth(devices, (_a = this.saxConfig.batteryModels) != null ? _a : {});
    await this.stateEngine.writeAggregateLiveData(
      devices
    );
    this.latestDevices = devices;
    if (!this.historyInitialized) {
      this.historyInitialized = true;
      await this.pollHistory();
      this.scheduleNextHistoryPoll();
    }
    await this.setStateAsync(
      "diagnostics.rawLiveData",
      JSON.stringify(response),
      true
    );
  }
  scheduleNextHistoryPoll() {
    if (this.historyTimer) {
      this.clearTimeout(
        this.historyTimer
      );
    }
    this.historyTimer = this.setTimeout(
      async () => {
        await this.pollHistory();
        this.scheduleNextHistoryPoll();
      },
      SaxPower.HISTORY_INTERVAL_MS
    );
  }
  async pollHistory() {
    var _a, _b;
    if (this.historyPollRunning) {
      this.log.debug(
        "Skipping SAX Power history poll because a previous history request is still running."
      );
      return;
    }
    if (!this.apiClient || !this.stateEngine || this.latestDevices.length === 0) {
      return;
    }
    this.historyPollRunning = true;
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const deviceStatistics = {};
      const deviceMetadata = {};
      const batteryModels = {};
      const reportedCycles = {};
      for (const device of this.latestDevices) {
        const serialNumber = device.info.serialNumber;
        batteryModels[serialNumber] = (_b = (_a = this.saxConfig.batteryModels) == null ? void 0 : _a[serialNumber]) != null ? _b : "";
        reportedCycles[serialNumber] = device.info.reportedCycleCount;
        const [
          week,
          month,
          year,
          total
        ] = await Promise.all([
          this.apiClient.getEnergyChart(
            serialNumber,
            `week_${today}`
          ),
          this.apiClient.getEnergyChart(
            serialNumber,
            `month_${today}`
          ),
          this.apiClient.getEnergyChart(
            serialNumber,
            `year_${today}`
          ),
          this.apiClient.getEnergyChart(
            serialNumber,
            `total_${today}`
          )
        ]);
        deviceStatistics[serialNumber] = (0, import_saxPowerHistoryParser.parseDeviceStatistics)({
          serialNumber,
          todayIso: today,
          week,
          month,
          year,
          total
        });
        deviceMetadata[serialNumber] = (0, import_saxPowerHistoryParser.createDeviceHistoryMetadata)({
          serialNumber,
          todayIso: today,
          week,
          month,
          year,
          total
        });
      }
      const statistics = (0, import_saxPowerHistoryParser.aggregateStatistics)(
        deviceStatistics
      );
      const metadata = (0, import_saxPowerHistoryParser.aggregateHistoryMetadata)(
        deviceMetadata
      );
      const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.stateEngine.writeStatistics(
        statistics,
        metadata,
        updatedAt,
        batteryModels,
        reportedCycles
      );
      this.log.debug(
        `SAX Power statistics updated successfully for ${Object.keys(deviceStatistics).length} device(s).`
      );
    } catch (error) {
      const message = this.formatError(error);
      this.log.warn(
        `Unable to update SAX Power statistics: ${message}`
      );
      await this.stateEngine.writeStatisticsError(
        message
      );
    } finally {
      this.historyPollRunning = false;
    }
  }
  async applyConnectionResult(result) {
    const values = (0, import_saxPowerConnectionStateValues.createConnectionStateValues)(result);
    await Promise.all([
      this.setStateAsync(
        "info.connection",
        values.connection,
        true
      ),
      this.setStateAsync(
        "info.connectionState",
        values.connectionState,
        true
      ),
      this.setStateAsync(
        "info.lastError",
        values.lastError,
        true
      ),
      this.setStateAsync(
        "info.lastHttpStatus",
        values.lastHttpStatus,
        true
      )
    ]);
  }
  formatError(error) {
    if (error instanceof import_saxPowerApiClient.SaxPowerApiError) {
      const status = error.statusCode !== void 0 ? ` HTTP ${error.statusCode}.` : "";
      return `${error.message}${status}`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  async onMessage(message) {
    var _a;
    if (!message.callback || !message.from) {
      return;
    }
    if (message.command === "getModbusInstances") {
      try {
        const objects = await this.getForeignObjectsAsync(
          "system.adapter.modbus.*",
          "instance"
        );
        this.sendTo(
          message.from,
          message.command,
          (0, import_modbusDiscovery.discoverModbusInstances)(objects),
          message.callback
        );
      } catch (error) {
        this.log.warn(
          `Unable to discover Modbus instances: ${this.formatError(error)}`
        );
        this.sendTo(message.from, message.command, [], message.callback);
      }
      return;
    }
    if (message.command === "getStrategyCapabilities") {
      const payload = typeof message.message === "object" && message.message !== null ? message.message : {};
      const instance = typeof payload.instance === "string" ? payload.instance : "";
      if (!/^modbus\.\d+$/.test(instance)) {
        this.sendTo(message.from, message.command, null, message.callback);
        return;
      }
      try {
        const objects = await this.getForeignObjectsAsync(
          `${instance}.*`,
          "state"
        );
        this.sendTo(
          message.from,
          message.command,
          (_a = (0, import_strategyCapabilities.discoverStrategyCapabilities)(instance, objects)) != null ? _a : null,
          message.callback
        );
      } catch (error) {
        this.log.warn(
          `Unable to discover strategy capabilities: ${this.formatError(error)}`
        );
        this.sendTo(message.from, message.command, null, message.callback);
      }
      return;
    }
    if (message.command !== "getModbusStates") return;
    try {
      const payload = typeof message.message === "object" && message.message !== null ? message.message : {};
      const instance = typeof payload.instance === "string" ? payload.instance : "";
      const purpose = payload.purpose === "discharge" ? "discharge" : "charge";
      const preferredRegister = purpose === "discharge" ? 43 : 44;
      const options = await (0, import_modbusDiscovery.discoverModbusStates)(
        async (pattern) => {
          const objects = await this.getForeignObjectsAsync(
            pattern,
            "state"
          );
          return objects;
        },
        {
          instance,
          preferredRegister
        }
      );
      this.sendTo(
        message.from,
        message.command,
        options,
        message.callback
      );
    } catch (error) {
      this.log.warn(
        `Unable to discover Modbus states: ${error instanceof Error ? error.message : String(error)}`
      );
      this.sendTo(
        message.from,
        message.command,
        [],
        message.callback
      );
    }
  }
  onUnload(callback) {
    var _a, _b, _c, _d;
    try {
      (_a = this.strategyReadinessRetry) == null ? void 0 : _a.stop();
      this.strategyReadinessRetry = void 0;
      (_c = (_b = this.strategyBinding) == null ? void 0 : _b.lifecycle) == null ? void 0 : _c.stop();
      this.strategyBinding = void 0;
      if (this.pollTimer) {
        this.clearTimeout(this.pollTimer);
        this.pollTimer = void 0;
      }
      if (this.historyTimer) {
        this.clearTimeout(
          this.historyTimer
        );
        this.historyTimer = void 0;
      }
      (_d = this.apiClient) == null ? void 0 : _d.clearTokens();
      callback();
    } catch {
      callback();
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new SaxPower(options);
} else {
  (() => new SaxPower())();
}
//# sourceMappingURL=main.js.map
