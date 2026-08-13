import type { StrategyCommandWriter } from "./strategyCommandWriter";

export interface StrategyForeignStateAdapter {
	setForeignStateAsync(
		stateId: string,
		value: number,
		acknowledged: false,
	): Promise<unknown>;
}

export function createStrategyIoBrokerCommandWriter(
	adapter: StrategyForeignStateAdapter,
): StrategyCommandWriter {
	return Object.freeze({
		async setForeignState(
			stateId: string,
			value: number,
			acknowledged: false,
		) {
			await adapter.setForeignStateAsync(
				stateId,
				value,
				acknowledged,
			);
		},
	});
}
