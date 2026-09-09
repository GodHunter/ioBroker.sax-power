import type { SaxPowerObjectAdapter } from "./adapterContract";
import { getBatteryModel } from "./batteryAnalysis";
import {
	normalizeBatteryDischargeLoadProgress,
	observeBatteryDischargeLoad,
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

	public async observe(devices: readonly SaxPowerDevice[], batteryModels: Record<string, string>): Promise<void> {
		const results: BatteryDischargeLoadResult[] = [];
		for (const device of devices) {
			const serial = this.sanitizeObjectId(device.info.serialNumber);
			const model = getBatteryModel(batteryModels[device.info.serialNumber]);
			if (!serial || !model) continue;
			const root = `devices.${serial}.battery.dischargeLoad`;
			await this.loadProgress(root, serial, device.info.receivedTimestamp);
			const result = observeBatteryDischargeLoad(
				this.progress.get(serial) ?? null,
				{
					timestamp: device.info.receivedTimestamp,
					batteryPower: device.live.batteryPower,
					direction: device.live.batteryDirection,
				},
				model.usableCapacityKwh,
				model.maxDischargePowerW,
			);
			this.progress.set(serial, result.progress);
			await this.publish(root, result, true);
			results.push(result);
		}
		await this.publishSummary(results);
	}

	private async ensureTree(root: string, summary: boolean): Promise<void> {
		await this.adapter.extendObjectAsync(root, {
			type: "channel",
			common: { name: "Battery discharge load observation" },
			native: {},
		});
		const definitions: Record<string, StateDefinition> = {
			actualDischargePowerW: { name: "Actual discharge power", desc: "Current battery discharging power observed from SAX live data.", type: "number", role: "value.power", unit: "W", def: 0 },
			maximumDischargePowerW: { name: "Technical maximum discharge power", desc: "Model-specific SAX technical discharge-power limit used as load reference.", type: "number", role: "value.power", unit: "W", def: 0 },
			utilizationPercent: { name: "Discharge power utilization", desc: "Actual discharge power relative to the model-specific technical maximum.", type: "number", role: "value", unit: "%", def: 0 },
			highLoadThresholdW: { name: "High-load threshold", desc: "Diagnostic threshold at 50 percent of the technical maximum discharge power.", type: "number", role: "value.power", unit: "W", def: 0 },
			highLoadActive: { name: "High discharge load active", desc: "True while actual discharge power is at or above the diagnostic high-load threshold.", type: "boolean", role: "indicator", def: false },
			consecutiveHighLoadMinutes: { name: "Consecutive high-load duration", desc: "Continuous duration of the current high-discharge-load phase.", type: "number", role: "value.interval", unit: "min", def: 0 },
			highLoadMinutesToday: { name: "High-load duration today", desc: "Accumulated duration above the diagnostic high-load threshold today.", type: "number", role: "value.interval", unit: "min", def: 0 },
			peakDischargePowerTodayW: { name: "Peak discharge power today", desc: "Highest observed battery discharge power today.", type: "number", role: "value.power", unit: "W", def: 0 },
			dischargedEnergyTodayKwh: { name: "Observed discharged energy today", desc: "Live-integrated discharged battery energy used as load context.", type: "number", role: "value.energy", unit: "kWh", def: 0 },
			equivalentDischargeCyclesToday: { name: "Equivalent discharge cycles today", desc: "Discharged energy divided by usable battery capacity; diagnostic load context only.", type: "number", role: "value", unit: "cycles" },
			loadIndex: { name: "Inferred discharge load index", desc: "Derived 0-100 operating-load index from power utilization, sustained high load and daily discharged energy. This is not SAX-reported stress telemetry.", type: "number", role: "value", unit: "%", def: 0 },
			loadStatus: { name: "Inferred discharge load status", desc: "Interpretation of the derived discharge load index: idle, normal, elevated or high.", type: "string", role: "text", def: "idle" },
			lastUpdate: { name: "Discharge load last update", desc: "Timestamp of the latest discharge-load observation.", type: "string", role: "date", def: "" },
		};
		for (const [id, definition] of Object.entries(definitions)) {
			await this.ensureState(`${root}.${id}`, definition);
		}
		if (summary) return;
		await this.ensureState(`${root}.progress`, { name: "Discharge load observation progress", desc: "Internal persistent discharge-load state.", type: "string", role: "json", def: "" });
	}

	private async ensureState(id: string, definition: StateDefinition): Promise<void> {
		await this.adapter.extendObjectAsync(id, {
			type: "state",
			common: {
				name: definition.name,
				desc: definition.desc,
				type: definition.type,
				role: definition.role,
				read: true,
				write: false,
				...(definition.unit === undefined ? {} : { unit: definition.unit }),
				...(definition.def === undefined ? {} : { def: definition.def }),
			},
			native: {},
		});
	}

	private async loadProgress(root: string, serial: string, timestamp: string): Promise<void> {
		if (this.loaded.has(serial)) return;
		this.loaded.add(serial);
		if (!this.adapter.getStateAsync) return;
		try {
			const state = await this.adapter.getStateAsync(`${root}.progress`);
			if (typeof state?.val !== "string" || !state.val) return;
			const parsed = JSON.parse(state.val) as BatteryDischargeLoadProgress;
			this.progress.set(serial, normalizeBatteryDischargeLoadProgress(parsed, timestamp));
		} catch {
			// Invalid or manually edited progress is safely ignored.
		}
	}

	private async publish(root: string, result: BatteryDischargeLoadResult, includeProgress: boolean): Promise<void> {
		const values: Record<string, string | number | boolean | null> = {
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
			lastUpdate: result.progress.lastUpdate,
		};
		await Promise.all(Object.entries(values).map(([id, val]) => this.adapter.setStateAsync(`${root}.${id}`, { val, ack: true })));
		if (includeProgress) await this.adapter.setStateAsync(`${root}.progress`, { val: JSON.stringify(result.progress), ack: true });
	}

	private async publishSummary(results: readonly BatteryDischargeLoadResult[]): Promise<void> {
		if (results.length === 0) return;
		if (results.length === 1) {
			await this.publish("summary.battery.dischargeLoad", results[0], false);
			return;
		}
		const root = "summary.battery.dischargeLoad";
		const total = (selector: (result: BatteryDischargeLoadResult) => number) => results.reduce((sum, result) => sum + selector(result), 0);
		const maximumLoadIndex = Math.max(...results.map((result) => result.loadIndex));
		const status = maximumLoadIndex >= 60 ? "high" : maximumLoadIndex >= 30 ? "elevated" : results.some((result) => result.actualDischargePowerW >= 100) ? "normal" : "idle";
		await Promise.all([
			this.adapter.setStateAsync(`${root}.actualDischargePowerW`, { val: total((result) => result.actualDischargePowerW), ack: true }),
			this.adapter.setStateAsync(`${root}.maximumDischargePowerW`, { val: total((result) => result.maximumDischargePowerW), ack: true }),
			this.adapter.setStateAsync(`${root}.utilizationPercent`, { val: total((result) => result.maximumDischargePowerW) > 0 ? Math.round(total((result) => result.actualDischargePowerW) / total((result) => result.maximumDischargePowerW) * 1_000) / 10 : 0, ack: true }),
			this.adapter.setStateAsync(`${root}.highLoadThresholdW`, { val: total((result) => result.highLoadThresholdW), ack: true }),
			this.adapter.setStateAsync(`${root}.highLoadActive`, { val: results.some((result) => result.highLoadActive), ack: true }),
			this.adapter.setStateAsync(`${root}.consecutiveHighLoadMinutes`, { val: Math.max(...results.map((result) => result.consecutiveHighLoadMinutes)), ack: true }),
			this.adapter.setStateAsync(`${root}.highLoadMinutesToday`, { val: total((result) => result.highLoadMinutesToday), ack: true }),
			this.adapter.setStateAsync(`${root}.peakDischargePowerTodayW`, { val: Math.max(...results.map((result) => result.peakDischargePowerTodayW)), ack: true }),
			this.adapter.setStateAsync(`${root}.dischargedEnergyTodayKwh`, { val: total((result) => result.dischargedEnergyTodayKwh), ack: true }),
			this.adapter.setStateAsync(`${root}.equivalentDischargeCyclesToday`, { val: total((result) => result.equivalentDischargeCyclesToday ?? 0), ack: true }),
			this.adapter.setStateAsync(`${root}.loadIndex`, { val: maximumLoadIndex, ack: true }),
			this.adapter.setStateAsync(`${root}.loadStatus`, { val: status, ack: true }),
			this.adapter.setStateAsync(`${root}.lastUpdate`, { val: results.map((result) => result.progress.lastUpdate).sort().at(-1) ?? "", ack: true }),
		]);
	}

	private sanitizeObjectId(value: string): string {
		return value.trim().replace(/[.\s]+/g, "_").replace(/[^A-Za-z0-9_-]/g, "_");
	}
}
