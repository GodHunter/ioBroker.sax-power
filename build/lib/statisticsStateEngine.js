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
var statisticsStateEngine_exports = {};
__export(statisticsStateEngine_exports, {
  SaxPowerStatisticsStateEngine: () => SaxPowerStatisticsStateEngine
});
module.exports = __toCommonJS(statisticsStateEngine_exports);
var import_batteryAnalysis = require("./batteryAnalysis");
var import_batteryHealth = require("./batteryHealth");
const STATISTICS_PERIODS = [
  "day",
  "week",
  "month",
  "year",
  "total"
];
const PERIOD_MODEL_MAP = {
  day: "today",
  week: "week",
  month: "month",
  year: "year",
  total: "total"
};
const PLACEHOLDER_SOURCE = "pending-history-discovery";
class SaxPowerStatisticsStateEngine {
  adapter;
  aggregateInitialized = false;
  initializedDevices = /* @__PURE__ */ new Set();
  stateCache = /* @__PURE__ */ new Map();
  healthProgress = /* @__PURE__ */ new Map();
  loadedHealthProgress = /* @__PURE__ */ new Set();
  constructor(adapter) {
    this.adapter = adapter;
  }
  async ensureObjects(devices) {
    if (!this.aggregateInitialized) {
      await this.adapter.extendObjectAsync("summary", {
        type: "channel",
        common: { name: "Combined values for all storage devices" },
        native: {}
      });
      await this.ensureStatisticsTree(
        "summary.statistics",
        true
      );
      await this.ensureBatteryTree("summary.battery", true);
      await this.removeLegacyAggregateTrees();
      this.aggregateInitialized = true;
    }
    for (const device of devices) {
      const serialNumber = this.sanitizeObjectId(
        device.info.serialNumber
      );
      if (!serialNumber || this.initializedDevices.has(
        serialNumber
      )) {
        continue;
      }
      await this.ensureStatisticsTree(
        `devices.${serialNumber}.statistics`,
        false
      );
      await this.ensureBatteryTree(`devices.${serialNumber}.battery`, false);
      this.initializedDevices.add(
        serialNumber
      );
    }
    await this.writeCachedState(
      "summary.statistics.info.deviceCount",
      devices.length
    );
  }
  async writeStatistics(result, metadata, updatedAt, batteryModels, reportedCycles) {
    var _a;
    const aggregateByPeriod = {
      day: [],
      week: [],
      month: [],
      year: [],
      total: []
    };
    for (const [
      serialNumber,
      deviceStatistics
    ] of Object.entries(
      result.devices
    )) {
      const safeSerial = this.sanitizeObjectId(
        serialNumber
      );
      if (!safeSerial) {
        continue;
      }
      const deviceMetadata = metadata.devices[serialNumber];
      if (!deviceMetadata) {
        continue;
      }
      await this.writeStatisticsTree(
        `devices.${safeSerial}.statistics`,
        deviceStatistics,
        deviceMetadata,
        updatedAt
      );
      const model = (0, import_batteryAnalysis.getBatteryModel)(batteryModels[serialNumber]);
      await this.writeDeviceBattery(
        `devices.${safeSerial}.battery`,
        model,
        deviceStatistics,
        (_a = reportedCycles[serialNumber]) != null ? _a : null,
        updatedAt
      );
      if (model) {
        for (const period of STATISTICS_PERIODS) {
          aggregateByPeriod[period].push({
            energy: deviceStatistics[PERIOD_MODEL_MAP[period]],
            nominalCapacityKwh: model.nominalCapacityKwh
          });
        }
      }
    }
    await this.writeStatisticsTree(
      "summary.statistics",
      {
        serialNumber: "aggregate",
        ...result.total
      },
      metadata.total,
      updatedAt
    );
    const allModelsKnown = Object.keys(result.devices).length > 0 && Object.keys(result.devices).every((serial) => (0, import_batteryAnalysis.getBatteryModel)(batteryModels[serial]));
    await this.writeCachedState("summary.battery.deviceCount", Object.keys(result.devices).length);
    await this.writeCachedState("summary.battery.info.lastUpdate", updatedAt);
    await this.writeCachedState(
      "summary.battery.nominalCapacity",
      allModelsKnown ? aggregateByPeriod.total.reduce((sum, device) => sum + device.nominalCapacityKwh, 0) : null
    );
    await this.writeCachedState(
      "summary.battery.usableCapacity",
      allModelsKnown ? Object.keys(result.devices).reduce(
        (sum, serial) => {
          var _a2, _b;
          return sum + ((_b = (_a2 = (0, import_batteryAnalysis.getBatteryModel)(batteryModels[serial])) == null ? void 0 : _a2.usableCapacityKwh) != null ? _b : 0);
        },
        0
      ) : null
    );
    for (const period of STATISTICS_PERIODS) {
      await this.writeCachedState(
        `summary.battery.cycles.${period}`,
        allModelsKnown ? (0, import_batteryAnalysis.calculateAggregateEquivalentFullCycles)(aggregateByPeriod[period]) : null
      );
    }
    await this.writeCachedState(
      "summary.statistics.info.deviceCount",
      Object.keys(
        result.devices
      ).length
    );
  }
  async observeBatteryHealth(devices, batteryModels) {
    var _a;
    for (const device of devices) {
      const serial = this.sanitizeObjectId(device.info.serialNumber);
      const model = (0, import_batteryAnalysis.getBatteryModel)(batteryModels[device.info.serialNumber]);
      if (!serial || !model) continue;
      const root = `devices.${serial}.battery.health`;
      await this.loadHealthProgress(root, serial);
      const evaluated = (0, import_batteryHealth.observeBatteryHealth)(
        (_a = this.healthProgress.get(serial)) != null ? _a : null,
        {
          timestamp: device.info.receivedTimestamp,
          soc: device.live.soc,
          batteryPower: device.live.batteryPower,
          direction: device.live.batteryDirection
        },
        model.usableCapacityKwh
      );
      this.healthProgress.set(serial, evaluated.progress);
      await this.writeHealthResult(root, evaluated.progress, evaluated.status, evaluated.value);
    }
    await this.writeAggregateHealth(devices);
  }
  async writeError(message) {
    await this.writeCachedState(
      "summary.statistics.info.lastError",
      message
    );
  }
  async writeStatisticsTree(rootId, statistics, metadata, updatedAt) {
    var _a;
    for (const statePeriod of STATISTICS_PERIODS) {
      const modelPeriod = PERIOD_MODEL_MAP[statePeriod];
      await this.writePeriod(
        `${rootId}.${statePeriod}`,
        statistics[modelPeriod],
        metadata[modelPeriod]
      );
    }
    const firstMeasurement = (_a = [
      metadata.total.firstTimestamp,
      metadata.year.firstTimestamp,
      metadata.month.firstTimestamp,
      metadata.week.firstTimestamp,
      metadata.today.firstTimestamp
    ].filter(Boolean).sort()[0]) != null ? _a : "";
    await this.writeCachedState(
      `${rootId}.info.firstMeasurement`,
      firstMeasurement
    );
    await this.writeCachedState(
      `${rootId}.info.lastUpdate`,
      updatedAt
    );
    await this.writeCachedState(
      `${rootId}.info.source`,
      "sax-power-energy-chart"
    );
    await this.writeCachedState(
      `${rootId}.info.lastError`,
      ""
    );
  }
  async writePeriod(periodId, values, metadata) {
    await this.writeCachedState(
      `${periodId}.chargedEnergy`,
      values.chargedKwh
    );
    await this.writeCachedState(
      `${periodId}.dischargedEnergy`,
      values.dischargedKwh
    );
    await this.writeCachedState(
      `${periodId}.firstTimestamp`,
      metadata.firstTimestamp
    );
    await this.writeCachedState(
      `${periodId}.lastTimestamp`,
      metadata.lastTimestamp
    );
  }
  async writeCachedState(id, value) {
    if (this.stateCache.get(id) === value) {
      return;
    }
    await this.adapter.setStateAsync(
      id,
      {
        val: value,
        ack: true
      }
    );
    this.stateCache.set(
      id,
      value
    );
  }
  async ensureBatteryTree(rootId, aggregate) {
    await this.adapter.extendObjectAsync(rootId, {
      type: "channel",
      common: { name: aggregate ? "Combined battery analysis" : "Battery analysis" },
      native: {}
    });
    await this.adapter.extendObjectAsync(`${rootId}.cycles`, {
      type: "channel",
      common: { name: "Equivalent full cycles" },
      native: {}
    });
    for (const period of STATISTICS_PERIODS) {
      await this.ensureState(`${rootId}.cycles.${period}`, {
        name: `${this.capitalize(period)} equivalent full cycles`,
        desc: "Calculated as (charged energy + discharged energy) / (2 \xD7 nominal capacity).",
        type: "number",
        role: "value",
        unit: "cycles"
      });
    }
    if (!aggregate) {
      await this.ensureState(`${rootId}.cycles.reported`, {
        name: "SAX reported cycle count",
        desc: "Cycle counter reported by the SAX Power live API (data_cycle).",
        type: "number",
        role: "value",
        unit: "cycles"
      });
      await this.ensureState(`${rootId}.model`, { name: "Battery model", desc: "Configured SAX Power battery model.", type: "string", role: "text" });
    }
    await this.ensureState(`${rootId}.nominalCapacity`, { name: "Nominal capacity", desc: "Nominal battery capacity used for cycle calculations.", type: "number", role: "value", unit: "kWh" });
    await this.ensureState(`${rootId}.usableCapacity`, { name: "Usable capacity", desc: "Usable AC storage capacity reserved for future energy-management calculations.", type: "number", role: "value", unit: "kWh" });
    await this.adapter.extendObjectAsync(`${rootId}.health`, { type: "channel", common: { name: "Estimated battery health" }, native: {} });
    await this.ensureState(`${rootId}.health.value`, { name: "Estimated battery health", desc: "Capacity estimate based on five qualified discharge runs; null until sufficient data exists.", type: "number", role: "value", unit: "%" });
    await this.ensureState(`${rootId}.health.status`, { name: "Battery health status", desc: "Availability status of the estimated battery health.", type: "string", role: "text", def: "notAvailable" });
    await this.ensureState(`${rootId}.health.validRuns`, { name: "Valid health runs", desc: "Qualified discharge runs included in the health estimate.", type: "number", role: "value", def: 0 });
    await this.ensureState(`${rootId}.health.requiredRuns`, { name: "Required health runs", desc: "Qualified runs required before publishing an estimate.", type: "number", role: "value", def: 5 });
    await this.ensureState(`${rootId}.health.rejectedRuns`, { name: "Rejected health runs", desc: "Runs rejected because they were too short, interrupted or implausible.", type: "number", role: "value", def: 0 });
    await this.ensureState(`${rootId}.health.activeRun`, { name: "Active health run", desc: "Current health data collection state.", type: "string", role: "text", def: "idle" });
    await this.ensureState(`${rootId}.health.activeRunDirection`, { name: "Active run direction", desc: "Direction of the currently observed run.", type: "string", role: "text", def: "idle" });
    await this.ensureState(`${rootId}.health.activeRunSocStart`, { name: "Active run start SOC", desc: "SOC at the beginning of the current run.", type: "number", role: "value.battery", unit: "%" });
    await this.ensureState(`${rootId}.health.activeRunSocCurrent`, { name: "Active run current SOC", desc: "Most recently observed SOC of the current run.", type: "number", role: "value.battery", unit: "%" });
    await this.ensureState(`${rootId}.health.activeRunEnergy`, { name: "Active run energy", desc: "Energy integrated from live battery power during the current run.", type: "number", role: "value.energy", unit: "kWh" });
    await this.ensureState(`${rootId}.health.activeRunStartedAt`, { name: "Active run started at", desc: "Start timestamp of the current run.", type: "string", role: "date", def: "" });
    await this.ensureState(`${rootId}.health.dataCollectionStartedAt`, { name: "Health collection started at", desc: "Timestamp at which persistent health data collection began.", type: "string", role: "date", def: "" });
    await this.ensureState(`${rootId}.health.lastEvaluation`, { name: "Last health evaluation", desc: "Timestamp of the last completed run evaluation.", type: "string", role: "date", def: "" });
    if (!aggregate) await this.ensureState(`${rootId}.health.progress`, { name: "Health tracker progress", desc: "Internal persistent health tracker state.", type: "string", role: "json", def: "" });
    await this.adapter.extendObjectAsync(`${rootId}.info`, { type: "channel", common: { name: "Battery analysis information" }, native: {} });
    await this.ensureState(`${rootId}.info.lastUpdate`, { name: "Last update", desc: "Last successful battery analysis update.", type: "string", role: "date", def: "" });
    if (aggregate) await this.ensureState(`${rootId}.deviceCount`, { name: "Device count", desc: "Storage devices included in this analysis.", type: "number", role: "value", def: 0 });
  }
  async loadHealthProgress(root, serial) {
    if (this.loadedHealthProgress.has(serial)) return;
    this.loadedHealthProgress.add(serial);
    if (!this.adapter.getStateAsync) return;
    try {
      const state = await this.adapter.getStateAsync(`${root}.progress`);
      if (typeof (state == null ? void 0 : state.val) === "string" && state.val) {
        const parsed = JSON.parse(state.val);
        if (typeof parsed.validRuns === "number" && typeof parsed.rejectedRuns === "number") {
          this.healthProgress.set(serial, parsed);
        }
      }
    } catch {
    }
  }
  async writeHealthResult(root, progress, status, value) {
    var _a, _b, _c, _d;
    const run = progress.activeRun;
    await this.writeCachedState(`${root}.value`, value);
    await this.writeCachedState(`${root}.status`, status);
    await this.writeCachedState(`${root}.validRuns`, progress.validRuns);
    await this.writeCachedState(`${root}.requiredRuns`, progress.requiredRuns);
    await this.writeCachedState(`${root}.rejectedRuns`, progress.rejectedRuns);
    await this.writeCachedState(`${root}.activeRun`, run ? "active" : "idle");
    await this.writeCachedState(`${root}.activeRunDirection`, (_a = run == null ? void 0 : run.direction) != null ? _a : "idle");
    await this.writeCachedState(`${root}.activeRunSocStart`, (_b = run == null ? void 0 : run.startSoc) != null ? _b : null);
    await this.writeCachedState(`${root}.activeRunSocCurrent`, (_c = run == null ? void 0 : run.currentSoc) != null ? _c : null);
    await this.writeCachedState(`${root}.activeRunEnergy`, run ? Math.round(run.energyKwh * 1e3) / 1e3 : null);
    await this.writeCachedState(`${root}.activeRunStartedAt`, (_d = run == null ? void 0 : run.startedAt) != null ? _d : "");
    await this.writeCachedState(`${root}.dataCollectionStartedAt`, progress.dataCollectionStartedAt);
    await this.writeCachedState(`${root}.lastEvaluation`, progress.lastEvaluation);
    await this.writeCachedState(`${root}.progress`, JSON.stringify(progress));
  }
  async writeAggregateHealth(devices) {
    var _a, _b;
    const progresses = devices.map((device) => this.healthProgress.get(this.sanitizeObjectId(device.info.serialNumber))).filter((progress) => Boolean(progress));
    if (progresses.length === 0) return;
    const values = progresses.map((progress) => progress.validRuns >= progress.requiredRuns && progress.estimates.length > 0 ? progress.estimates.slice(-progress.requiredRuns).sort((a, b) => a - b)[Math.floor(progress.requiredRuns / 2)] : null);
    const available = values.every((value) => value !== null);
    const root = "summary.battery.health";
    await this.writeCachedState(`${root}.value`, available ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null);
    await this.writeCachedState(`${root}.status`, available ? "available" : "collectingData");
    await this.writeCachedState(`${root}.validRuns`, progresses.reduce((sum, progress) => sum + progress.validRuns, 0));
    await this.writeCachedState(`${root}.requiredRuns`, progresses.reduce((sum, progress) => sum + progress.requiredRuns, 0));
    await this.writeCachedState(`${root}.rejectedRuns`, progresses.reduce((sum, progress) => sum + progress.rejectedRuns, 0));
    await this.writeCachedState(`${root}.activeRun`, progresses.some((progress) => progress.activeRun) ? "active" : "idle");
    await this.writeCachedState(`${root}.activeRunDirection`, "mixed");
    await this.writeCachedState(`${root}.activeRunSocStart`, null);
    await this.writeCachedState(`${root}.activeRunSocCurrent`, null);
    await this.writeCachedState(`${root}.activeRunEnergy`, null);
    await this.writeCachedState(`${root}.activeRunStartedAt`, "");
    await this.writeCachedState(`${root}.dataCollectionStartedAt`, (_a = progresses.map((progress) => progress.dataCollectionStartedAt).sort()[0]) != null ? _a : "");
    await this.writeCachedState(`${root}.lastEvaluation`, (_b = progresses.map((progress) => progress.lastEvaluation).filter(Boolean).sort().at(-1)) != null ? _b : "");
  }
  async writeDeviceBattery(rootId, model, statistics, reportedCycles, updatedAt) {
    var _a, _b, _c;
    await this.writeCachedState(`${rootId}.model`, (_a = model == null ? void 0 : model.name) != null ? _a : "notConfigured");
    await this.writeCachedState(`${rootId}.nominalCapacity`, (_b = model == null ? void 0 : model.nominalCapacityKwh) != null ? _b : null);
    await this.writeCachedState(`${rootId}.usableCapacity`, (_c = model == null ? void 0 : model.usableCapacityKwh) != null ? _c : null);
    await this.writeCachedState(`${rootId}.cycles.reported`, reportedCycles);
    for (const period of STATISTICS_PERIODS) {
      await this.writeCachedState(
        `${rootId}.cycles.${period}`,
        model ? (0, import_batteryAnalysis.calculateEquivalentFullCycles)(statistics[PERIOD_MODEL_MAP[period]], model.nominalCapacityKwh) : null
      );
    }
    await this.writeCachedState(`${rootId}.info.lastUpdate`, updatedAt);
  }
  async ensureStatisticsTree(rootId, aggregate) {
    await this.adapter.extendObjectAsync(
      rootId,
      {
        type: "channel",
        common: {
          name: aggregate ? "Combined energy statistics" : "Energy statistics"
        },
        native: {}
      }
    );
    for (const period of STATISTICS_PERIODS) {
      await this.ensurePeriod(
        rootId,
        period
      );
    }
    await this.ensureInfoChannel(
      rootId,
      aggregate
    );
  }
  async ensurePeriod(rootId, period) {
    const periodId = `${rootId}.${period}`;
    await this.removeLegacyPeriodStates(
      periodId
    );
    await this.adapter.extendObjectAsync(
      periodId,
      {
        type: "channel",
        common: {
          name: `${this.capitalize(period)} statistics`
        },
        native: {
          period
        }
      }
    );
    await this.ensureState(
      `${periodId}.chargedEnergy`,
      {
        name: "Charged energy",
        desc: "Battery energy charged during this period.",
        type: "number",
        role: "value.energy",
        unit: "kWh"
      }
    );
    await this.ensureState(
      `${periodId}.dischargedEnergy`,
      {
        name: "Discharged energy",
        desc: "Battery energy discharged during this period.",
        type: "number",
        role: "value.energy",
        unit: "kWh"
      }
    );
    await this.ensureState(
      `${periodId}.firstTimestamp`,
      {
        name: "First timestamp",
        desc: "First included historical measurement.",
        type: "string",
        role: "date",
        def: ""
      }
    );
    await this.ensureState(
      `${periodId}.lastTimestamp`,
      {
        name: "Last timestamp",
        desc: "Last included historical measurement.",
        type: "string",
        role: "date",
        def: ""
      }
    );
  }
  async ensureInfoChannel(rootId, aggregate) {
    const infoId = `${rootId}.info`;
    await this.adapter.extendObjectAsync(
      infoId,
      {
        type: "channel",
        common: {
          name: "Statistics information"
        },
        native: {}
      }
    );
    await this.ensureState(
      `${infoId}.firstMeasurement`,
      {
        name: "First measurement",
        desc: "Earliest available historical measurement.",
        type: "string",
        role: "date",
        def: ""
      }
    );
    await this.ensureState(
      `${infoId}.lastUpdate`,
      {
        name: "Last update",
        desc: "Last successful statistics update.",
        type: "string",
        role: "date",
        def: ""
      }
    );
    await this.ensureState(
      `${infoId}.source`,
      {
        name: "Source",
        desc: "Historical source used by the statistics engine.",
        type: "string",
        role: "text",
        def: PLACEHOLDER_SOURCE
      }
    );
    await this.ensureState(
      `${infoId}.lastError`,
      {
        name: "Last error",
        desc: "Last history or statistics error.",
        type: "string",
        role: "text",
        def: ""
      }
    );
    if (aggregate) {
      await this.ensureState(
        `${infoId}.deviceCount`,
        {
          name: "Device count",
          desc: "Storage devices included in the aggregate.",
          type: "number",
          role: "value",
          def: 0
        }
      );
    }
  }
  async removeLegacyPeriodStates(periodId) {
    for (const stateName of [
      "samples",
      "source",
      "completeness"
    ]) {
      try {
        await this.adapter.delObjectAsync(
          `${periodId}.${stateName}`
        );
      } catch {
      }
      this.stateCache.delete(
        `${periodId}.${stateName}`
      );
    }
  }
  async removeLegacyAggregateTrees() {
    for (const rootId of ["battery", "statistics"]) {
      try {
        await this.adapter.delObjectAsync(rootId, { recursive: true });
      } catch {
      }
      for (const cachedId of this.stateCache.keys()) {
        if (cachedId === rootId || cachedId.startsWith(`${rootId}.`)) {
          this.stateCache.delete(cachedId);
        }
      }
    }
  }
  async ensureState(id, common) {
    await this.adapter.extendObjectAsync(
      id,
      {
        type: "state",
        common: {
          ...common,
          read: true,
          write: false
        },
        native: {
          statisticsVersion: 1
        }
      }
    );
  }
  sanitizeObjectId(value) {
    return value.trim().replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );
  }
  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SaxPowerStatisticsStateEngine
});
//# sourceMappingURL=statisticsStateEngine.js.map
