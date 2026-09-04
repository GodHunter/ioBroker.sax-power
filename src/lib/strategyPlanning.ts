export type StrategyHouseholdLearningConfidence = "none" | "learning" | "established";

export interface StrategyPlanningInput {
	readonly forecastEnergyRemainingWh: number | null;
	readonly householdEnergyRemainingWh: number;
	readonly forecastReserveWh: number;
	readonly householdLearningConfidence: StrategyHouseholdLearningConfidence;
}

export interface StrategyPlanningDiagnostics {
	readonly forecastEnergyRemainingWh: number | null;
	readonly householdEnergyRemainingWh: number;
	readonly batteryAvailableEnergyWh: number | null;
	readonly householdLearningApplied: false;
	readonly householdLearningConfidence: StrategyHouseholdLearningConfidence;
}

function finiteNonNegative(value: number): boolean {
	return Number.isFinite(value) && value >= 0;
}

/**
 * Builds a household-aware view of the remaining PV forecast without changing
 * the charging controller yet. `batteryAvailableEnergyWh` deliberately shows
 * the net energy that would remain after learned household consumption and the
 * configured forecast reserve. `householdLearningApplied` stays false until a
 * later, explicit controller integration enables the learned value for R44.
 */
export function createStrategyPlanningDiagnostics(
	input: StrategyPlanningInput,
): StrategyPlanningDiagnostics {
	const forecastEnergyRemainingWh = input.forecastEnergyRemainingWh !== null
		&& finiteNonNegative(input.forecastEnergyRemainingWh)
		? input.forecastEnergyRemainingWh
		: null;
	const householdEnergyRemainingWh = finiteNonNegative(input.householdEnergyRemainingWh)
		? input.householdEnergyRemainingWh
		: 0;
	const forecastReserveWh = finiteNonNegative(input.forecastReserveWh)
		? input.forecastReserveWh
		: 0;

	return Object.freeze({
		forecastEnergyRemainingWh,
		householdEnergyRemainingWh,
		batteryAvailableEnergyWh: forecastEnergyRemainingWh === null
			? null
			: Math.max(
				0,
				Math.round(
					forecastEnergyRemainingWh
					- householdEnergyRemainingWh
					- forecastReserveWh,
				),
			),
		householdLearningApplied: false as const,
		householdLearningConfidence: input.householdLearningConfidence,
	});
}
