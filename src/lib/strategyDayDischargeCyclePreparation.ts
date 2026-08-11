import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyDayDischargeCyclePlan,
	type StrategyDayDischargeCyclePlan,
} from "./strategyDayDischargeCyclePlan";
import {
	createStrategyInputSnapshot,
	type StrategyInputSnapshot,
} from "./strategyInputSnapshot";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	resolveStrategyStates,
	type StrategyStateReader,
	type StrategyStateResolution,
	type StrategyStateResolverOptions,
} from "./strategyStateResolver";

export interface StrategyDayDischargeCyclePreparation {
	readonly createdAt: number;
	readonly resolution: StrategyStateResolution;
	readonly snapshot: StrategyInputSnapshot;
	readonly cyclePlan: StrategyDayDischargeCyclePlan;
}

export async function prepareStrategyDayDischargeCycle(
	reader: StrategyStateReader,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	daylightWindowStartsAt: number,
	daylightWindowEndsAt: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): Promise<StrategyDayDischargeCyclePreparation | null> {
	const createdAt = resolverOptions.now ?? Date.now();

	if (!Number.isFinite(createdAt)) {
		return null;
	}

	const resolution = await resolveStrategyStates(reader, contract, {
		...resolverOptions,
		now: createdAt,
	});
	const snapshot = createStrategyInputSnapshot(resolution, createdAt);

	if (snapshot === null) {
		return null;
	}

	const cyclePlan = createStrategyDayDischargeCyclePlan(
		snapshot,
		configuration,
		maximumForecastAgeMs,
		requestedDischargePowerW,
		daylightWindowStartsAt,
		daylightWindowEndsAt,
		contract.modbus.dischargePowerCommand,
	);

	if (
		cyclePlan === null
		|| cyclePlan.createdAt !== createdAt
		|| cyclePlan.evaluation.createdAt !== snapshot.createdAt
	) {
		return null;
	}

	return Object.freeze({
		createdAt,
		resolution,
		snapshot,
		cyclePlan,
	});
}
