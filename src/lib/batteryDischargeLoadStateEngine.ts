import type { SaxPowerObjectAdapter } from "./adapterContract";
import { getBatteryModel } from "./batteryAnalysis";
import {
	BATTERY_DISCHARGE_CAPABILITY_SOC_BINS,
	observeBatteryDischargeLoad,
	normalizeBatteryDischargeLoadProgress,
	type BatteryDischargeLoadProgress,
	type BatteryDischargeLoadResult,
} from "./batteryDischargeLoadLearning";
import type { SaxPowerDevice } from "./saxPowerDevice";

interface StateDefinition {
	readonly name: string;
	readonly desc: string;
	readonly type: "number" | "string" | "boolean";
	readonly role: string;
	readonly unit?: string;
	readonly def?: string | number | boolean;
}

export class BatteryDischargeLoadStateEngine {
	private readonly progress = new Map<string, BatteryDischargeLoadProgress>();
	private readonly loaded = new Set<string>();
	private readonly initialized = new Set<string>();
	private summaryInitialized = false;

	public constructor(private readonly adapter: SaxPowerObjectAdapter) {}

	public async ensureObjects(devices: readonly SaxPowerDevice[]): Promise<void> {
		if (!this.summaryInitialized) { await this.ensureTree("summary.battery.dischargeLoad", true); this.summaryInitialized = true; }
		for (const device of devices) {
			const serial = this.sanitizeObjectId(device.info.serialNumber);
			if (!serial || this.initialized.has(serial)) continue;
			await this.ensureTree(`devices.${serial}.battery.dischargeLoad`, false);
			this.initialized.add(serial);
		}
	}

	public async observe(devices: readonly SaxPowerDevice[], batteryModels: Record<string, string>): Promise<void> {
		const results: BatteryDischargeLoadResult[] = [];
		for (const device of devices) {
			const serial = this.sanitizeObjectId(device.info.serialNumber);
			const model = getBatteryModel(batteryModels[device.info.serialNumber]);
			if (!serial || !model) continue;
			const root = `devices.${serial}.battery.dischargeLoad`;
			await this.loadProgress(root, serial, device.info.receivedTimestamp);
			const result = observeBatteryDischargeLoad(this.progress.get(serial) ?? null, {
				timestamp: device.info.receivedTimestamp,
				soc: device.live.soc,
				batteryPower: device.live.batteryPower,
				direction: device.live.batteryDirection,
				gridImportPowerW: device.live.gridImportPower,
			}, model.usableCapacityKwh, model.maximumDischargePowerW);
			this.progress.set(serial, result.progress);
			await this.publish(root, result, true);
			results.push(result);
		}
		await this.publishSummary(results);
	}

	private async ensureTree(root: string, summary: boolean): Promise<void> {
		await this.adapter.extendObjectAsync(root, { type: "channel", common: { name: "Battery discharge load and capability observation" }, native: {} });
		const definitions: Record<string, StateDefinition> = {
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
			lastUpdate: { name: "Discharge load last update", desc: "Timestamp of the latest discharge-load observation.", type: "string", role: "date", def: "" },
		};
		for (const [id, definition] of Object.entries(definitions)) await this.ensureState(`${root}.${id}`, definition);
		await this.adapter.extendObjectAsync(`${root}.capabilityCurve`, { type: "channel", common: { name: "Learned discharge capability curve" }, native: {} });
		for (const bin of BATTERY_DISCHARGE_CAPABILITY_SOC_BINS) {
			const id = bin.id.replaceAll("-", "_");
			await this.ensureState(`${root}.capabilityCurve.${id}ExpectedPowerW`, { name: `${bin.id}% expected discharge capability`, desc: "Learned 75th percentile from qualified demand-backed observations.", type: "number", role: "value.power", unit: "W" });
			await this.ensureState(`${root}.capabilityCurve.${id}Samples`, { name: `${bin.id}% qualified samples`, desc: "Qualified samples supporting this SOC discharge capability bin.", type: "number", role: "value", def: 0 });
			await this.ensureState(`${root}.capabilityCurve.${id}MaxObservedPowerW`, { name: `${bin.id}% maximum observed discharge power`, desc: "Highest actual discharge power observed in this SOC bin.", type: "number", role: "value.power", unit: "W", def: 0 });
		}
		if (summary) return;
		await this.ensureState(`${root}.progress`, { name: "Discharge load observation progress", desc: "Internal persistent discharge-load and capability observation state.", type: "string", role: "json", def: "" });
	}

	private async ensureState(id: string, definition: StateDefinition): Promise<void> {
		await this.adapter.extendObjectAsync(id, { type: "state", common: { name: definition.name, desc: definition.desc, type: definition.type, role: definition.role, read: true, write: false, ...(definition.unit === undefined ? {} : { unit: definition.unit }), ...(definition.def === undefined ? {} : { def: definition.def }) }, native: {} });
	}

	private async loadProgress(root: string, serial: string, timestamp: string): Promise<void> {
		if (this.loaded.has(serial)) return;
		this.loaded.add(serial);
		if (!this.adapter.getStateAsync) return;
		try {
			const state = await this.adapter.getStateAsync(`${root}.progress`);
			if (typeof state?.val !== "string" || !state.val) return;
			this.progress.set(serial, normalizeBatteryDischargeLoadProgress(JSON.parse(state.val) as BatteryDischargeLoadProgress, timestamp));
		} catch { /* Invalid or manually edited progress is safely ignored. */ }
	}

