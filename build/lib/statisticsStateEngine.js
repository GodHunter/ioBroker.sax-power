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
  constructor(adapter) {
    this.adapter = adapter;
  }
  async ensureObjects(devices) {
    if (!this.aggregateInitialized) {
      await this.ensureStatisticsTree(
        "statistics",
        true
      );
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
      this.initializedDevices.add(
        serialNumber
      );
    }
    await this.writeCachedState(
      "statistics.info.deviceCount",
      devices.length
    );
  }
  async writeStatistics(result, metadata, updatedAt) {
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
    }
    await this.writeStatisticsTree(
      "statistics",
      {
        serialNumber: "aggregate",
        ...result.total
      },
      metadata.total,
      updatedAt
    );
    await this.writeCachedState(
      "statistics.info.deviceCount",
      Object.keys(
        result.devices
      ).length
    );
  }
  async writeError(message) {
    await this.writeCachedState(
      "statistics.info.lastError",
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
