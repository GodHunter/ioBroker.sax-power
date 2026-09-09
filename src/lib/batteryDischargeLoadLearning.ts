import type { BatteryDirection } from "./saxPowerDevice";

export const BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION = 1;
const MIN_DISCHARGE_POWER_W = 100;
const HIGH_LOAD_POWER_FACTOR = 0.5;
const MAX_SAMPLE_GAP_MS = 5 * 60 * 1000;
const SUSTAINED_HIGH_LOAD_REFERENCE_MINUTES = 30;

export interface BatteryDischargeLoadSample {
	readonly timestamp: string;
	readonly batteryPower: number | null;
	readonly direction: BatteryDirection;
}

export interface BatteryDischargeLoadProgress {
	readonly schemaVersion: number;
	readonly dataCollectionStartedAt: string;
	readonly lastUpdate: string;
	readonly lastTimestamp: string;
	readonly lastDischargePowerW: number;
	readonly day: string;
	readonly dischargedEnergyTodayKwh: number;
	readonly highLoadDurationTodayMs: number;
	readonly consecutiveHighLoadMs: number;
	readonly peakDischargePowerTodayW: number;
}

export interface BatteryDischargeLoadResult {
	readonly progress: BatteryDischargeLoadProgress;
	readonly actualDischargePowerW: number;
	readonly maximumDischargePowerW: number;
	readonly utilizationPercent: number;
	readonly highLoadThresholdW: number;
	readonly highLoadActive: boolean;
	readonly consecutiveHighLoadMinutes: number;
	readonly highLoadMinutesToday: number;
	readonly peakDischargePowerTodayW: number;
	readonly dischargedEnergyTodayKwh: number;
	readonly equivalentDischargeCyclesToday: number | null;
	readonly loadIndex: number;
	readonly loadStatus: "idle" | "normal" | "elevated" | "high";
}

