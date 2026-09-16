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
var batteryDischargeLoadStateEngine_exports = {};
__export(batteryDischargeLoadStateEngine_exports, {
  BatteryDischargeLoadStateEngine: () => BatteryDischargeLoadStateEngine
});
module.exports = __toCommonJS(batteryDischargeLoadStateEngine_exports);
var import_batteryAnalysis = require("./batteryAnalysis");
var import_batteryDischargeLoadLearning = require("./batteryDischargeLoadLearning");
class BatteryDischargeLoadStateEngine {
  constructor(adapter) {
    this.adapter = adapter;
  }
  progress = /* @__PURE__ */ new Map();
  loaded = /* @__PURE__ */ new Set();
  initialized = /* @__PURE__ */ new Set();
  summaryInitialized = false;
  async ensureObjects(devices) {
    if (!this.summaryInitialized) {
      await this.ensureTree("summary.battery.dischargeLoad", true);
      this.summaryInitialized = true;
    }
    for (const device of devices) {
      const serial = this.sanitizeObjectId(device.info.serialNumber);
      if (!serial || this.initialized.has(serial)) continue;
      await this.ensureTree(`devices.${serial}.battery.dischargeLoad`, false);
      this.initialized.add(serial);
    }
  }
  async observe(devices, batteryModels) {
    var _a;
    const results = [];
    for (const device of devices) {
      const serial = this.sanitizeObjectId(device.info.serialNumber);
      const model = (0, import_batteryAnalysis.getBatteryModel)(batteryModels[device.info.serialNumber]);
      if (!serial || !model) continue;
      const root = `devices.${serial}.battery.dischargeLoad`;
      await this.loadProgress(root, serial, device.info.receivedTimestamp);
      const result = (0, import_batteryDischargeLoadLearning.observeBatteryDischargeLoad)((_a = this.progress.get(serial)) != null ? _a : null, {
        timestamp: device.info.receivedTimestamp,
        soc: device.live.soc,
        batteryPower: device.live.batteryPower,
        direction: device.live.batteryDirection,
        gridImportPowerW: device.live.gridImportPower
      }, model.usableCapacityKwh, model.maximumDischargePowerW);
      this.progress.set(serial, result.progress);
      await this.publish(root, result, true);
      results.push(result);
    }
    await this.publishSummary(results);
  }
  async ensureTree(root, summary) {
    await this.adapter.extendObjectAsync(root, { type: "channel", common: { name: "Battery discharge load and capability observation" }, native: {} });
    const definitions = {
      actualDischargePowerW: { name: "Actual discharge power", desc: "Current battery discharging power observed from SAX live data.", type: "number", role: "value.power", unit: "W", def: 0 },
      maximumDischargePowerW: { name: "Maximum discharge power", desc: "Technical maximum discharge power for the configured SAX battery model.", type: "number", role: "value.power", unit: "W", def: 0 },
      utilizationPercent: { name: "Discharge power utilization", desc: "Actual discharging power as a percentage of the model maximum discharge power.", type: "number", role: "value", unit: "%", def: 0 },
      highLoadThresholdW: { name: "High discharge load threshold", desc: "Derived threshold above which discharge is considered a high-load phase.", type: "number", role: "value.power", unit: "W", def: 0 },
      highLoadActive: { name: "High discharge load active", desc: "Whether the current discharge power is at or above the derived high-load threshold.", type: "boolean", role: "indicator", def: false },
      consecutiveHighLoadMinutes: { name: "Consecutive high-load duration", desc: "Duration of the current uninterrupted high-discharge-load phase.", type: "number", role: "value.interval", unit: "min", def: 0 },
      highLoadMinutesToday: { name: "High-load minutes today", desc: "Accumulated duration of high-discharge-load operation today.", type: "number", role: "value.interval", unit: "min", def: 0 },
      peakDischargePowerTodayW: { name: "Peak discharge power today", desc: "Highest observed battery discharging power today.", type: "number", role: "value.power", unit: "W", def: 0 },
      dischargedEnergyTodayKwh: { name: "Observed discharged energy today", desc: "Live-integrated battery discharge energy observed today.", type: "number", role: "value.energy", unit: "kWh", def: 0 },
      equivalentDischargeCyclesToday: { name: "Equivalent discharge cycles today", desc: "Observed discharged energy divided by usable battery capacity.", type: "number", role: "value", unit: "cycles", def: 0 },
      loadIndex: { name: "Inferred discharge load index", desc: "Derived 0-100 battery discharge-load index based on power utilization, sustained high load and discharged energy. This is not SAX-reported telemetry.", type: "number", role: "value", unit: "%" },
      loadStatus: { name: "Inferred discharge load status", desc: "Interpretation of the derived discharge-load index.", type: "string", role: "text", def: "normal" },
      capabilitySocBin: { name: "Discharge capability SOC bin", desc: "SOC range used for the current learned discharge capability baseline.", type: "string", role: "text", def: "" },
      expectedDischargePowerW: { name: "Expected discharge capability", desc: "Learned 75th percentile of demand-backed discharge observations in the current SOC bin.", type: "number", role: "value.power", unit: "W" },
      capabilityRatioPercent: { name: "Discharge capability ratio", desc: "Actual demand-backed discharge power relative to the learned SOC-specific baseline.", type: "number", role: "value", unit: "%" },
      capabilityStatus: { name: "Discharge capability status", desc: "Observation-only capability state: notTestable, learning, normal, limited, recovering or recovered.", type: "string", role: "text", def: "notTestable" },
      capabilityTestable: { name: "Discharge capability testable", desc: "True when substantial battery discharge and simultaneous grid import prove unmet demand.", type: "boolean", role: "indicator", def: false },
      demandEvidence: { name: "Unmet discharge demand evidence", desc: "True when simultaneous grid import proves demand remains beyond current battery discharge.", type: "boolean", role: "indicator", def: false },
      limitationEvidence: { name: "Discharge limitation evidence", desc: "True when a qualified demand-backed observation falls below 70 percent of an established SOC-specific baseline.", type: "boolean", role: "indicator", def: false },
      qualifiedCapabilitySamples: { name: "Qualified discharge capability samples", desc: "Demand-backed observations supporting the current SOC-specific discharge capability baseline.", type: "number", role: "value", def: 0 },
      capabilityConfidence: { name: "Discharge capability confidence", desc: "Confidence of the learned discharge capability baseline in the current SOC bin.", type: "string", role: "text", def: "none" },
      activeCapabilityEpisode: { name: "Active discharge limitation episode", desc: "Persistent JSON context captured when a discharge capability limitation begins.", type: "string", role: "json", def: "" },
      limitationEvents: { name: "Discharge limitation events", desc: "Number of observed discharge capability limitation episodes.", type: "number", role: "value", def: 0 },
      recoveryEvents: { name: "Discharge recovery events", desc: "Number of observed recoveries from discharge capability limitation.", type: "number", role: "value", def: 0 },
      lastRecoveryAt: { name: "Last discharge recovery", desc: "Timestamp of the most recently observed discharge capability recovery.", type: "string", role: "date", def: "" },
      lastRecoveryDurationMinutes: { name: "Last discharge recovery duration", desc: "Elapsed time from detected discharge limitation to observed recovery.", type: "number", role: "value.interval", unit: "min" },
      lastUpdate: { name: "Discharge load last update", desc: "Timestamp of the latest discharge-load observation.", type: "string", role: "date", def: "" }
    };
    for (const [id, definition] of Object.entries(definitions)) await this.ensureState(`${root}.${id}`, definition);
    await this.adapter.extendObjectAsync(`${root}.capabilityCurve`, { type: "channel", common: { name: "Learned discharge capability curve" }, native: {} });
    for (const bin of import_batteryDischargeLoadLearning.BATTERY_DISCHARGE_CAPABILITY_SOC_BINS) {
      const id = bin.id.replaceAll("-", "_");
      await this.ensureState(`${root}.capabilityCurve.${id}ExpectedPowerW`, { name: `${bin.id}% expected discharge capability`, desc: "Learned 75th percentile from qualified demand-backed observations.", type: "number", role: "value.power", unit: "W" });
      await this.ensureState(`${root}.capabilityCurve.${id}Samples`, { name: `${bin.id}% qualified samples`, desc: "Qualified samples supporting this SOC discharge capability bin.", type: "number", role: "value", def: 0 });
      await this.ensureState(`${root}.capabilityCurve.${id}MaxObservedPowerW`, { name: `${bin.id}% maximum observed discharge power`, desc: "Highest actual discharge power observed in this SOC bin.", type: "number", role: "value.power", unit: "W", def: 0 });
    }
    if (summary) return;
    await this.ensureState(`${root}.progress`, { name: "Discharge load observation progress", desc: "Internal persistent discharge-load and capability observation state.", type: "string", role: "json", def: "" });
  }
  async ensureState(id, definition) {
    await this.adapter.extendObjectAsync(id, { type: "state", common: { name: definition.name, desc: definition.desc, type: definition.type, role: definition.role, read: true, write: false, ...definition.unit === void 0 ? {} : { unit: definition.unit }, ...definition.def === void 0 ? {} : { def: definition.def } }, native: {} });
  }
  async loadProgress(root, serial, timestamp) {
    if (this.loaded.has(serial)) return;
    this.loaded.add(serial);
    if (!this.adapter.getStateAsync) return;
    try {
      const state = await this.adapter.getStateAsync(`${root}.progress`);
      if (typeof (state == null ? void 0 : state.val) !== "string" || !state.val) return;
      this.progress.set(serial, (0, import_batteryDischargeLoadLearning.normalizeBatteryDischargeLoadProgress)(JSON.parse(state.val), timestamp));
    } catch {
    }
  }
  async publish(root, result, includeProgress) {
    var _a, _b;
    const values = {
      actualDischargePowerW: result.actualDischargePowerW,
      maximumDischargePowerW: result.maximumDischargePowerW,
      utilizationPercent: result.utilizationPercent,
      highLoadThresholdW: result.highLoadThresholdW,
      highLoadActive: result.highLoadActive,
      consecutiveHighLoadMinutes: result.consecutiveHighLoadMinutes,
      highLoadMinutesToday: result.highLoadMinutesToday,
      peakDischargePowerTodayW: result.peakDischargePowerTodayW,
      dischargedEnergyTodayKwh: result.dischargedEnergyTodayKwh,
      equivalentDischargeCyclesToday: result.equivalentDischargeCyclesToday,
      loadIndex: result.loadIndex,
      loadStatus: result.loadStatus,
      capabilitySocBin: (_a = result.capabilitySocBin) != null ? _a : "",
      expectedDischargePowerW: result.expectedDischargePowerW,
      capabilityRatioPercent: result.capabilityRatioPercent,
      capabilityStatus: result.capabilityStatus,
      capabilityTestable: result.capabilityTestable,
      demandEvidence: result.demandEvidence,
      limitationEvidence: result.limitationEvidence,
      qualifiedCapabilitySamples: result.qualifiedCapabilitySamples,
      capabilityConfidence: result.capabilityConfidence,
      activeCapabilityEpisode: result.progress.activeCapabilityEpisode ? JSON.stringify(result.progress.activeCapabilityEpisode) : "",
      limitationEvents: result.progress.limitationEvents,
      recoveryEvents: result.progress.recoveryEvents,
      lastRecoveryAt: (_b = result.progress.lastRecoveryAt) != null ? _b : "",
      lastRecoveryDurationMinutes: result.progress.lastRecoveryDurationMinutes,
      lastUpdate: result.progress.lastUpdate
    };
    await Promise.all(Object.entries(values).map(([id, val]) => this.adapter.setStateAsync(`${root}.${id}`, { val, ack: true })));
    for (const binDefinition of import_batteryDischargeLoadLearning.BATTERY_DISCHARGE_CAPABILITY_SOC_BINS) {
      const bin = result.progress.capabilityBins[binDefinition.id];
      const id = binDefinition.id.replaceAll("-", "_");
      const expected = this.percentile75(bin.samples);
      await Promise.all([
        this.adapter.setStateAsync(`${root}.capabilityCurve.${id}ExpectedPowerW`, { val: expected, ack: true }),
        this.adapter.setStateAsync(`${root}.capabilityCurve.${id}Samples`, { val: bin.samples.length, ack: true }),
        this.adapter.setStateAsync(`${root}.capabilityCurve.${id}MaxObservedPowerW`, { val: Math.round(bin.maxObservedDischargePowerW), ack: true })
      ]);
    }
    if (includeProgress) await this.adapter.setStateAsync(`${root}.progress`, { val: JSON.stringify(result.progress), ack: true });
  }
  async publishSummary(results) {
    var _a;
    if (results.length === 0) return;
    if (results.length === 1) {
      await this.publish("summary.battery.dischargeLoad", results[0], false);
      return;
    }
    const root = "summary.battery.dischargeLoad";
    const total = (selector) => results.reduce((sum, result) => sum + selector(result), 0);
    const loadIndices = results.map((result) => result.loadIndex);
    await Promise.all([
      this.adapter.setStateAsync(`${root}.actualDischargePowerW`, { val: total((r) => r.actualDischargePowerW), ack: true }),
      this.adapter.setStateAsync(`${root}.maximumDischargePowerW`, { val: total((r) => r.maximumDischargePowerW), ack: true }),
      this.adapter.setStateAsync(`${root}.utilizationPercent`, { val: null, ack: true }),
      this.adapter.setStateAsync(`${root}.highLoadThresholdW`, { val: total((r) => r.highLoadThresholdW), ack: true }),
      this.adapter.setStateAsync(`${root}.highLoadActive`, { val: results.some((r) => r.highLoadActive), ack: true }),
      this.adapter.setStateAsync(`${root}.consecutiveHighLoadMinutes`, { val: Math.max(...results.map((r) => r.consecutiveHighLoadMinutes)), ack: true }),
      this.adapter.setStateAsync(`${root}.highLoadMinutesToday`, { val: total((r) => r.highLoadMinutesToday), ack: true }),
      this.adapter.setStateAsync(`${root}.peakDischargePowerTodayW`, { val: Math.max(...results.map((r) => r.peakDischargePowerTodayW)), ack: true }),
      this.adapter.setStateAsync(`${root}.dischargedEnergyTodayKwh`, { val: total((r) => r.dischargedEnergyTodayKwh), ack: true }),
      this.adapter.setStateAsync(`${root}.equivalentDischargeCyclesToday`, { val: total((r) => {
        var _a2;
        return (_a2 = r.equivalentDischargeCyclesToday) != null ? _a2 : 0;
      }), ack: true }),
      this.adapter.setStateAsync(`${root}.loadIndex`, { val: loadIndices.length ? Math.max(...loadIndices) : null, ack: true }),
      this.adapter.setStateAsync(`${root}.loadStatus`, { val: loadIndices.length ? "mixed" : "normal", ack: true }),
      this.adapter.setStateAsync(`${root}.capabilitySocBin`, { val: "mixed", ack: true }),
      this.adapter.setStateAsync(`${root}.capabilityStatus`, { val: results.some((r) => r.limitationEvidence) ? "limited" : "mixed", ack: true }),
      this.adapter.setStateAsync(`${root}.capabilityTestable`, { val: results.some((r) => r.capabilityTestable), ack: true }),
      this.adapter.setStateAsync(`${root}.demandEvidence`, { val: results.some((r) => r.demandEvidence), ack: true }),
      this.adapter.setStateAsync(`${root}.limitationEvidence`, { val: results.some((r) => r.limitationEvidence), ack: true }),
      this.adapter.setStateAsync(`${root}.lastUpdate`, { val: (_a = results.map((r) => r.progress.lastUpdate).sort().at(-1)) != null ? _a : "", ack: true })
    ]);
  }
  percentile75(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1)]);
  }
  sanitizeObjectId(value) {
    return value.trim().replace(/[.\s]+/g, "_").replace(/[^A-Za-z0-9_-]/g, "_");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BatteryDischargeLoadStateEngine
});
//# sourceMappingURL=batteryDischargeLoadStateEngine.js.map
