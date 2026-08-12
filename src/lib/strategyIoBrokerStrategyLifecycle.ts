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
import type { StrategyStateResolverOptions } from "./strategyStateResolver";

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
		);

	if (scheduler === null) return null;

	let requested = false;
	let startPromise: Promise<void> | undefined;

	const start = (): Promise<void> => {
		requested = true;

		if (startPromise !== undefined) return startPromise;

		startPromise = (async () => {
			try {
				await ensureStrategyManualChargeIoBrokerStates(adapter);
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