	private async publish(root: string, result: BatteryDischargeLoadResult, includeProgress: boolean): Promise<void> {
		const values: Record<string, string | number | boolean | null> = {
			actualDischargePowerW: result.actualDischargePowerW, maximumDischargePowerW: result.maximumDischargePowerW,
			utilizationPercent: result.utilizationPercent, highLoadThresholdW: result.highLoadThresholdW, highLoadActive: result.highLoadActive,
			consecutiveHighLoadMinutes: result.consecutiveHighLoadMinutes, highLoadMinutesToday: result.highLoadMinutesToday,
			peakDischargePowerTodayW: result.peakDischargePowerTodayW, dischargedEnergyTodayKwh: result.dischargedEnergyTodayKwh,
			equivalentDischargeCyclesToday: result.equivalentDischargeCyclesToday, loadIndex: result.loadIndex, loadStatus: result.loadStatus,
			capabilitySocBin: result.capabilitySocBin ?? "", expectedDischargePowerW: result.expectedDischargePowerW,
			capabilityRatioPercent: result.capabilityRatioPercent, capabilityStatus: result.capabilityStatus,
			capabilityTestable: result.capabilityTestable, demandEvidence: result.demandEvidence, limitationEvidence: result.limitationEvidence,
			qualifiedCapabilitySamples: result.qualifiedCapabilitySamples, capabilityConfidence: result.capabilityConfidence,
			activeCapabilityEpisode: result.progress.activeCapabilityEpisode ? JSON.stringify(result.progress.activeCapabilityEpisode) : "",
			limitationEvents: result.progress.limitationEvents, recoveryEvents: result.progress.recoveryEvents,
			lastRecoveryAt: result.progress.lastRecoveryAt ?? "", lastRecoveryDurationMinutes: result.progress.lastRecoveryDurationMinutes,
			lastUpdate: result.progress.lastUpdate,
		};
		await Promise.all(Object.entries(values).map(([id, val]) => this.adapter.setStateAsync(`${root}.${id}`, { val, ack: true })));
		for (const binDefinition of BATTERY_DISCHARGE_CAPABILITY_SOC_BINS) {
			const bin = result.progress.capabilityBins[binDefinition.id];
			const id = binDefinition.id.replaceAll("-", "_");
			const expected = this.percentile75(bin.samples);
			await Promise.all([
				this.adapter.setStateAsync(`${root}.capabilityCurve.${id}ExpectedPowerW`, { val: expected, ack: true }),
				this.adapter.setStateAsync(`${root}.capabilityCurve.${id}Samples`, { val: bin.samples.length, ack: true }),
				this.adapter.setStateAsync(`${root}.capabilityCurve.${id}MaxObservedPowerW`, { val: Math.round(bin.maxObservedDischargePowerW), ack: true }),
			]);
		}
		if (includeProgress) await this.adapter.setStateAsync(`${root}.progress`, { val: JSON.stringify(result.progress), ack: true });
	}

	private async publishSummary(results: readonly BatteryDischargeLoadResult[]): Promise<void> {
		if (results.length === 0) return;
		if (results.length === 1) { await this.publish("summary.battery.dischargeLoad", results[0], false); return; }
		const root = "summary.battery.dischargeLoad";
		const total = (selector: (result: BatteryDischargeLoadResult) => number) => results.reduce((sum, result) => sum + selector(result), 0);
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
			this.adapter.setStateAsync(`${root}.equivalentDischargeCyclesToday`, { val: total((r) => r.equivalentDischargeCyclesToday ?? 0), ack: true }),
			this.adapter.setStateAsync(`${root}.loadIndex`, { val: loadIndices.length ? Math.max(...loadIndices) : null, ack: true }),
			this.adapter.setStateAsync(`${root}.loadStatus`, { val: loadIndices.length ? "mixed" : "normal", ack: true }),
			this.adapter.setStateAsync(`${root}.capabilitySocBin`, { val: "mixed", ack: true }),
			this.adapter.setStateAsync(`${root}.capabilityStatus`, { val: results.some((r) => r.limitationEvidence) ? "limited" : "mixed", ack: true }),
			this.adapter.setStateAsync(`${root}.capabilityTestable`, { val: results.some((r) => r.capabilityTestable), ack: true }),
			this.adapter.setStateAsync(`${root}.demandEvidence`, { val: results.some((r) => r.demandEvidence), ack: true }),
			this.adapter.setStateAsync(`${root}.limitationEvidence`, { val: results.some((r) => r.limitationEvidence), ack: true }),
			this.adapter.setStateAsync(`${root}.lastUpdate`, { val: results.map((r) => r.progress.lastUpdate).sort().at(-1) ?? "", ack: true }),
		]);
	}

	private percentile75(values: readonly number[]): number | null {
		if (values.length === 0) return null;
		const sorted = [...values].sort((a, b) => a - b);
		return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1)]);
	}

	private sanitizeObjectId(value: string): string { return value.trim().replace(/[.\s]+/g, "_").replace(/[^A-Za-z0-9_-]/g, "_"); }
}