function round(value: number, digits = 3): number {
	const factor = 10 ** digits;
	return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function loadStatus(actualDischargePowerW: number, index: number): BatteryDischargeLoadResult["loadStatus"] {
	if (actualDischargePowerW < MIN_DISCHARGE_POWER_W) return "idle";
	if (index >= 70) return "high";
	if (index >= 40) return "elevated";
	return "normal";
}

export function createBatteryDischargeLoadProgress(timestamp: string): BatteryDischargeLoadProgress {
	return {
		schemaVersion: BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION,
		dataCollectionStartedAt: timestamp,
		lastUpdate: timestamp,
		lastTimestamp: timestamp,
		lastDischargePowerW: 0,
		day: timestamp.slice(0, 10),
		dischargedEnergyTodayKwh: 0,
		highLoadDurationTodayMs: 0,
		consecutiveHighLoadMs: 0,
		peakDischargePowerTodayW: 0,
	};
}

export function normalizeBatteryDischargeLoadProgress(
	progress: BatteryDischargeLoadProgress,
	timestamp: string,
): BatteryDischargeLoadProgress {
	if (progress.schemaVersion !== BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION) {
		return createBatteryDischargeLoadProgress(timestamp);
	}
	return {
		...progress,
		lastDischargePowerW: Number.isFinite(progress.lastDischargePowerW) ? Math.max(0, progress.lastDischargePowerW) : 0,
		dischargedEnergyTodayKwh: Number.isFinite(progress.dischargedEnergyTodayKwh) ? Math.max(0, progress.dischargedEnergyTodayKwh) : 0,
		highLoadDurationTodayMs: Number.isFinite(progress.highLoadDurationTodayMs) ? Math.max(0, progress.highLoadDurationTodayMs) : 0,
		consecutiveHighLoadMs: Number.isFinite(progress.consecutiveHighLoadMs) ? Math.max(0, progress.consecutiveHighLoadMs) : 0,
		peakDischargePowerTodayW: Number.isFinite(progress.peakDischargePowerTodayW) ? Math.max(0, progress.peakDischargePowerTodayW) : 0,
	};
}

export function observeBatteryDischargeLoad(
	previous: BatteryDischargeLoadProgress | null,
	sample: BatteryDischargeLoadSample,
	usableCapacityKwh: number,
	maximumDischargePowerW: number,
): BatteryDischargeLoadResult {
	const initial = previous ?? createBatteryDischargeLoadProgress(sample.timestamp);
	let progress = normalizeBatteryDischargeLoadProgress(initial, sample.timestamp);
	const currentDay = sample.timestamp.slice(0, 10);
	const sameDay = currentDay === progress.day;
	let dischargedEnergyTodayKwh = sameDay ? progress.dischargedEnergyTodayKwh : 0;
	let highLoadDurationTodayMs = sameDay ? progress.highLoadDurationTodayMs : 0;
	let consecutiveHighLoadMs = sameDay ? progress.consecutiveHighLoadMs : 0;
	let peakDischargePowerTodayW = sameDay ? progress.peakDischargePowerTodayW : 0;

	const actualDischargePowerW = sample.direction === "discharging" && sample.batteryPower !== null
		? Math.max(0, sample.batteryPower)
		: 0;
	const safeMaximumDischargePowerW = Number.isFinite(maximumDischargePowerW) && maximumDischargePowerW > 0
		? maximumDischargePowerW
		: 0;
	const highLoadThresholdW = safeMaximumDischargePowerW * HIGH_LOAD_POWER_FACTOR;
	const highLoadActive = safeMaximumDischargePowerW > 0 && actualDischargePowerW >= highLoadThresholdW;
	const time = Date.parse(sample.timestamp);
	const previousTime = Date.parse(progress.lastTimestamp);

	// Daily counters must never attribute an interval from the previous UTC day to the
	// new day. We intentionally start the new-day integration with the first sample and
	// integrate only from the next same-day observation onward. This avoids assigning a
	// complete cross-midnight interval to either day when the exact split is unknown.
	if (sameDay && Number.isFinite(time) && Number.isFinite(previousTime)) {
		const elapsedMs = time - previousTime;
		if (elapsedMs > 0 && elapsedMs <= MAX_SAMPLE_GAP_MS) {
			const averageDischargePowerW = (progress.lastDischargePowerW + actualDischargePowerW) / 2;
			dischargedEnergyTodayKwh += averageDischargePowerW * elapsedMs / 3_600_000_000;
			if (highLoadActive) {
				highLoadDurationTodayMs += elapsedMs;
				consecutiveHighLoadMs += elapsedMs;
			} else {
				consecutiveHighLoadMs = 0;
			}
		}
	}

	peakDischargePowerTodayW = Math.max(peakDischargePowerTodayW, actualDischargePowerW);
	progress = {
		...progress,
		lastUpdate: sample.timestamp,
		lastTimestamp: sample.timestamp,
		lastDischargePowerW: actualDischargePowerW,
		day: currentDay,
		dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
		highLoadDurationTodayMs,
		consecutiveHighLoadMs,
		peakDischargePowerTodayW: round(peakDischargePowerTodayW, 0),
	};

	const utilization = safeMaximumDischargePowerW > 0 ? clamp01(actualDischargePowerW / safeMaximumDischargePowerW) : 0;
	const sustainedFactor = clamp01(consecutiveHighLoadMs / (SUSTAINED_HIGH_LOAD_REFERENCE_MINUTES * 60_000));
	const dischargeCycleFactor = usableCapacityKwh > 0 ? clamp01(dischargedEnergyTodayKwh / usableCapacityKwh) : 0;
	// This is an inferred operating-load index, not SAX telemetry. Power is intentionally
	// squared so brief low/medium discharge remains light while operation close to the
	// technical power limit becomes dominant. Sustained high load and daily discharged
	// energy add context without pretending that household demand proves battery limiting.
	const index = actualDischargePowerW >= MIN_DISCHARGE_POWER_W
		? round(70 * utilization * utilization + 20 * sustainedFactor + 10 * dischargeCycleFactor, 1)
		: 0;

	return {
		progress,
		actualDischargePowerW: round(actualDischargePowerW, 0),
		maximumDischargePowerW: round(safeMaximumDischargePowerW, 0),
		utilizationPercent: round(utilization * 100, 1),
		highLoadThresholdW: round(highLoadThresholdW, 0),
		highLoadActive,
		consecutiveHighLoadMinutes: round(consecutiveHighLoadMs / 60_000, 1),
		highLoadMinutesToday: round(highLoadDurationTodayMs / 60_000, 1),
		peakDischargePowerTodayW: round(peakDischargePowerTodayW, 0),
		dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
		equivalentDischargeCyclesToday: usableCapacityKwh > 0 ? round(dischargedEnergyTodayKwh / usableCapacityKwh, 3) : null,
		loadIndex: index,
		loadStatus: loadStatus(actualDischargePowerW, index),
	};
}