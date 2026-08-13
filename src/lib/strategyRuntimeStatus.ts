export const STRATEGY_RUNTIME_STATUS_STATE_IDS = Object.freeze({
	state: "info.strategyState",
	detail: "info.strategyDetail",
});

export type StrategyRuntimeState =
	| "disabled"
	| "invalid-configuration"
	| "waiting-for-inputs"
	| "starting"
	| "running"
	| "error";

export interface StrategyRuntimeStatusAdapter {
	setStateAsync(
		stateId: string,
		state: ioBroker.SettableState,
	): Promise<unknown>;
}

export async function publishStrategyRuntimeStatus(
	adapter: StrategyRuntimeStatusAdapter,
	state: StrategyRuntimeState,
	detail = "",
): Promise<void> {
	await Promise.all([
		adapter.setStateAsync(
			STRATEGY_RUNTIME_STATUS_STATE_IDS.state,
			{ val: state, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_RUNTIME_STATUS_STATE_IDS.detail,
			{ val: detail, ack: true },
		),
	]);
}
