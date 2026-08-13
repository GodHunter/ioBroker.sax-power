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
import {
	DEFAULT_STRATEGY_MODES,
	type StrategyModes,
} from "./strategyModes";

export interface StrategyIoBrokerStrategyCycleAdapter
	extends StrategyIoBrokerDaylightCycleAdapter,
	StrategyIoBrokerManualChargeAdapter {}

export interface StrategyIoBrokerStrategyCycle {
	readonly createdAt: number;
	readonly manualCharge: StrategyManualChargeCycle | null;
	readonly automatic: StrategyDaylightWindowCycleExecution | null;
}

export async function executeStrategyIoBrokerStrategyCycle(
	adapter: StrategyIoBrokerStrategyCycleAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
	modes: StrategyModes = DEFAULT_STRATEGY_MODES,
): Promise<StrategyIoBrokerStrategyCycle | null> {
	const manualCharge = modes.chargingControlEnabled
		? await executeStrategyIoBrokerManualChargeCycle(
			adapter,
			configuration,
			contract,
			resolverOptions,
		)
		: null;

	if (modes.chargingControlEnabled && manualCharge === null) return null;

	if (manualCharge !== null && !manualCharge.control.automaticStrategyAllowed) {
		return Object.freeze({
			createdAt: manualCharge.createdAt,
			manualCharge,
			automatic: null,
		});
	}

	if (!modes.dayAvailabilityEnabled) {
		return Object.freeze({
			createdAt: manualCharge?.createdAt ?? resolverOptions.now ?? Date.now(),
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

	if (
		automatic === null
		|| (manualCharge !== null && automatic.createdAt !== manualCharge.createdAt)
	) {
		return null;
	}

	return Object.freeze({
		createdAt: automatic.createdAt,
		manualCharge,
		automatic,
	});
}
