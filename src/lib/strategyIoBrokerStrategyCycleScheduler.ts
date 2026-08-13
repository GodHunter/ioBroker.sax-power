import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	executeStrategyIoBrokerStrategyCycle,
	type StrategyIoBrokerStrategyCycle,
	type StrategyIoBrokerStrategyCycleAdapter,
} from "./strategyIoBrokerStrategyCycle";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";
import {
	DEFAULT_STRATEGY_MODES,
	type StrategyModes,
} from "./strategyModes";

export interface StrategyIoBrokerStrategyTimerAdapter
	extends StrategyIoBrokerStrategyCycleAdapter {
	setTimeout(
		callback: () => void | Promise<void>,
		delay: number,
	): ioBroker.Timeout;
	clearTimeout(timeout: ioBroker.Timeout): void;
}

export interface StrategyIoBrokerStrategyCycleScheduler {
	readonly start: () => void;
	readonly stop: () => void;
	readonly runNow: () => Promise<StrategyIoBrokerStrategyCycle | null>;
}

export function createStrategyIoBrokerStrategyCycleScheduler(
	adapter: StrategyIoBrokerStrategyTimerAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	intervalMs: number,
	onError: (error: unknown) => void,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
	modes: StrategyModes = DEFAULT_STRATEGY_MODES,
): StrategyIoBrokerStrategyCycleScheduler | null {
	if (!Number.isFinite(intervalMs) || intervalMs <= 0) return null;

	let timer: ioBroker.Timeout | undefined;
	let started = false;
	let running = false;

	const scheduleNext = (): void => {
		if (!started || timer !== undefined) return;

		timer = adapter.setTimeout(async () => {
			timer = undefined;
			try {
				await runNow();
			} catch (error) {
				onError(error);
			} finally {
				scheduleNext();
			}
		}, intervalMs);
	};

	const runNow = async (): Promise<StrategyIoBrokerStrategyCycle | null> => {
		if (!started || running) return null;

		running = true;
		try {
			return await executeStrategyIoBrokerStrategyCycle(
				adapter,
				configuration,
				maximumForecastAgeMs,
				requestedDischargePowerW,
				contract,
				resolverOptions,
				modes,
			);
		} finally {
			running = false;
		}
	};

	return Object.freeze({
		start(): void {
			if (started) return;
			started = true;
			scheduleNext();
		},
		stop(): void {
			started = false;
			if (timer !== undefined) {
				adapter.clearTimeout(timer);
				timer = undefined;
			}
		},
		runNow,
	});
}
