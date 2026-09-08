import type { BatteryDirection } from "./saxPowerDevice";

export const BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION = 1;
export const BATTERY_POWER_ACCEPTANCE_MIN_SAMPLES = 5;
const MIN_CHARGE_POWER_W = 100;
const MIN_REQUEST_POWER_W = 500;
const MIN_EXPORT_EVIDENCE_W = 150;
const MIN_ACCEPTANCE_HEADROOM_W = 40;
const MAX_SAMPLE_GAP_MS = 5 * 60 * 1000;
const MAX_SAMPLES_PER_BIN = 60;

export const BATTERY_POWER_ACCEPTANCE_SOC_BINS = Object.freeze([
	{ id: "30-80", min: 30, max: 80 },
	{ id: "80-85", min: 80, max: 85 },
	{ id: "85-90", min: 85, max: 90 },
	{ id: "90-92", min: 90, max: 92 },
	{ id: "92-94", min: 92, max: 94 },
	{ id: "94-96", min: 94, max: 96 },
	{ id: "96-98", min: 96, max: 98 },
	{ id: "98-99", min: 98, max: 99 },
	{ id: "99-100", min: 99, max: 100.0001 },
] as const);

export interface BatteryPowerAcceptanceSample {
	readonly timestamp: string;
	readonly soc: number | null;
	readonly batteryPower: number | null;
	readonly direction: BatteryDirection;
	readonly requestedChargePowerW: number | null;
	readonly gridExportPowerW: number | null;
}

export interface BatteryPowerAcceptanceBinProgress {
	readonly samples: number[];
	readonly observedSamples: number;
	readonly maxObservedChargePowerW: number;
}

export interface BatteryPowerAcceptanceProgress {
	readonly schemaVersion: number;
	readonly dataCollectionStartedAt: string;
	readonly lastUpdate: string;
	readonly lastTimestamp: string;
	readonly lastBatteryPowerW: number | null;
	readonly day: string;
	readonly chargedEnergyTodayKwh: number;
	readonly dischargedEnergyTodayKwh: number;
	readonly bins: Record<string, BatteryPowerAcceptanceBinProgress>;
}

export interface BatteryPowerAcceptanceResult {
	readonly progress: BatteryPowerAcceptanceProgress;
	readonly socBin: string | null;
	readonly requestedChargePowerW: number | null;
	readonly actualChargePowerW: number;
	readonly acceptanceRatioPercent: number | null;
	readonly expectedAcceptancePowerW: number | null;
	readonly acceptanceDeviationW: number | null;
	readonly acceptanceDeviationPercent: number | null;
	readonly qualifiedSamples: number;
	readonly confidence: "none" | "learning" | "established";
	readonly stressIndex: number | null;
	readonly stressStatus: "notAvailable" | "learning" | "normal" | "elevated" | "high";
	readonly chargedEnergyTodayKwh: number;
	readonly dischargedEnergyTodayKwh: number;
	readonly throughputTodayKwh: number;
	readonly equivalentFullCyclesToday: number | null;
	readonly exportEvidence: boolean;
}

function round(value: number, digits = 3): number {
	const factor = 10 ** digits;
	return Math.round((value + Number.EPSILON) * factor) / factor;
}

function createBins(): Record<string, BatteryPowerAcceptanceBinProgress> {
	return Object.fromEntries(BATTERY_POWER_ACCEPTANCE_SOC_BINS.map((bin) => [bin.id, {
		samples: [],
		observedSamples: 0,
		maxObservedChargePowerW: 0,
	}])) as Record<string, BatteryPowerAcceptanceBinProgress>;
}

export function createBatteryPowerAcceptanceProgress(timestamp: string): BatteryPowerAcceptanceProgress {
	return {
		schemaVersion: BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION,
		dataCollectionStartedAt: timestamp,
		lastUpdate: timestamp,
		lastTimestamp: timestamp,
		lastBatteryPowerW: null,
		day: timestamp.slice(0, 10),
		chargedEnergyTodayKwh: 0,
		dischargedEnergyTodayKwh: 0,
		bins: createBins(),
	};
}

