import {
	HOUSEHOLD_LOAD_SLOTS_PER_DAY,
	addStrategyHouseholdLoadSample,
	createEmptyStrategyHouseholdLoadSlot,
	estimateRemainingStrategyHouseholdEnergyWh,
	estimateStrategyHouseholdLoad,
	resolveStrategyHouseholdDayClass,
	resolveStrategyHouseholdLoadSlotIndex,
	type StrategyHouseholdLoadEstimate,
	type StrategyHouseholdLoadSlot,
} from "./strategyHouseholdLoadLearning";

export interface StrategyHouseholdLoadModelSnapshot {
	readonly version: 1;
	readonly slots: readonly StrategyHouseholdLoadSlot[];
}

export interface StrategyHouseholdLoadModelStatus {
	readonly current: StrategyHouseholdLoadEstimate;
	readonly expectedRemainingEnergyWh: number;
	readonly totalSamples: number;
	readonly confidence: "none" | "learning" | "established";
}

function createSlots(): StrategyHouseholdLoadSlot[] {
	const slots: StrategyHouseholdLoadSlot[] = [];
	for (const dayClass of ["weekday", "weekend"] as const) {
		for (let slotIndex = 0; slotIndex < HOUSEHOLD_LOAD_SLOTS_PER_DAY; slotIndex += 1) {
			slots.push(createEmptyStrategyHouseholdLoadSlot(dayClass, slotIndex));
		}
	}
	return slots;
}

function isValidSlot(slot: StrategyHouseholdLoadSlot): boolean {
	return (slot.dayClass === "weekday" || slot.dayClass === "weekend")
		&& Number.isInteger(slot.slotIndex)
		&& slot.slotIndex >= 0
		&& slot.slotIndex < HOUSEHOLD_LOAD_SLOTS_PER_DAY
		&& Array.isArray(slot.samplesWh)
		&& slot.samplesWh.every(value => Number.isFinite(value) && value >= 0);
}

export class StrategyHouseholdLoadModel {
	private slots: StrategyHouseholdLoadSlot[];

	public constructor(snapshot?: StrategyHouseholdLoadModelSnapshot | null) {
		this.slots = createSlots();
		if (snapshot?.version !== 1 || !Array.isArray(snapshot.slots)) return;

		for (const restored of snapshot.slots) {
			if (!isValidSlot(restored)) continue;
			const index = this.slotArrayIndex(restored.dayClass, restored.slotIndex);
			this.slots[index] = Object.freeze({
				dayClass: restored.dayClass,
				slotIndex: restored.slotIndex,
				samplesWh: Object.freeze([...restored.samplesWh]),
			});
		}
	}

	public addObservation(timestampMs: number, averagePowerW: number): void {
		if (!Number.isFinite(timestampMs)) return;
		const date = new Date(timestampMs);
		const dayClass = resolveStrategyHouseholdDayClass(date);
		const slotIndex = resolveStrategyHouseholdLoadSlotIndex(date);
		const index = this.slotArrayIndex(dayClass, slotIndex);
		this.slots[index] = addStrategyHouseholdLoadSample(this.slots[index]!, {
			timestampMs,
			averagePowerW,
		});
	}

	public status(now: Date, until: Date): StrategyHouseholdLoadModelStatus {
		const dayClass = resolveStrategyHouseholdDayClass(now);
		const slotIndex = resolveStrategyHouseholdLoadSlotIndex(now);
		const current = estimateStrategyHouseholdLoad(
			this.slots[this.slotArrayIndex(dayClass, slotIndex)]!,
		);
		const totalSamples = this.slots.reduce(
			(sum, slot) => sum + slot.samplesWh.length,
			0,
		);
		const confidence = totalSamples === 0
			? "none" as const
			: current.samples >= 4
				? "established" as const
				: "learning" as const;

		return Object.freeze({
			current,
			expectedRemainingEnergyWh: estimateRemainingStrategyHouseholdEnergyWh(
				this.slots,
				now,
				until,
			),
			totalSamples,
			confidence,
		});
	}

	public snapshot(): StrategyHouseholdLoadModelSnapshot {
		return Object.freeze({
			version: 1 as const,
			slots: Object.freeze(this.slots.map(slot => Object.freeze({
				dayClass: slot.dayClass,
				slotIndex: slot.slotIndex,
				samplesWh: Object.freeze([...slot.samplesWh]),
			}))),
		});
	}

	private slotArrayIndex(
		dayClass: "weekday" | "weekend",
		slotIndex: number,
	): number {
		return (dayClass === "weekend" ? HOUSEHOLD_LOAD_SLOTS_PER_DAY : 0) + slotIndex;
	}
}
