import { expect } from "chai";

import {
	publishStrategyRuntimeStatus,
	STRATEGY_RUNTIME_STATUS_STATE_IDS,
} from "./strategyRuntimeStatus";

describe("strategy runtime status", () => {
	it("publishes acknowledged state and detail values", async () => {
		const writes: Array<{
			id: string;
			state: ioBroker.SettableState;
		}> = [];

		await publishStrategyRuntimeStatus(
			{
				async setStateAsync(id, state): Promise<void> {
					writes.push({ id, state });
				},
			},
			"invalid-configuration",
			"batteryModelId:required",
		);

		expect(writes).to.deep.equal([
			{
				id: STRATEGY_RUNTIME_STATUS_STATE_IDS.state,
				state: { val: "invalid-configuration", ack: true },
			},
			{
				id: STRATEGY_RUNTIME_STATUS_STATE_IDS.detail,
				state: { val: "batteryModelId:required", ack: true },
			},
		]);
	});

	it("clears stale detail text when no detail is supplied", async () => {
		const writes: ioBroker.SettableState[] = [];

		await publishStrategyRuntimeStatus(
			{
				async setStateAsync(_id, state): Promise<void> {
					writes.push(state);
				},
			},
			"running",
		);

		expect(writes[1]).to.deep.equal({ val: "", ack: true });
	});
});
