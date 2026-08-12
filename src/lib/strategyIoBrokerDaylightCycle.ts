import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyDaylightWindowCycleExecution } from "./strategyDaylightWindowCycleExecution";
import {
	executeStrategyIoBrokerDayDischargeCycle,
} from "./strategyIoBrokerCycleExecution";
import {
	createStrategyIoBrokerDaylightWindowProvider,
	type StrategyIoBrokerAstroAdapter,
} from "./strategyIoBrokerDaylightWindow";
import type { StrategyIoBrokerRuntimeAdapter } from "./strategyIoBrokerRuntime";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";

export interface StrategyIoBrokerDaylightCycleAdapter
	extends StrategyIoBrokerRuntimeAdapter, StrategyIoBrokerAstroAdapter {}

export async function executeStrategyIoBrokerDaylightCycle(
	adapter: StrategyIoBrokerDaylightCycleAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
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
	);
}
