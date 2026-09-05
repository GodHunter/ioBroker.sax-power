export const HOUSEHOLD_LOAD_SLOT_MINUTES = 15;
export const HOUSEHOLD_LOAD_SLOTS_PER_DAY = 24 * 60 / HOUSEHOLD_LOAD_SLOT_MINUTES;
export const HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT = 28;

export type StrategyHouseholdDayClass = "weekday" | "weekend";

export interface StrategyHouseholdLoadSample {
	readonly timestampMs: number;
	readonly averagePowerW: number;
}

export interface StrategyHouseholdLoadSlot {
	readonly dayClass: StrategyHouseholdDayClass;
	readonly slotIndex: number;
	readonly samplesWh: readonly number[];
}

export interface StrategyHouseholdLoadEstimate {
	readonly available: boolean;
	readonly samples: number;
	readonly meanWh: number;
	readonly medianWh: number;
	readonly p75Wh: number;
	readonly expectedWh: number;
}

function roundEnergy(value: number): number {
	return Math.max(0, Math.round(value * 10) / 10);
}

function percentile(sorted: readonly number[], fraction: number): number {
	if (sorted.length === 0) return 0;
	const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
	return sorted[index] ?? 0;
}

function conservativeFallbackWh(slots: readonly StrategyHouseholdLoadSlot[], dayClass: StrategyHouseholdDayClass): number {
	const learned = slots
		.filter(slot => slot.dayClass === dayClass && slot.samplesWh.length > 0)
		.map(slot => estimateStrategyHouseholdLoad(slot).expectedWh)
		.filter(value => Number.isFinite(value) && value >= 0)
		.sort((a, b) => a - b);
	return roundEnergy(percentile(learned, 0.75));
}

export function resolveStrategyHouseholdDayClass(date: Date): StrategyHouseholdDayClass {
	const day = date.getDay();
	return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function resolveStrategyHouseholdLoadSlotIndex(date: Date): number {
	return Math.floor((date.getHours() * 60 + date.getMinutes()) / HOUSEHOLD_LOAD_SLOT_MINUTES);
}

export function createEmptyStrategyHouseholdLoadSlot(dayClass: StrategyHouseholdDayClass, slotIndex: number): StrategyHouseholdLoadSlot {
	if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= HOUSEHOLD_LOAD_SLOTS_PER_DAY) {
		throw new RangeError("invalid household load slot index");
	}
	return Object.freeze({ dayClass, slotIndex, samplesWh: Object.freeze([]) });
}

export function addStrategyHouseholdLoadSample(slot: StrategyHouseholdLoadSlot, sample: StrategyHouseholdLoadSample): StrategyHouseholdLoadSlot {
	if (!Number.isFinite(sample.timestampMs) || !Number.isFinite(sample.averagePowerW) || sample.averagePowerW < 0) return slot;
	const date = new Date(sample.timestampMs);
	if (resolveStrategyHouseholdDayClass(date) !== slot.dayClass || resolveStrategyHouseholdLoadSlotIndex(date) !== slot.slotIndex) return slot;
	const energyWh = sample.averagePowerW * HOUSEHOLD_LOAD_SLOT_MINUTES / 60;
	const samplesWh = [...slot.samplesWh, roundEnergy(energyWh)].slice(-HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT);
	return Object.freeze({ dayClass: slot.dayClass, slotIndex: slot.slotIndex, samplesWh: Object.freeze(samplesWh) });
}

export function estimateStrategyHouseholdLoad(slot: StrategyHouseholdLoadSlot): StrategyHouseholdLoadEstimate {
	const samples = slot.samplesWh.length;
	if (samples === 0) {
		return Object.freeze({ available: false, samples: 0, meanWh: 0, medianWh: 0, p75Wh: 0, expectedWh: 0 });
	}
	const sorted = [...slot.samplesWh].sort((a, b) => a - b);
	const meanWh = sorted.reduce((sum, value) => sum + value, 0) / samples;
	const medianWh = samples % 2 === 0
		? ((sorted[samples / 2 - 1] ?? 0) + (sorted[samples / 2] ?? 0)) / 2
		: (sorted[Math.floor(samples / 2)] ?? 0);
	const p75Wh = percentile(sorted, 0.75);
	const expectedWh = samples >= 4 ? p75Wh : meanWh;
	return Object.freeze({ available: true, samples, meanWh: roundEnergy(meanWh), medianWh: roundEnergy(medianWh), p75Wh: roundEnergy(p75Wh), expectedWh: roundEnergy(expectedWh) });
}

export function estimateRemainingStrategyHouseholdEnergyWh(slots: readonly StrategyHouseholdLoadSlot[], from: Date, until: Date): number {
	if (until.getTime() <= from.getTime()) return 0;
	const dayClass = resolveStrategyHouseholdDayClass(from);
	const firstSlot = resolveStrategyHouseholdLoadSlotIndex(from);
	const lastSlot = resolveStrategyHouseholdLoadSlotIndex(until);
	const fallbackWh = conservativeFallbackWh(slots, dayClass);
	let totalWh = 0;
	for (const slot of slots) {
		if (slot.dayClass !== dayClass || slot.slotIndex < firstSlot || slot.slotIndex > lastSlot) continue;
		const estimate = estimateStrategyHouseholdLoad(slot);
		totalWh += estimate.available ? estimate.expectedWh : fallbackWh;
	}
	return roundEnergy(totalWh);
}
