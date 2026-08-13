import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyDayDischargeEvaluation,
	type StrategyDayDischargeEvaluation,
} from "./strategyDayDischargeEvaluation";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";

export interface StrategyDayDischargeCyclePlan {
	readonly createdAt: number;
	readonly evaluation: StrategyDayDischargeEvaluation;
}

export function createStrategyDayDischargeCyclePlan(
	snapshot: StrategyInputSnapshot,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	daylightWindowStartsAt: number,
	daylightWindowEndsAt: number,
): StrategyDayDischargeCyclePlan | null {
	const evaluation = createStrategyDayDischargeEvaluation(
		snapshot,
		configuration,
		maximumForecastAgeMs,
		requestedDischargePowerW,
		daylightWindowStartsAt,
		daylightWindowEndsAt,
	);
	if (evaluation === null) {
		return null;
	}

	return Object.freeze({
		createdAt: evaluation.createdAt,
		evaluation,
	});
}
