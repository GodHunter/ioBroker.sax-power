import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	prepareStrategyDayDischargeCycle,
	type StrategyDayDischargeCyclePreparation,
} from "./strategyDayDischargeCyclePreparation";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type {
	StrategyStateReader,
	StrategyStateResolverOptions,
} from "./strategyStateResolver";

export interface StrategyDaylightWindowBoundaries {
	readonly startsAt: number;
	readonly endsAt: number;
}

export interface StrategyDaylightWindowProvider {
	getDaylightWindow(
		cycleTimestamp: number,
	): Promise<StrategyDaylightWindowBoundaries | null | undefined>;
}

export interface StrategyDaylightWindowCyclePreparation {
	readonly createdAt: number;
	readonly daylightWindow: StrategyDaylightWindowBoundaries;
	readonly cyclePreparation: StrategyDayDischargeCyclePreparation;
}

export async function prepareStrategyDayDischargeCycleWithDaylightWindow(
	reader: StrategyStateReader,
	daylightWindowProvider: StrategyDaylightWindowProvider,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): Promise<StrategyDaylightWindowCyclePreparation | null> {
	const createdAt = resolverOptions.now ?? Date.now();

	if (!Number.isFinite(createdAt)) {
		return null;
	}

	const providedWindow = await daylightWindowProvider.getDaylightWindow(
		createdAt,
	);

	if (
		providedWindow == null
		|| !Number.isFinite(providedWindow.startsAt)
		|| !Number.isFinite(providedWindow.endsAt)
		|| providedWindow.startsAt >= providedWindow.endsAt
	) {
		return null;
	}

	const daylightWindow = Object.freeze({
		startsAt: providedWindow.startsAt,
		endsAt: providedWindow.endsAt,
	});
	const cyclePreparation = await prepareStrategyDayDischargeCycle(
		reader,
		configuration,
		maximumForecastAgeMs,
		requestedDischargePowerW,
		daylightWindow.startsAt,
		daylightWindow.endsAt,
		contract,
		{
			...resolverOptions,
			now: createdAt,
		},
	);

	if (
		cyclePreparation === null
		|| cyclePreparation.createdAt !== createdAt
		|| cyclePreparation.cyclePlan.evaluation.daylightWindow.startsAt
			!== daylightWindow.startsAt
		|| cyclePreparation.cyclePlan.evaluation.daylightWindow.endsAt
			!== daylightWindow.endsAt
	) {
		return null;
	}

	return Object.freeze({
		createdAt,
		daylightWindow,
		cyclePreparation,
	});
}
