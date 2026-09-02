import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyIoBrokerStrategyCycleScheduler,
	type StrategyIoBrokerStrategyCycleScheduler,
	type StrategyIoBrokerStrategyTimerAdapter,
} from "./strategyIoBrokerStrategyCycleScheduler";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	ensureStrategyManualChargeIoBrokerStates,
} from "./strategyManualChargeStates";
import {
	ensureStrategyChargingShadowStates,
} from "./strategyChargingShadowStates";
import {
	ensureStrategyDaylightDiagnosticStates,
} from "./strategyDaylightDiagnosticStates";
import {
	ensureStrategyDayDischargeAvailabilityStates,
} from "./strategyDayDischargeAvailabilityStates";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";
import {
	DEFAULT_STRATEGY_MODES,
	type StrategyModes,
} from "./strategyModes";

export interface StrategyIoBrokerStrategyLifecycle {
	readonly start: () => Promise<void>;
	readonly stop: () => void;
}

export function createStrategyIoBrokerStrategyLifecycle(
	adapter: StrategyIoBrokerStrategyTimerAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	intervalMs: number,
	onError: (error: unknown) => void,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
	modes: StrategyModes = DEFAULT_STRATEGY_MODES,
): StrategyIoBrokerStrategyLifecycle | null {
	const scheduler: StrategyIoBrokerStrategyCycleScheduler | null =
		createStrategyIoBrokerStrategyCycleScheduler(
			adapter,
			configuration,
			maximumForecastAgeMs,
			requestedDischargePowerW,
			intervalMs,
			onError,
			contract,
			resolverOptions,
			modes,
		);

	if (scheduler === null) return null;

	let requested = false;
	let startPromise: Promise<void> | undefined;

	const start = (): Promise<void> => {
		requested = true;

		if (startPromise !== undefined) return startPromise;

		startPromise = (async () => {
			try {
				if (modes.chargingControlEnabled || modes.dayAvailabilityEnabled) {
					await ensureStrategyDaylightDiagnosticStates(adapter);
				}
				if (modes.chargingControlEnabled) {
					await ensureStrategyManualChargeIoBrokerStates(adapter);
					await ensureStrategyChargingShadowStates(adapter);
				}
				if (modes.dayAvailabilityEnabled) {
					await ensureStrategyDayDischargeAvailabilityStates(adapter);
				}
				if (requested) scheduler.start();
			} catch (error) {
				requested = false;
				throw error;
			} finally {
				startPromise = undefined;
			}
		})();

		return startPromise;
	};

	return Object.freeze({
		start,
		stop(): void {
			requested = false;
			scheduler.stop();
		},
	});
}
