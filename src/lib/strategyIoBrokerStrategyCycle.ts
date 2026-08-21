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
import {
	executeStrategyIoBrokerChargingShadowCycle,
	type StrategyIoBrokerChargingShadowAdapter,
	type StrategyIoBrokerChargingShadowCycle,
} from "./strategyIoBrokerChargingShadowCycle";
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
	StrategyIoBrokerManualChargeAdapter,
	StrategyIoBrokerChargingShadowAdapter {}

export interface StrategyIoBrokerStrategyCycle {
	readonly createdAt: number;
	readonly manualCharge: StrategyManualChargeCycle | null;
	readonly chargingShadow: StrategyIoBrokerChargingShadowCycle | null;
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
			chargingShadow: null,
			automatic: null,
		});
	}

	const chargingShadow = modes.chargingControlEnabled
		? await executeStrategyIoBrokerChargingShadowCycle(
			adapter,
			configuration,
			contract,
			resolverOptions,
		)
		: null;

	if (!modes.dayAvailabilityEnabled) {
		return Object.freeze({
			createdAt: manualCharge?.createdAt ?? resolverOptions.now ?? Date.now(),
			manualCharge,
			chargingShadow,
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
		chargingShadow,
		automatic,
	});
}
