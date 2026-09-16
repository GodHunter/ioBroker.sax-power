import type { BatteryDirection } from "./saxPowerDevice";

export const BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION = 2;
export const BATTERY_DISCHARGE_CAPABILITY_MIN_SAMPLES = 5;
const MIN_DISCHARGE_POWER_W = 100;
const HIGH_LOAD_POWER_FACTOR = 0.5;
const MAX_SAMPLE_GAP_MS = 5 * 60 * 1000;
const SUSTAINED_HIGH_LOAD_REFERENCE_MINUTES = 30;
const MIN_GRID_IMPORT_EVIDENCE_W = 150;
const MIN_CAPABILITY_TEST_POWER_FACTOR = 0.5;
const MAX_CAPABILITY_SAMPLES_PER_BIN = 60;
const LIMITED_RATIO = 0.7;
const RECOVERING_RATIO = 0.9;

export const BATTERY_DISCHARGE_CAPABILITY_SOC_BINS = Object.freeze([
	{ id: "0-20", min: 0, max: 20 },
	{ id: "20-40", min: 20, max: 40 },
	{ id: "40-60", min: 40, max: 60 },
	{ id: "60-80", min: 60, max: 80 },
	{ id: "80-100", min: 80, max: 100.0001 },
] as const);

export interface BatteryDischargeLoadSample {
	readonly timestamp: string;
	readonly soc: number | null;
	readonly batteryPower: number | null;
	readonly direction: BatteryDirection;
	readonly gridImportPowerW: number | null;
}

export interface BatteryDischargeCapabilityBinProgress {
	readonly samples: number[];
	readonly observedSamples: number;
	readonly maxObservedDischargePowerW: number;
}

export interface BatteryDischargeCapabilityEpisode {
	readonly startedAt: string;
	readonly socAtStart: number | null;
	readonly minimumCapabilityPowerW: number;
	readonly minimumCapabilityRatioPercent: number;
	readonly dischargedEnergyAtStartKwh: number;
	readonly equivalentDischargeCyclesAtStart: number | null;
	readonly highLoadMinutesAtStart: number;
	readonly lastLimitedAt: string;
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
	readonly capabilityBins: Record<string, BatteryDischargeCapabilityBinProgress>;
	readonly activeCapabilityEpisode: BatteryDischargeCapabilityEpisode | null;
	readonly limitationEvents: number;
	readonly recoveryEvents: number;
	readonly lastRecoveryAt: string | null;
	readonly lastRecoveryDurationMinutes: number | null;
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
	readonly capabilitySocBin: string | null;
	readonly expectedDischargePowerW: number | null;
	readonly capabilityRatioPercent: number | null;
	readonly capabilityStatus: "notTestable" | "learning" | "normal" | "limited" | "recovering" | "recovered";
	readonly capabilityTestable: boolean;
	readonly demandEvidence: boolean;
	readonly limitationEvidence: boolean;
	readonly qualifiedCapabilitySamples: number;
	readonly capabilityConfidence: "none" | "learning" | "established";
}

function round(value: number, digits = 3): number {
	const factor = 10 ** digits;
	return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function createCapabilityBins(): Record<string, BatteryDischargeCapabilityBinProgress> {
	return Object.fromEntries(BATTERY_DISCHARGE_CAPABILITY_SOC_BINS.map((bin) => [bin.id, {
		samples: [], observedSamples: 0, maxObservedDischargePowerW: 0,
	}])) as Record<string, BatteryDischargeCapabilityBinProgress>;
}

function capabilitySocBin(soc: number | null): string | null {
	if (soc === null || !Number.isFinite(soc)) return null;
	return BATTERY_DISCHARGE_CAPABILITY_SOC_BINS.find((bin) => soc >= bin.min && soc < bin.max)?.id ?? null;
}

function percentile(values: readonly number[], fraction: number): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))];
}

