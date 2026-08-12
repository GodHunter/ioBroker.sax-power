import type { StrategyStateReader } from "./strategyStateResolver";

export interface StrategyForeignStateReaderAdapter {
	getForeignObjectAsync(
		stateId: string,
	): Promise<ioBroker.Object | null | undefined>;

	getForeignStateAsync(
		stateId: string,
	): Promise<ioBroker.State | null | undefined>;
}

export function createStrategyIoBrokerStateReader(
	adapter: StrategyForeignStateReaderAdapter,
): StrategyStateReader {
	return Object.freeze({
		async getForeignObjectAsync(stateId: string) {
			return await adapter.getForeignObjectAsync(stateId);
		},
		async getForeignStateAsync(stateId: string) {
			return await adapter.getForeignStateAsync(stateId);
		},
	});
}