export function normalizeBatteryPowerAcceptanceProgress(
	progress: BatteryPowerAcceptanceProgress,
	timestamp: string,
): BatteryPowerAcceptanceProgress {
	if (progress.schemaVersion !== BATTERY_POWER_ACCEPTANCE_SCHEMA_VERSION) {
		return createBatteryPowerAcceptanceProgress(timestamp);
	}
	const bins = createBins();
	for (const bin of BATTERY_POWER_ACCEPTANCE_SOC_BINS) {
		const previous = progress.bins?.[bin.id];
		if (!previous) continue;
		bins[bin.id] = {
			samples: Array.isArray(previous.samples)
				? previous.samples.filter(Number.isFinite).slice(-MAX_SAMPLES_PER_BIN)
				: [],
			observedSamples: Number.isFinite(previous.observedSamples) ? Math.max(0, previous.observedSamples) : 0,
			maxObservedChargePowerW: Number.isFinite(previous.maxObservedChargePowerW)
				? Math.max(0, previous.maxObservedChargePowerW)
				: 0,
		};
	}
	return { ...progress, bins };
}

function socBin(soc: number | null): string | null {
	if (soc === null || !Number.isFinite(soc)) return null;
	return BATTERY_POWER_ACCEPTANCE_SOC_BINS.find((bin) => soc >= bin.min && soc < bin.max)?.id ?? null;
}

function percentile(values: readonly number[], fraction: number): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
	return sorted[index];
}

function confidence(samples: number): BatteryPowerAcceptanceResult["confidence"] {
	if (samples >= BATTERY_POWER_ACCEPTANCE_MIN_SAMPLES) return "established";
	if (samples > 0) return "learning";
	return "none";
}

function stressStatus(index: number | null, sampleConfidence: BatteryPowerAcceptanceResult["confidence"]): BatteryPowerAcceptanceResult["stressStatus"] {
	if (index === null) return sampleConfidence === "none" ? "notAvailable" : "learning";
	if (index >= 60) return "high";
	if (index >= 30) return "elevated";
	return "normal";
}