function capabilityConfidence(samples: number): BatteryDischargeLoadResult["capabilityConfidence"] {
	if (samples >= BATTERY_DISCHARGE_CAPABILITY_MIN_SAMPLES) return "established";
	if (samples > 0) return "learning";
	return "none";
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
		capabilityBins: createCapabilityBins(),
		activeCapabilityEpisode: null,
		limitationEvents: 0,
		recoveryEvents: 0,
		lastRecoveryAt: null,
		lastRecoveryDurationMinutes: null,
	};
}

export function normalizeBatteryDischargeLoadProgress(progress: BatteryDischargeLoadProgress, timestamp: string): BatteryDischargeLoadProgress {
	if (progress.schemaVersion !== 1 && progress.schemaVersion !== BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION) return createBatteryDischargeLoadProgress(timestamp);
	const capabilityBins = createCapabilityBins();
	if (progress.schemaVersion === BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION) {
		for (const bin of BATTERY_DISCHARGE_CAPABILITY_SOC_BINS) {
			const previous = progress.capabilityBins?.[bin.id];
			if (!previous) continue;
			capabilityBins[bin.id] = {
				samples: Array.isArray(previous.samples) ? previous.samples.filter(Number.isFinite).slice(-MAX_CAPABILITY_SAMPLES_PER_BIN) : [],
				observedSamples: Number.isFinite(previous.observedSamples) ? Math.max(0, previous.observedSamples) : 0,
				maxObservedDischargePowerW: Number.isFinite(previous.maxObservedDischargePowerW) ? Math.max(0, previous.maxObservedDischargePowerW) : 0,
			};
		}
	}
	return {
		...progress,
		schemaVersion: BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION,
		lastDischargePowerW: Number.isFinite(progress.lastDischargePowerW) ? Math.max(0, progress.lastDischargePowerW) : 0,
		dischargedEnergyTodayKwh: Number.isFinite(progress.dischargedEnergyTodayKwh) ? Math.max(0, progress.dischargedEnergyTodayKwh) : 0,
		highLoadDurationTodayMs: Number.isFinite(progress.highLoadDurationTodayMs) ? Math.max(0, progress.highLoadDurationTodayMs) : 0,
		consecutiveHighLoadMs: Number.isFinite(progress.consecutiveHighLoadMs) ? Math.max(0, progress.consecutiveHighLoadMs) : 0,
		peakDischargePowerTodayW: Number.isFinite(progress.peakDischargePowerTodayW) ? Math.max(0, progress.peakDischargePowerTodayW) : 0,
		capabilityBins,
		activeCapabilityEpisode: progress.schemaVersion === BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION ? progress.activeCapabilityEpisode ?? null : null,
		limitationEvents: progress.schemaVersion === BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION && Number.isFinite(progress.limitationEvents) ? progress.limitationEvents : 0,
		recoveryEvents: progress.schemaVersion === BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION && Number.isFinite(progress.recoveryEvents) ? progress.recoveryEvents : 0,
		lastRecoveryAt: progress.schemaVersion === BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION ? progress.lastRecoveryAt ?? null : null,
		lastRecoveryDurationMinutes: progress.schemaVersion === BATTERY_DISCHARGE_LOAD_SCHEMA_VERSION ? progress.lastRecoveryDurationMinutes ?? null : null,
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
	// Daily load counters reset independently from capability episodes.
	// A temporary capability limitation may span midnight and must remain active
	// until a qualified observation proves recovery.

	const actualDischargePowerW = sample.direction === "discharging" && sample.batteryPower !== null ? Math.max(0, sample.batteryPower) : 0;
	const safeMaximumDischargePowerW = Number.isFinite(maximumDischargePowerW) && maximumDischargePowerW > 0 ? maximumDischargePowerW : 0;
	const highLoadThresholdW = safeMaximumDischargePowerW * HIGH_LOAD_POWER_FACTOR;
	const highLoadActive = safeMaximumDischargePowerW > 0 && actualDischargePowerW >= highLoadThresholdW;
	const time = Date.parse(sample.timestamp);
	const previousTime = Date.parse(progress.lastTimestamp);

	if (sameDay && Number.isFinite(time) && Number.isFinite(previousTime)) {
		const elapsedMs = time - previousTime;
		if (elapsedMs > 0 && elapsedMs <= MAX_SAMPLE_GAP_MS) {
			const averageDischargePowerW = (progress.lastDischargePowerW + actualDischargePowerW) / 2;
			dischargedEnergyTodayKwh += averageDischargePowerW * elapsedMs / 3_600_000_000;
			if (highLoadActive) { highLoadDurationTodayMs += elapsedMs; consecutiveHighLoadMs += elapsedMs; }
			else consecutiveHighLoadMs = 0;
		}
	}

	peakDischargePowerTodayW = Math.max(peakDischargePowerTodayW, actualDischargePowerW);
	const equivalentDischargeCyclesToday = usableCapacityKwh > 0 ? round(dischargedEnergyTodayKwh / usableCapacityKwh, 3) : null;
	const binId = capabilitySocBin(sample.soc);
	const gridImportPowerW = sample.gridImportPowerW !== null && Number.isFinite(sample.gridImportPowerW) ? Math.max(0, sample.gridImportPowerW) : 0;
	const demandEvidence = gridImportPowerW >= MIN_GRID_IMPORT_EVIDENCE_W;
	const minimumTestPowerW = safeMaximumDischargePowerW * MIN_CAPABILITY_TEST_POWER_FACTOR;
	const capabilityTestable = Boolean(binId && demandEvidence && actualDischargePowerW >= minimumTestPowerW && safeMaximumDischargePowerW > 0);
	const currentBin = binId ? progress.capabilityBins[binId] : null;
	const expectedBeforeSample = currentBin ? percentile(currentBin.samples, 0.75) : null;
	const confidenceBeforeSample = capabilityConfidence(currentBin?.samples.length ?? 0);
	const capabilityRatioPercent = capabilityTestable && expectedBeforeSample !== null && expectedBeforeSample > 0 ? round(actualDischargePowerW / expectedBeforeSample * 100, 1) : null;
	const limitationEvidence = confidenceBeforeSample === "established" && capabilityRatioPercent !== null && capabilityRatioPercent < LIMITED_RATIO * 100;
	let capabilityStatus: BatteryDischargeLoadResult["capabilityStatus"] = capabilityTestable ? confidenceBeforeSample === "established" ? "normal" : "learning" : "notTestable";
	let activeCapabilityEpisode = progress.activeCapabilityEpisode;
	let limitationEvents = progress.limitationEvents;
	let recoveryEvents = progress.recoveryEvents;
	let lastRecoveryAt = progress.lastRecoveryAt;
	let lastRecoveryDurationMinutes = progress.lastRecoveryDurationMinutes;

	if (limitationEvidence) {
		capabilityStatus = "limited";
		if (!activeCapabilityEpisode) {
			activeCapabilityEpisode = {
				startedAt: sample.timestamp, socAtStart: sample.soc,
				minimumCapabilityPowerW: round(actualDischargePowerW, 0),
				minimumCapabilityRatioPercent: capabilityRatioPercent ?? 0,
				dischargedEnergyAtStartKwh: round(dischargedEnergyTodayKwh),
				equivalentDischargeCyclesAtStart: equivalentDischargeCyclesToday,
				highLoadMinutesAtStart: round(highLoadDurationTodayMs / 60_000, 1),
				lastLimitedAt: sample.timestamp,
			};
			limitationEvents += 1;
		} else {
			activeCapabilityEpisode = {
				...activeCapabilityEpisode,
				minimumCapabilityPowerW: Math.min(activeCapabilityEpisode.minimumCapabilityPowerW, round(actualDischargePowerW, 0)),
				minimumCapabilityRatioPercent: Math.min(activeCapabilityEpisode.minimumCapabilityRatioPercent, capabilityRatioPercent ?? activeCapabilityEpisode.minimumCapabilityRatioPercent),
				lastLimitedAt: sample.timestamp,
			};
		}
	} else if (activeCapabilityEpisode && capabilityTestable && confidenceBeforeSample === "established" && capabilityRatioPercent !== null) {
		if (capabilityRatioPercent >= RECOVERING_RATIO * 100) {
			capabilityStatus = "recovered";
			recoveryEvents += 1;
			lastRecoveryAt = sample.timestamp;
			lastRecoveryDurationMinutes = Number.isFinite(time) ? round((time - Date.parse(activeCapabilityEpisode.startedAt)) / 60_000, 1) : null;
			activeCapabilityEpisode = null;
		} else if (capabilityRatioPercent >= LIMITED_RATIO * 100) capabilityStatus = "recovering";
	}

	if (binId && actualDischargePowerW >= MIN_DISCHARGE_POWER_W) {
		const bin = progress.capabilityBins[binId];
		const updated: BatteryDischargeCapabilityBinProgress = {
			samples: [...bin.samples], observedSamples: bin.observedSamples + 1,
			maxObservedDischargePowerW: Math.max(bin.maxObservedDischargePowerW, actualDischargePowerW),
		};
		// Grid import proves unmet demand. Only demand-backed observations may teach the
		// normal SOC-specific discharge capability, and an already identified limitation
		// must never drag its own baseline down.
		// Freeze the learned normal baseline while a limitation episode is still
		// active. Limited and partially recovered observations describe the episode,
		// not normal battery capability. A sample that proves full recovery may teach
		// the baseline again because activeCapabilityEpisode has already been cleared.
		if (capabilityTestable && !limitationEvidence && activeCapabilityEpisode === null) {
			updated.samples.push(round(actualDischargePowerW, 0));
			if (updated.samples.length > MAX_CAPABILITY_SAMPLES_PER_BIN) updated.samples.splice(0, updated.samples.length - MAX_CAPABILITY_SAMPLES_PER_BIN);
		}
		progress.capabilityBins[binId] = updated;
	}

	progress = {
		...progress, lastUpdate: sample.timestamp, lastTimestamp: sample.timestamp,
		lastDischargePowerW: actualDischargePowerW, day: currentDay,
		dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh), highLoadDurationTodayMs,
		consecutiveHighLoadMs, peakDischargePowerTodayW: round(peakDischargePowerTodayW, 0),
		activeCapabilityEpisode, limitationEvents, recoveryEvents, lastRecoveryAt, lastRecoveryDurationMinutes,
	};

	const bin = binId ? progress.capabilityBins[binId] : null;
	const expected = expectedBeforeSample ?? (bin ? percentile(bin.samples, 0.75) : null);
	const sampleConfidence = capabilityConfidence(bin?.samples.length ?? 0);
	const utilization = safeMaximumDischargePowerW > 0 ? clamp01(actualDischargePowerW / safeMaximumDischargePowerW) : 0;
	const sustainedFactor = clamp01(consecutiveHighLoadMs / (SUSTAINED_HIGH_LOAD_REFERENCE_MINUTES * 60_000));
	const dischargeCycleFactor = usableCapacityKwh > 0 ? clamp01(dischargedEnergyTodayKwh / usableCapacityKwh) : 0;
	const index = actualDischargePowerW >= MIN_DISCHARGE_POWER_W ? round(70 * utilization * utilization + 20 * sustainedFactor + 10 * dischargeCycleFactor, 1) : 0;

	return {
		progress, actualDischargePowerW: round(actualDischargePowerW, 0), maximumDischargePowerW: round(safeMaximumDischargePowerW, 0),
		utilizationPercent: round(utilization * 100, 1), highLoadThresholdW: round(highLoadThresholdW, 0), highLoadActive,
		consecutiveHighLoadMinutes: round(consecutiveHighLoadMs / 60_000, 1), highLoadMinutesToday: round(highLoadDurationTodayMs / 60_000, 1),
		peakDischargePowerTodayW: round(peakDischargePowerTodayW, 0), dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
		equivalentDischargeCyclesToday, loadIndex: index, loadStatus: loadStatus(actualDischargePowerW, index),
		capabilitySocBin: binId, expectedDischargePowerW: expected === null ? null : round(expected, 0), capabilityRatioPercent,
		capabilityStatus, capabilityTestable, demandEvidence, limitationEvidence,
		qualifiedCapabilitySamples: bin?.samples.length ?? 0, capabilityConfidence: sampleConfidence,
	};
}