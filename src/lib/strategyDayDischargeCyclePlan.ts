import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyDayDischargeCommandPlan,
	type StrategyDayDischargeCommandPlan,
} from "./strategyDayDischargeCommandPlan";
import {
	createStrategyDayDischargeEvaluation,
	type StrategyDayDischargeEvaluation,
} from "./strategyDayDischargeEvaluation";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyStateContract,
} from "./strategyIntegrationContract";

export interface StrategyDayDischargeCyclePlan {
	readonly createdAt: number;
	readonly evaluation: StrategyDayDischargeEvaluation;
	readonly commandPlan: StrategyDayDischargeCommandPlan;
}

export function createStrategyDayDischargeCyclePlan(
	snapshot: StrategyInputSnapshot,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	daylightWindowStartsAt: number,
	daylightWindowEndsAt: number,
	commandContract: StrategyStateContract =
	STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand,
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

	const commandPlan = createStrategyDayDischargeCommandPlan(
		evaluation,
		commandContract,
	);
	if (commandPlan === null || commandPlan.evaluation !== evaluation) {
		return null;
	}

	return Object.freeze({
		createdAt: evaluation.createdAt,
		evaluation,
		commandPlan,
	});
}
