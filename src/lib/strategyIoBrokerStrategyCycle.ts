import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyDaylightWindowCycleExecution } from "./strategyDaylightWindowCycleExecution";
import {
	executeStrategyIoBrokerDaylightCycle,
	type StrategyIoBrokerDaylightCycleAdapter,
} from "./strategyIoBrokerDaylightCycle";
import {
	executeStrategyIoBrokerManualChargeCycle,
	type StrategyIoBrokerManualChargeAdapter,
} from "./strategyIoBrokerManualChargeCycle";
import type { StrategyManualChargeCycle } from "./strategyManualChargeCycle";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";

export interface StrategyIoBrokerStrategyCycleAdapter
	extends StrategyIoBrokerDaylightCycleAdapter,
	StrategyIoBrokerManualChargeAdapter {}

export interface StrategyIoBrokerStrategyCycle {
	readonly createdAt: number;
	readonly manualCharge: StrategyManualChargeCycle;
	readonly automatic: StrategyDaylightWindowCycleExecution | null;
}

export async function executeStrategyIoBrokerStrategyCycle(
	adapter: StrategyIoBrokerStrategyCycleAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): Promise<StrategyIoBrokerStrategyCycle | null> {
	const manualCharge = await executeStrategyIoBrokerManualChargeCycle(
		adapter,
		configuration,
		contract,
		resolverOptions,
	);

	if (manualCharge === null) return null;

	if (!manualCharge.control.automaticStrategyAllowed) {
		return Object.freeze({
			createdAt: manualCharge.createdAt,
			manualCharge,
			automatic: null,
		});
	}

	const automatic = await executeStrategyIoBrokerDaylightCycle(
		adapter,
		configuration,
		maximumForecastAgeMs,
		requestedDischargePowerW,
		contract,
		resolverOptions,
	);

	if (automatic === null || automatic.createdAt !== manualCharge.createdAt) {
		return null;
	}

	return Object.freeze({
		createdAt: manualCharge.createdAt,
		manualCharge,
		automatic,
	});
}
