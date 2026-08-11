import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyDayDischargePermission,
	type StrategyDayDischargePermission,
} from "./strategyDayDischargePermission";
import {
	createStrategyDayDischargePowerTarget,
	type StrategyDayDischargePowerTarget,
} from "./strategyDayDischargePowerTarget";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import {
	createStrategyPvEnergyBudget,
	type StrategyPvEnergyBudget,
} from "./strategyPvEnergyBudget";
import {
	assessStrategyPvForecastFreshness,
	type StrategyPvForecastFreshness,
} from "./strategyPvForecastFreshness";
import {
	createStrategySafetyEnvelope,
	type StrategySafetyEnvelope,
} from "./strategySafetyEnvelope";

export interface StrategyDayDischargeDecision {
	readonly createdAt: number;
	readonly safetyEnvelope: StrategySafetyEnvelope;
	readonly pvEnergyBudget: StrategyPvEnergyBudget;
	readonly pvForecastFreshness: StrategyPvForecastFreshness;
	readonly permission: StrategyDayDischargePermission;
	readonly powerTarget: StrategyDayDischargePowerTarget;
}

export function createStrategyDayDischargeDecision(
	snapshot: StrategyInputSnapshot,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
): StrategyDayDischargeDecision | null {
	const safetyEnvelope = createStrategySafetyEnvelope(
		snapshot,
		configuration,
	);
	if (safetyEnvelope === null) {
		return null;
	}

	const pvEnergyBudget = createStrategyPvEnergyBudget(
		snapshot,
		configuration,
		safetyEnvelope,
	);
	if (pvEnergyBudget === null) {
		return null;
	}

	const pvForecastFreshness = assessStrategyPvForecastFreshness(
		snapshot,
		maximumForecastAgeMs,
	);
	if (pvForecastFreshness === null) {
		return null;
	}

	const permission = createStrategyDayDischargePermission(
		safetyEnvelope,
		pvEnergyBudget,
		pvForecastFreshness,
	);
	if (permission === null) {
		return null;
	}

	const powerTarget = createStrategyDayDischargePowerTarget(
		permission,
		requestedDischargePowerW,
	);
	if (powerTarget === null) {
		return null;
	}

	return Object.freeze({
		createdAt: snapshot.createdAt,
		safetyEnvelope,
		pvEnergyBudget,
		pvForecastFreshness,
		permission,
		powerTarget,
	});
}
