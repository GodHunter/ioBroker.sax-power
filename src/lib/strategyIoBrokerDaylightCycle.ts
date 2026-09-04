import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyDayDischargeChargingContext } from "./strategyDayDischargeAvailabilityStates";
import type { StrategyDaylightWindowCycleExecution } from "./strategyDaylightWindowCycleExecution";
import {
	executeStrategyIoBrokerDayDischargeCycle,
} from "./strategyIoBrokerCycleExecution";
import {
	createStrategyIoBrokerDaylightWindowProvider,
	type StrategyIoBrokerDaylightAdapter,
} from "./strategyIoBrokerDaylightWindow";
import type { StrategyIoBrokerRuntimeAdapter } from "./strategyIoBrokerRuntime";
import type { StrategyDayDischargeAvailabilityAdapter } from "./strategyDayDischargeAvailabilityStates";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";

export interface StrategyIoBrokerDaylightCycleAdapter
	extends StrategyIoBrokerRuntimeAdapter,
		StrategyIoBrokerDaylightAdapter,
		StrategyDayDischargeAvailabilityAdapter {}

export async function executeStrategyIoBrokerDaylightCycle(
	adapter: StrategyIoBrokerDaylightCycleAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
	chargingContext: StrategyDayDischargeChargingContext | null = null,
): Promise<StrategyDaylightWindowCycleExecution | null> {
	const daylightWindowProvider =
		createStrategyIoBrokerDaylightWindowProvider(adapter);

	return executeStrategyIoBrokerDayDischargeCycle(
		adapter,
		daylightWindowProvider,
		configuration,
		maximumForecastAgeMs,
		requestedDischargePowerW,
		contract,
		resolverOptions,
		chargingContext,
	);
}
