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
var batteryPowerAcceptanceStateEngine_exports = {};
__export(batteryPowerAcceptanceStateEngine_exports, {
  BatteryPowerAcceptanceStateEngine: () => BatteryPowerAcceptanceStateEngine
});
module.exports = __toCommonJS(batteryPowerAcceptanceStateEngine_exports);
var import_batteryAnalysis = require("./batteryAnalysis");
var import_batteryPowerAcceptanceLearning = require("./batteryPowerAcceptanceLearning");
var import_strategyChargingStates = require("./strategyChargingStates");
class BatteryPowerAcceptanceStateEngine {
  constructor(adapter) {
    this.adapter = adapter;
  }
  progress = /* @__PURE__ */ new Map();
  loaded = /* @__PURE__ */ new Set();
  initialized = /* @__PURE__ */ new Set();
  summaryInitialized = false;
  async ensureObjects(devices) {
    if (!this.summaryInitialized) {
      await this.ensureTree("summary.battery.powerAcceptance", true);
      this.summaryInitialized = true;
    }
    for (const device of devices) {
      const serial = this.sanitizeObjectId(device.info.serialNumber);
      if (!serial || this.initialized.has(serial)) continue;
      await this.ensureTree(`devices.${serial}.battery.powerAcceptance`, false);
      this.initialized.add(serial);
    }
  }
  async observe(devices, batteryModels) {
    var _a;
    const requestedChargePowerW = await this.readRequestedChargePower();
    const results = [];
    for (const device of devices) {
      const serial = this.sanitizeObjectId(device.info.serialNumber);
      const model = (0, import_batteryAnalysis.getBatteryModel)(batteryModels[device.info.serialNumber]);
      if (!serial || !model) continue;
      const root = `devices.${serial}.battery.powerAcceptance`;
      await this.loadProgress(root, serial, device.info.receivedTimestamp);
      const result = (0, import_batteryPowerAcceptanceLearning.observeBatteryPowerAcceptance)(
        (_a = this.progress.get(serial)) != null ? _a : null,
        {
          timestamp: device.info.receivedTimestamp,
          soc: device.live.soc,
          batteryPower: device.live.batteryPower,
          direction: device.live.batteryDirection,
          requestedChargePowerW,
          gridExportPowerW: device.live.gridExportPower
        },
        model.usableCapacityKwh
      );
      this.progress.set(serial, result.progress);
      await this.publish(root, result, true);
      results.push(result);
    }
    await this.publishSummary(results);
  }
  async ensureTree(root, persistent) {
    await this.adapter.extendObjectAsync(root, {
      type: "channel",
      common: { name: "Battery power acceptance learning" },
      native: {}
    });
    const definitions = {
      socBin: { name: "SOC acceptance bin", desc: "SOC range used for the current learned charging acceptance baseline.", type: "string", role: "text", def: "" },
      requestedChargePowerW: { name: "Requested charge power", desc: "Current automatic register 44 charge-power limit used as request context.", type: "number", role: "value.power", unit: "W" },
      actualChargePowerW: { name: "Actual charge power", desc: "Actual battery charging power observed from SAX live data.", type: "number", role: "value.power", unit: "W" },
      acceptanceRatioPercent: { name: "Charge request acceptance ratio", desc: "Actual charging power divided by requested charging limit. This alone is not interpreted as stress.", type: "number", role: "value", unit: "%" },
      expectedAcceptancePowerW: { name: "Expected SOC-specific charge acceptance", desc: "Learned 75th percentile of qualified surplus-backed charging observations in the current SOC bin.", type: "number", role: "value.power", unit: "W" },
      acceptanceDeviationW: { name: "Charge acceptance deviation", desc: "Actual charge power minus learned SOC-specific expected acceptance.", type: "number", role: "value.power", unit: "W" },
      acceptanceDeviationPercent: { name: "Charge acceptance deviation", desc: "Relative deviation from learned SOC-specific expected acceptance.", type: "number", role: "value", unit: "%" },
      qualifiedSamples: { name: "Qualified acceptance samples", desc: "Surplus-backed samples in the current SOC bin used to learn the normal charge acceptance curve.", type: "number", role: "value", def: 0 },
      confidence: { name: "Acceptance learning confidence", desc: "Confidence of the learned baseline in the current SOC bin.", type: "string", role: "text", def: "none" },
      stressIndex: { name: "Inferred battery load index", desc: "Derived 0-100 deviation index after removing the learned normal SOC taper. This is not a SAX-reported stress value.", type: "number", role: "value", unit: "%" },
      stressStatus: { name: "Inferred battery load status", desc: "Interpretation of the inferred deviation index; remains unavailable/learning until the SOC-specific baseline is established.", type: "string", role: "text", def: "notAvailable" },
      chargedEnergyTodayKwh: { name: "Observed charged energy today", desc: "Live-integrated charging energy collected by the acceptance learner.", type: "number", role: "value.energy", unit: "kWh", def: 0 },
      dischargedEnergyTodayKwh: { name: "Observed discharged energy today", desc: "Live-integrated discharging energy collected by the acceptance learner.", type: "number", role: "value.energy", unit: "kWh", def: 0 },
      throughputTodayKwh: { name: "Observed battery throughput today", desc: "Sum of live-integrated charging and discharging energy used as battery-load context.", type: "number", role: "value.energy", unit: "kWh", def: 0 },
      equivalentFullCyclesToday: { name: "Observed equivalent full cycles today", desc: "Live throughput divided by twice usable capacity; diagnostic context for power acceptance learning.", type: "number", role: "value", unit: "cycles" },
      exportEvidence: { name: "Surplus evidence", desc: "True when simultaneous grid export proves that more energy was available than the battery accepted.", type: "boolean", role: "indicator", def: false },
      lastUpdate: { name: "Acceptance learning last update", desc: "Timestamp of the latest acceptance observation.", type: "string", role: "date", def: "" }
    };
    for (const [id, definition] of Object.entries(definitions)) {
      await this.ensureState(`${root}.${id}`, definition);
    }
    await this.adapter.extendObjectAsync(`${root}.curve`, { type: "channel", common: { name: "Learned SOC acceptance curve" }, native: {} });
    for (const bin of import_batteryPowerAcceptanceLearning.BATTERY_POWER_ACCEPTANCE_SOC_BINS) {
      const id = bin.id.replaceAll("-", "_");
      await this.ensureState(`${root}.curve.${id}ExpectedPowerW`, { name: `${bin.id}% expected charge acceptance`, desc: "Learned 75th percentile from qualified surplus-backed observations.", type: "number", role: "value.power", unit: "W" });
      await this.ensureState(`${root}.curve.${id}Samples`, { name: `${bin.id}% qualified samples`, desc: "Qualified samples supporting this SOC acceptance bin.", type: "number", role: "value", def: 0 });
      await this.ensureState(`${root}.curve.${id}MaxObservedPowerW`, { name: `${bin.id}% maximum observed charge power`, desc: "Highest actual charging power observed in this SOC bin, including non-qualified lower-bound observations.", type: "number", role: "value.power", unit: "W", def: 0 });
    }
    if (persistent) return;
    await this.ensureState(`${root}.progress`, { name: "Power acceptance learning progress", desc: "Internal persistent learning state.", type: "string", role: "json", def: "" });
  }
  async ensureState(id, definition) {
    await this.adapter.extendObjectAsync(id, {
      type: "state",
      common: {
        name: definition.name,
        desc: definition.desc,
        type: definition.type,
        role: definition.role,
        read: true,
        write: false,
        ...definition.unit === void 0 ? {} : { unit: definition.unit },
        ...definition.def === void 0 ? {} : { def: definition.def }
      },
      native: {}
    });
  }
  async readRequestedChargePower() {
    if (!this.adapter.getStateAsync) return null;
    try {
      const state = await this.adapter.getStateAsync(import_strategyChargingStates.STRATEGY_CHARGING_STATE_IDS.targetChargePowerW);
      return typeof (state == null ? void 0 : state.val) === "number" && Number.isFinite(state.val) ? Math.max(0, state.val) : null;
    } catch {
      return null;
    }
  }
  async loadProgress(root, serial, timestamp) {
    if (this.loaded.has(serial)) return;
    this.loaded.add(serial);
    if (!this.adapter.getStateAsync) return;
    try {
      const state = await this.adapter.getStateAsync(`${root}.progress`);
      if (typeof (state == null ? void 0 : state.val) !== "string" || !state.val) return;
      const parsed = JSON.parse(state.val);
      this.progress.set(serial, (0, import_batteryPowerAcceptanceLearning.normalizeBatteryPowerAcceptanceProgress)(parsed, timestamp));
    } catch {
    }
  }
  async publish(root, result, includeProgress) {
    var _a;
    const values = {
      socBin: (_a = result.socBin) != null ? _a : "",
      requestedChargePowerW: result.requestedChargePowerW,
      actualChargePowerW: result.actualChargePowerW,
      acceptanceRatioPercent: result.acceptanceRatioPercent,
      expectedAcceptancePowerW: result.expectedAcceptancePowerW,
      acceptanceDeviationW: result.acceptanceDeviationW,
      acceptanceDeviationPercent: result.acceptanceDeviationPercent,
      qualifiedSamples: result.qualifiedSamples,
      confidence: result.confidence,
      stressIndex: result.stressIndex,
      stressStatus: result.stressStatus,
      chargedEnergyTodayKwh: result.chargedEnergyTodayKwh,
      dischargedEnergyTodayKwh: result.dischargedEnergyTodayKwh,
      throughputTodayKwh: result.throughputTodayKwh,
      equivalentFullCyclesToday: result.equivalentFullCyclesToday,
      exportEvidence: result.exportEvidence,
      lastUpdate: result.progress.lastUpdate
    };
    await Promise.all(Object.entries(values).map(([id, val]) => this.adapter.setStateAsync(`${root}.${id}`, { val, ack: true })));
    for (const binDefinition of import_batteryPowerAcceptanceLearning.BATTERY_POWER_ACCEPTANCE_SOC_BINS) {
      const bin = result.progress.bins[binDefinition.id];
      const id = binDefinition.id.replaceAll("-", "_");
      const expected = bin.samples.length === 0 ? null : this.percentile75(bin.samples);
      await Promise.all([
        this.adapter.setStateAsync(`${root}.curve.${id}ExpectedPowerW`, { val: expected, ack: true }),
        this.adapter.setStateAsync(`${root}.curve.${id}Samples`, { val: bin.samples.length, ack: true }),
        this.adapter.setStateAsync(`${root}.curve.${id}MaxObservedPowerW`, { val: Math.round(bin.maxObservedChargePowerW), ack: true })
      ]);
    }
    if (includeProgress) await this.adapter.setStateAsync(`${root}.progress`, { val: JSON.stringify(result.progress), ack: true });
  }
  async publishSummary(results) {
    var _a;
    if (results.length === 0) return;
    if (results.length === 1) {
      await this.publish("summary.battery.powerAcceptance", results[0], false);
      return;
    }
    const root = "summary.battery.powerAcceptance";
    const stressValues = results.map((result) => result.stressIndex).filter((value) => value !== null);
    const total = (selector) => results.reduce((sum, result) => sum + selector(result), 0);
    await Promise.all([
      this.adapter.setStateAsync(`${root}.socBin`, { val: "mixed", ack: true }),
      this.adapter.setStateAsync(`${root}.requestedChargePowerW`, { val: total((result) => {
        var _a2;
        return (_a2 = result.requestedChargePowerW) != null ? _a2 : 0;
      }), ack: true }),
      this.adapter.setStateAsync(`${root}.actualChargePowerW`, { val: total((result) => result.actualChargePowerW), ack: true }),
      this.adapter.setStateAsync(`${root}.stressIndex`, { val: stressValues.length ? Math.max(...stressValues) : null, ack: true }),
      this.adapter.setStateAsync(`${root}.stressStatus`, { val: stressValues.length ? "mixed" : "learning", ack: true }),
      this.adapter.setStateAsync(`${root}.chargedEnergyTodayKwh`, { val: total((result) => result.chargedEnergyTodayKwh), ack: true }),
      this.adapter.setStateAsync(`${root}.dischargedEnergyTodayKwh`, { val: total((result) => result.dischargedEnergyTodayKwh), ack: true }),
      this.adapter.setStateAsync(`${root}.throughputTodayKwh`, { val: total((result) => result.throughputTodayKwh), ack: true }),
      this.adapter.setStateAsync(`${root}.lastUpdate`, { val: (_a = results.map((result) => result.progress.lastUpdate).sort().at(-1)) != null ? _a : "", ack: true })
    ]);
  }
  percentile75(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1)]);
  }
  sanitizeObjectId(value) {
    return value.trim().replace(/[.\s]+/g, "_").replace(/[^A-Za-z0-9_-]/g, "_");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BatteryPowerAcceptanceStateEngine
});
//# sourceMappingURL=batteryPowerAcceptanceStateEngine.js.map
