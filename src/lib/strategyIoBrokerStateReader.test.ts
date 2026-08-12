import { expect } from "chai";
import {
	createStrategyIoBrokerStateReader,
	type StrategyForeignStateReaderAdapter,
} from "./strategyIoBrokerStateReader";

const STATE_ID = "modbus.1.holdingRegisters.46_SOC";

function stateObject(stateId: string): ioBroker.Object {
	return {
		_id: stateId,
		type: "state",
		common: {
			name: stateId,
			type: "number",
			role: "value",
			read: true,
			write: false,
		},
		native: {},
	};
}

function state(value: number): ioBroker.State {
	return {
		val: value,
		ack: true,
		ts: 1,
		lc: 1,
		from: "system.adapter.modbus.1",
		q: 0,
	};
}

describe("strategy ioBroker state reader", () => {
	it("forwards object reads and returns the unchanged object", async () => {
		const expectedObject = stateObject(STATE_ID);
		const calls: string[] = [];
		const reader = createStrategyIoBrokerStateReader({
			async getForeignObjectAsync(stateId) {
				calls.push(stateId);
				return expectedObject;
			},
			async getForeignStateAsync() {
				return null;
			},
		});

		const result = await reader.getForeignObjectAsync(STATE_ID);

		expect(calls).to.deep.equal([STATE_ID]);
		expect(result).to.equal(expectedObject);
	});

	it("forwards state reads and returns the unchanged state", async () => {
		const expectedState = state(60);
		const calls: string[] = [];
		const reader = createStrategyIoBrokerStateReader({
			async getForeignObjectAsync() {
				return null;
			},
			async getForeignStateAsync(stateId) {
				calls.push(stateId);
				return expectedState;
			},
		});

		const result = await reader.getForeignStateAsync(STATE_ID);

		expect(calls).to.deep.equal([STATE_ID]);
		expect(result).to.equal(expectedState);
	});

	it("preserves missing objects and states", async () => {
		const reader = createStrategyIoBrokerStateReader({
			async getForeignObjectAsync() {
				return undefined;
			},
			async getForeignStateAsync() {
				return null;
			},
		});

		expect(await reader.getForeignObjectAsync(STATE_ID)).to.equal(undefined);
		expect(await reader.getForeignStateAsync(STATE_ID)).to.equal(null);
	});

	it("waits for asynchronous adapter reads", async () => {
		let resolveObject: ((value: ioBroker.Object) => void) | undefined;
		const objectPromise = new Promise<ioBroker.Object>((resolve) => {
			resolveObject = resolve;
		});
		const adapter: StrategyForeignStateReaderAdapter = {
			getForeignObjectAsync() {
				return objectPromise;
			},
			async getForeignStateAsync() {
				return null;
			},
		};
		const reader = createStrategyIoBrokerStateReader(adapter);
		let completed = false;
		const pendingRead = reader.getForeignObjectAsync(STATE_ID).then(() => {
			completed = true;
		});

		await Promise.resolve();
		expect(completed).to.equal(false);

		resolveObject?.(stateObject(STATE_ID));
		await pendingRead;
		expect(completed).to.equal(true);
	});

	it("propagates technical object read failures unchanged", async () => {
		const expectedError = new Error("object read failed");
		const reader = createStrategyIoBrokerStateReader({
			async getForeignObjectAsync() {
				throw expectedError;
			},
			async getForeignStateAsync() {
				return null;
			},
		});
		let actualError: unknown;

		try {
			await reader.getForeignObjectAsync(STATE_ID);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});

	it("propagates technical state read failures unchanged", async () => {
		const expectedError = new Error("state read failed");
		const reader = createStrategyIoBrokerStateReader({
			async getForeignObjectAsync() {
				return null;
			},
			async getForeignStateAsync() {
				throw expectedError;
			},
		});
		let actualError: unknown;

		try {
			await reader.getForeignStateAsync(STATE_ID);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});

	it("returns an immutable reader boundary", () => {
		const reader = createStrategyIoBrokerStateReader({
			async getForeignObjectAsync() {
				return null;
			},
			async getForeignStateAsync() {
				return null;
			},
		});

		expect(Object.isFrozen(reader)).to.equal(true);
	});
});
