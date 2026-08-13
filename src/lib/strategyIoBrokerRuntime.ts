import type { StrategyCommandWriter } from "./strategyCommandWriter";
import {
	createStrategyIoBrokerCommandWriter,
	type StrategyForeignStateAdapter,
} from "./strategyIoBrokerCommandWriter";
import {
	createStrategyIoBrokerStateReader,
	type StrategyForeignStateReaderAdapter,
} from "./strategyIoBrokerStateReader";
import type { StrategyStateReader } from "./strategyStateResolver";

export interface StrategyIoBrokerRuntimeAdapter
	extends StrategyForeignStateAdapter, StrategyForeignStateReaderAdapter {}

export interface StrategyIoBrokerRuntime {
	readonly reader: StrategyStateReader;
	readonly writer: StrategyCommandWriter;
}

export function createStrategyIoBrokerRuntime(
	adapter: StrategyIoBrokerRuntimeAdapter,
): StrategyIoBrokerRuntime {
	return Object.freeze({
		reader: createStrategyIoBrokerStateReader(adapter),
		writer: createStrategyIoBrokerCommandWriter(adapter),
	});
}
