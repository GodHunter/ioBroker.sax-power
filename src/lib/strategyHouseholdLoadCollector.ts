import {
	HOUSEHOLD_LOAD_SLOT_MINUTES,
	resolveStrategyHouseholdDayClass,
	resolveStrategyHouseholdLoadSlotIndex,
	type StrategyHouseholdDayClass,
} from "./strategyHouseholdLoadLearning";

export interface StrategyHouseholdLoadCollectedSample {
	readonly timestampMs: number;
	readonly averagePowerW: number;
	readonly dayClass: StrategyHouseholdDayClass;
	readonly slotIndex: number;
	readonly observationCount: number;
}

interface ActiveBucket {
	readonly dayClass: StrategyHouseholdDayClass;
	readonly slotIndex: number;
	readonly slotStartMs: number;
	readonly powerSumW: number;
	readonly observationCount: number;
}

function resolveSlotStartMs(timestampMs: number): number {
	const date = new Date(timestampMs);
	date.setMinutes(
		Math.floor(date.getMinutes() / HOUSEHOLD_LOAD_SLOT_MINUTES) * HOUSEHOLD_LOAD_SLOT_MINUTES,
		0,
		0,
	);
	return date.getTime();
}

export class StrategyHouseholdLoadCollector {
	private active: ActiveBucket | null = null;

	public addObservation(
		timestampMs: number,
		powerW: number,
	): StrategyHouseholdLoadCollectedSample | null {
		if (
			!Number.isFinite(timestampMs)
			|| !Number.isFinite(powerW)
			|| powerW < 0
		) {
			return null;
		}

		const date = new Date(timestampMs);
		const dayClass = resolveStrategyHouseholdDayClass(date);
		const slotIndex = resolveStrategyHouseholdLoadSlotIndex(date);
		const slotStartMs = resolveSlotStartMs(timestampMs);

		if (this.active === null) {
			this.active = {
				dayClass,
				slotIndex,
				slotStartMs,
				powerSumW: powerW,
				observationCount: 1,
			};
			return null;
		}

		if (
			this.active.dayClass === dayClass
			&& this.active.slotIndex === slotIndex
			&& this.active.slotStartMs === slotStartMs
		) {
			this.active = {
				...this.active,
				powerSumW: this.active.powerSumW + powerW,
				observationCount: this.active.observationCount + 1,
			};
			return null;
		}

		const completed = Object.freeze({
			timestampMs: this.active.slotStartMs,
			averagePowerW: Math.round(
				this.active.powerSumW / this.active.observationCount,
			),
			dayClass: this.active.dayClass,
			slotIndex: this.active.slotIndex,
			observationCount: this.active.observationCount,
		});

		this.active = {
			dayClass,
			slotIndex,
			slotStartMs,
			powerSumW: powerW,
			observationCount: 1,
		};

		return completed;
	}
}
