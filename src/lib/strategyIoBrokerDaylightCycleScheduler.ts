import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyDaylightWindowCycleExecution } from "./strategyDaylightWindowCycleExecution";
import {
	executeStrategyIoBrokerDaylightCycle,
	type StrategyIoBrokerDaylightCycleAdapter,
} from "./strategyIoBrokerDaylightCycle";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";

export interface StrategyIoBrokerCycleTimerAdapter
	extends StrategyIoBrokerDaylightCycleAdapter {
	setTimeout(
		callback: () => void | Promise<void>,
		delay: number,
	): ioBroker.Timeout;
	clearTimeout(timeout: ioBroker.Timeout): void;
}

export interface StrategyIoBrokerDaylightCycleScheduler {
	readonly start: () => void;
	readonly stop: () => void;
	readonly runNow: () => Promise<StrategyDaylightWindowCycleExecution | null>;
}

export function createStrategyIoBrokerDaylightCycleScheduler(
	adapter: StrategyIoBrokerCycleTimerAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	intervalMs: number,
	onError: (error: unknown) => void,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): StrategyIoBrokerDaylightCycleScheduler | null {
	if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
		return null;
	}

	let timer: ioBroker.Timeout | undefined;
	let started = false;
	let running = false;

	const scheduleNext = (): void => {
		if (!started || timer !== undefined) {
			return;
		}

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

	const runNow = async (
	): Promise<StrategyDaylightWindowCycleExecution | null> => {
		if (!started || running) {
			return null;
		}

		running = true;
		try {
			return await executeStrategyIoBrokerDaylightCycle(
				adapter,
				configuration,
				maximumForecastAgeMs,
				requestedDischargePowerW,
				contract,
				resolverOptions,
			);
		} finally {
			running = false;
		}
	};

	return Object.freeze({
		start(): void {
			if (started) {
				return;
			}
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
