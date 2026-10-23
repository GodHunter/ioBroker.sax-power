/** Conservative, bounded SOC lift when there is a sustained real export opportunity. */
export interface StrategyChargeOpportunityInput {
	readonly forecastMarginWh: number;
	readonly requiredEnergyWh: number;
	readonly sustainedExportPowerW: number;
	readonly householdLearningEstablished: boolean;
}
export function calculateStrategyOpportunitySocLift(input: StrategyChargeOpportunityInput): number {
	if (!Number.isFinite(input.forecastMarginWh) || !Number.isFinite(input.requiredEnergyWh) || !Number.isFinite(input.sustainedExportPowerW)) return 0;
	if (!input.householdLearningEstablished || input.requiredEnergyWh <= 0 || input.sustainedExportPowerW <= 250) return 0;
	const ratio = input.forecastMarginWh / Math.max(300, input.requiredEnergyWh);
	const pressure = Math.max(0, Math.min(1, (1.5 - ratio) / 1.5));
	const opportunity = Math.max(0, Math.min(1, (input.sustainedExportPowerW - 250) / 450));
	return Math.round(14 * pressure * opportunity * 100) / 100;
}