export function observeBatteryPowerAcceptance(
	previous: BatteryPowerAcceptanceProgress | null,
	sample: BatteryPowerAcceptanceSample,
	usableCapacityKwh: number,
): BatteryPowerAcceptanceResult {
	const initial = previous ?? createBatteryPowerAcceptanceProgress(sample.timestamp);
	let progress = normalizeBatteryPowerAcceptanceProgress(initial, sample.timestamp);
	const time = Date.parse(sample.timestamp);
	const previousTime = Date.parse(progress.lastTimestamp);
	const currentDay = sample.timestamp.slice(0, 10);
	let chargedEnergyTodayKwh = currentDay === progress.day ? progress.chargedEnergyTodayKwh : 0;
	let dischargedEnergyTodayKwh = currentDay === progress.day ? progress.dischargedEnergyTodayKwh : 0;

	if (Number.isFinite(time) && Number.isFinite(previousTime)) {
		const elapsedMs = time - previousTime;
		if (elapsedMs > 0 && elapsedMs <= MAX_SAMPLE_GAP_MS && progress.lastBatteryPowerW !== null && sample.batteryPower !== null) {
			const averagePowerW = (progress.lastBatteryPowerW + sample.batteryPower) / 2;
			const energyKwh = Math.abs(averagePowerW) * elapsedMs / 3_600_000_000;
			if (averagePowerW < 0) chargedEnergyTodayKwh += energyKwh;
			if (averagePowerW > 0) dischargedEnergyTodayKwh += energyKwh;
		}
	}

	const binId = socBin(sample.soc);
	const actualChargePowerW = sample.direction === "charging" && sample.batteryPower !== null
		? Math.max(0, -sample.batteryPower)
		: 0;
	const requested = sample.requestedChargePowerW !== null && Number.isFinite(sample.requestedChargePowerW)
		? Math.max(0, sample.requestedChargePowerW)
		: null;
	const exportEvidence = sample.gridExportPowerW !== null && sample.gridExportPowerW >= MIN_EXPORT_EVIDENCE_W;
	const batteryLimitedEvidence = requested !== null
		&& requested >= MIN_REQUEST_POWER_W
		&& actualChargePowerW >= MIN_CHARGE_POWER_W
		&& requested - actualChargePowerW >= MIN_ACCEPTANCE_HEADROOM_W;
	const qualifiedAcceptanceSample = exportEvidence && batteryLimitedEvidence;

	if (binId && actualChargePowerW >= MIN_CHARGE_POWER_W) {
		const bin = progress.bins[binId];
		const updated: BatteryPowerAcceptanceBinProgress = {
			samples: [...bin.samples],
			observedSamples: bin.observedSamples + 1,
			maxObservedChargePowerW: Math.max(bin.maxObservedChargePowerW, actualChargePowerW),
		};
		// Grid export proves surplus, while additional request headroom proves that R44 is
		// not the active limiter. Only then may the sample teach the battery's SOC-specific
		// acceptance curve. Controller-limited charging remains an observed lower bound.
		if (qualifiedAcceptanceSample) {
			updated.samples.push(round(actualChargePowerW, 0));
			if (updated.samples.length > MAX_SAMPLES_PER_BIN) updated.samples.splice(0, updated.samples.length - MAX_SAMPLES_PER_BIN);
		}
		progress.bins[binId] = updated;
	}

	progress = {
		...progress,
		lastUpdate: sample.timestamp,
		lastTimestamp: sample.timestamp,
		lastBatteryPowerW: sample.batteryPower,
		day: currentDay,
		chargedEnergyTodayKwh: round(chargedEnergyTodayKwh),
		dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
	};

	const bin = binId ? progress.bins[binId] : null;
	const expected = bin ? percentile(bin.samples, 0.75) : null;
	const sampleConfidence = confidence(bin?.samples.length ?? 0);
	const ratio = requested !== null && requested > 0 && actualChargePowerW > 0
		? round(actualChargePowerW / requested * 100, 1)
		: null;
	const deviationW = expected !== null && actualChargePowerW > 0 ? round(actualChargePowerW - expected, 0) : null;
	const deviationPercent = expected !== null && expected > 0 && deviationW !== null
		? round(deviationW / expected * 100, 1)
		: null;
	// Stress is deliberately an inferred deviation from the learned SOC-specific acceptance
	// curve, never a SAX-reported value. It is only published when the current observation
	// itself proves battery limitation, so a low R44 target cannot masquerade as stress.
	const stressIndex = sampleConfidence === "established" && qualifiedAcceptanceSample && deviationPercent !== null
		? round(Math.max(0, Math.min(100, -deviationPercent)), 1)
		: null;
	const throughputTodayKwh = chargedEnergyTodayKwh + dischargedEnergyTodayKwh;

	return {
		progress,
		socBin: binId,
		requestedChargePowerW: requested,
		actualChargePowerW: round(actualChargePowerW, 0),
		acceptanceRatioPercent: ratio,
		expectedAcceptancePowerW: expected === null ? null : round(expected, 0),
		acceptanceDeviationW: deviationW,
		acceptanceDeviationPercent: deviationPercent,
		qualifiedSamples: bin?.samples.length ?? 0,
		confidence: sampleConfidence,
		stressIndex,
		stressStatus: stressStatus(stressIndex, sampleConfidence),
		chargedEnergyTodayKwh: round(chargedEnergyTodayKwh),
		dischargedEnergyTodayKwh: round(dischargedEnergyTodayKwh),
		throughputTodayKwh: round(throughputTodayKwh),
		equivalentFullCyclesToday: usableCapacityKwh > 0 ? round(throughputTodayKwh / (2 * usableCapacityKwh), 3) : null,
		exportEvidence,
	};
}
