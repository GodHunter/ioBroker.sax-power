export interface StrategyReadinessRetryTimerAdapter {
	setTimeout(
		callback: () => void | Promise<void>,
		delay: number,
	): ioBroker.Timeout;
	clearTimeout(timeout: ioBroker.Timeout): void;
}

export interface StrategyReadinessRetry {
	readonly schedule: () => void;
	readonly stop: () => void;
}

export function createStrategyReadinessRetry(
	adapter: StrategyReadinessRetryTimerAdapter,
	intervalMs: number,
	retry: () => Promise<void>,
	onError: (error: unknown) => void,
): StrategyReadinessRetry | null {
	if (!Number.isFinite(intervalMs) || intervalMs <= 0) return null;

	let timer: ioBroker.Timeout | undefined;
	let stopped = false;
	const schedule = (): void => {
		if (stopped || timer !== undefined) return;

		timer = adapter.setTimeout(async () => {
			timer = undefined;
			if (stopped) return;

			try {
				await retry();
			} catch (error) {
				onError(error);
				schedule();
			}
		}, intervalMs);
	};

	return Object.freeze({
		schedule,
		stop(): void {
			stopped = true;
			if (timer !== undefined) {
				adapter.clearTimeout(timer);
				timer = undefined;
			}
		},
	});
}
