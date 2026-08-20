import type { BatteryDirection } from "./saxPowerDevice";

export const REQUIRED_HEALTH_RUNS = 5;
export const MIN_HEALTH_SOC_SPAN = 40;
export const BATTERY_HEALTH_SCHEMA_VERSION = 3;
const MIN_REJECTED_RUN_SOC_SPAN = 5;
const MIN_POWER_W = 100;
const MAX_GAP_MS = 15 * 60 * 1000;

export interface BatteryHealthSample {
	timestamp: string;
	soc: number | null;
	batteryPower: number | null;
	direction: BatteryDirection;
}
interface ActiveHealthRun {
	direction: "charging" | "discharging";
	startedAt: string;
	lastTimestamp: string;
	startSoc: number;
	currentSoc: number;
	energyKwh: number;
	invalid: boolean;
}

export interface BatteryHealthProgress {
	schemaVersion?: number;
	validRuns: number;
	requiredRuns: number;
	rejectedRuns: number;
	publishedValue: number | null;
	dataCollectionStartedAt: string;
	lastEvaluation: string;
	estimates: number[];
	activeRun: ActiveHealthRun | null;
}

export interface BatteryHealthResult {
	progress: BatteryHealthProgress;
	status: "collectingData" | "insufficientData" | "available";
	value: number | null;
}

export function createBatteryHealthProgress(timestamp: string): BatteryHealthProgress {
	return {
		schemaVersion: BATTERY_HEALTH_SCHEMA_VERSION,
		validRuns: 0,
		requiredRuns: REQUIRED_HEALTH_RUNS,
		rejectedRuns: 0,
		publishedValue: null,
		dataCollectionStartedAt: timestamp,
		lastEvaluation: "",
		estimates: [],
		activeRun: null,
	};
}

export function normalizeBatteryHealthProgress(progress: BatteryHealthProgress): BatteryHealthProgress {
	if (progress.schemaVersion === BATTERY_HEALTH_SCHEMA_VERSION) return progress;
	const legacyValue = progress.validRuns >= progress.requiredRuns
		? median(progress.estimates.slice(-progress.requiredRuns))
		: null;
	return {
		...progress,
		schemaVersion: BATTERY_HEALTH_SCHEMA_VERSION,
		validRuns: 0,
		estimates: [],
		publishedValue: legacyValue === null
			? null
			: round(Math.max(0, Math.min(110, legacyValue)), 1),
		// Version 1 counted charging phases and tiny power fluctuations as rejected
		// measurements. Version 2 already reset the affected diagnostic counter.
		rejectedRuns: progress.schemaVersion === 2 ? progress.rejectedRuns : 0,
	};
}

function round(value: number, digits = 3): number {
	const factor = 10 ** digits;
	return Math.round((value + Number.EPSILON) * factor) / factor;
}

function median(values: readonly number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function healthValue(progress: BatteryHealthProgress): number | null {
	return progress.publishedValue === null
		? null
		: round(Math.max(0, Math.min(110, progress.publishedValue)), 1);
}

function result(progress: BatteryHealthProgress): BatteryHealthResult {
	const value = healthValue(progress);
	return {
		progress,
		status: value !== null
			? "available"
			: progress.validRuns > 0 || progress.rejectedRuns > 0
				? "insufficientData"
				: "collectingData",
		value,
	};
}

function finishRun(progress: BatteryHealthProgress, usableCapacityKwh: number, timestamp: string): void {
	const run = progress.activeRun;
	if (!run) return;
	const socSpan = run.startSoc - run.currentSoc;
	const valid = run.direction === "discharging" && !run.invalid && socSpan >= MIN_HEALTH_SOC_SPAN && run.energyKwh > 0;
	if (valid && usableCapacityKwh > 0) {
		const expectedEnergy = usableCapacityKwh * socSpan / 100;
		const estimate = run.energyKwh / expectedEnergy * 100;
		if (Number.isFinite(estimate) && estimate >= 50 && estimate <= 120) {
			progress.estimates.push(round(estimate, 2));
			progress.validRuns = progress.estimates.length;
			if (progress.estimates.length >= progress.requiredRuns) {
				const completedBatch = progress.estimates.slice(0, progress.requiredRuns);
				progress.publishedValue = round(
					completedBatch.reduce((sum, value) => sum + value, 0) / completedBatch.length,
					1,
				);
				progress.estimates = progress.estimates.slice(progress.requiredRuns);
				progress.validRuns = progress.estimates.length;
			}
		} else {
			progress.rejectedRuns += 1;
		}
	} else if (run.direction === "discharging" && socSpan >= MIN_REJECTED_RUN_SOC_SPAN) {
		// Only count meaningful discharge attempts. Charging phases and tiny
		// fluctuations are not battery-health measurements and must not inflate
		// the rejected-run diagnostic counter.
		progress.rejectedRuns += 1;
	}
	progress.lastEvaluation = timestamp;
	progress.activeRun = null;
}

export function observeBatteryHealth(
	previous: BatteryHealthProgress | null,
	sample: BatteryHealthSample,
	usableCapacityKwh: number,
): BatteryHealthResult {
	const progress = previous ?? createBatteryHealthProgress(sample.timestamp);
	const time = Date.parse(sample.timestamp);
	const usableSample = Number.isFinite(time) && sample.soc !== null && sample.soc >= 0 && sample.soc <= 100 && sample.batteryPower !== null;
	const direction = sample.direction === "charging" || sample.direction === "discharging" ? sample.direction : null;

	if (!usableSample || !direction || Math.abs(sample.batteryPower ?? 0) < MIN_POWER_W) {
		if (progress.activeRun) {
			if (sample.soc !== null && sample.soc >= 0 && sample.soc <= 100) {
				progress.activeRun.currentSoc = sample.soc;
			}
			finishRun(progress, usableCapacityKwh, sample.timestamp);
		}
		return result(progress);
	}

	if (!progress.activeRun || progress.activeRun.direction !== direction) {
		if (progress.activeRun) finishRun(progress, usableCapacityKwh, sample.timestamp);
		progress.activeRun = {
			direction,
			startedAt: sample.timestamp,
			lastTimestamp: sample.timestamp,
			startSoc: sample.soc as number,
			currentSoc: sample.soc as number,
			energyKwh: 0,
			invalid: false,
		};
		return result(progress);
	}

	const run = progress.activeRun;
	const elapsedMs = time - Date.parse(run.lastTimestamp);
	if (elapsedMs <= 0 || elapsedMs > MAX_GAP_MS) {
		run.invalid = true;
	} else {
		run.energyKwh += Math.abs(sample.batteryPower as number) * elapsedMs / 3_600_000_000;
	}
	if ((direction === "discharging" && (sample.soc as number) > run.currentSoc + 2) ||
		(direction === "charging" && (sample.soc as number) < run.currentSoc - 2)) {
		run.invalid = true;
	}
	run.currentSoc = sample.soc as number;
	run.lastTimestamp = sample.timestamp;
	return result(progress);
}
