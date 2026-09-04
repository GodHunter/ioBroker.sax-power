import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	executeStrategyDayDischargeCycleWithDaylightWindow,
	type StrategyDaylightWindowCycleExecution,
} from "./strategyDaylightWindowCycleExecution";
import type { StrategyDayDischargeChargingContext } from "./strategyDayDischargeAvailabilityStates";
import type { StrategyDaylightWindowProvider } from "./strategyDaylightWindowCyclePreparation";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	createStrategyIoBrokerRuntime,
	type StrategyIoBrokerRuntimeAdapter,
} from "./strategyIoBrokerRuntime";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";
import type { StrategyDayDischargeAvailabilityAdapter } from "./strategyDayDischargeAvailabilityStates";

export interface StrategyIoBrokerDayDischargeCycleAdapter
	extends StrategyIoBrokerRuntimeAdapter,
		StrategyDayDischargeAvailabilityAdapter {}

export async function executeStrategyIoBrokerDayDischargeCycle(
	adapter: StrategyIoBrokerDayDischargeCycleAdapter,
	daylightWindowProvider: StrategyDaylightWindowProvider,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
	chargingContext: StrategyDayDischargeChargingContext | null = null,
): Promise<StrategyDaylightWindowCycleExecution | null> {
	const runtime = createStrategyIoBrokerRuntime(adapter);

	return executeStrategyDayDischargeCycleWithDaylightWindow(
		runtime.reader,
		daylightWindowProvider,
		adapter,
		configuration,
		maximumForecastAgeMs,
		requestedDischargePowerW,
		contract,
		resolverOptions,
		chargingContext,
	);
}
