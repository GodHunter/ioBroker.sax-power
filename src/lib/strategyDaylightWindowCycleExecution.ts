import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyDayDischargeAvailability,
	publishStrategyDayDischargeAvailability,
	type StrategyDayDischargeAvailability,
	type StrategyDayDischargeAvailabilityAdapter,
	type StrategyDayDischargeChargingContext,
} from "./strategyDayDischargeAvailabilityStates";
import {
	prepareStrategyDayDischargeCycleWithDaylightWindow,
	type StrategyDaylightWindowCyclePreparation,
	type StrategyDaylightWindowProvider,
} from "./strategyDaylightWindowCyclePreparation";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type {
	StrategyStateReader,
	StrategyStateResolverOptions,
} from "./strategyStateResolver";

export interface StrategyDaylightWindowCycleExecution {
	readonly createdAt: number;
	readonly preparation: StrategyDaylightWindowCyclePreparation;
	readonly availability: StrategyDayDischargeAvailability;
}

export async function executeStrategyDayDischargeCycleWithDaylightWindow(
	reader: StrategyStateReader,
	daylightWindowProvider: StrategyDaylightWindowProvider,
	statusAdapter: StrategyDayDischargeAvailabilityAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
	chargingContext: StrategyDayDischargeChargingContext | null = null,
): Promise<StrategyDaylightWindowCycleExecution | null> {
	const preparation =
		await prepareStrategyDayDischargeCycleWithDaylightWindow(
			reader,
			daylightWindowProvider,
			configuration,
			maximumForecastAgeMs,
			requestedDischargePowerW,
			contract,
			resolverOptions,
		);

	if (preparation === null) {
		return null;
	}

	const availability = createStrategyDayDischargeAvailability(
		preparation,
		chargingContext,
	);
	await publishStrategyDayDischargeAvailability(statusAdapter, availability);

	return Object.freeze({
		createdAt: preparation.createdAt,
		preparation,
		availability,
	});
}
