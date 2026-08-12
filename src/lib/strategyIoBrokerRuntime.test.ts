import { expect } from "chai";
import {
	createStrategyIoBrokerRuntime,
	type StrategyIoBrokerRuntimeAdapter,
} from "./strategyIoBrokerRuntime";

const STATE_ID = "modbus.1.holdingRegisters.46_SOC";
const COMMAND_ID =
	"modbus.1.holdingRegisters.43_Leistungsgrenzwert_für_Entladung";

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

describe("strategy ioBroker runtime", () => {
	it("creates reader and writer boundaries from the same adapter", async () => {
		const expectedObject = stateObject(STATE_ID);
		const expectedState = state(60);
		const calls: Array<readonly unknown[]> = [];
		const adapter: StrategyIoBrokerRuntimeAdapter = {
			async getForeignObjectAsync(stateId) {
				calls.push(["object", stateId]);
				return expectedObject;
			},
			async getForeignStateAsync(stateId) {
				calls.push(["state", stateId]);
				return expectedState;
			},
			async setForeignStateAsync(stateId, value, acknowledged) {
				calls.push(["write", stateId, value, acknowledged]);
			},
		};
		const runtime = createStrategyIoBrokerRuntime(adapter);

		expect(await runtime.reader.getForeignObjectAsync(STATE_ID))
			.to.equal(expectedObject);
		expect(await runtime.reader.getForeignStateAsync(STATE_ID))
			.to.equal(expectedState);
		await runtime.writer.setForeignState(COMMAND_ID, 2_000, false);

		expect(calls).to.deep.equal([
			["object", STATE_ID],
			["state", STATE_ID],
			["write", COMMAND_ID, 2_000, false],
		]);
	});

	it("preserves missing objects and states", async () => {
		const runtime = createStrategyIoBrokerRuntime({
			async getForeignObjectAsync() {
				return undefined;
			},
			async getForeignStateAsync() {
				return null;
			},
			async setForeignStateAsync() {},
		});

		expect(await runtime.reader.getForeignObjectAsync(STATE_ID))
			.to.equal(undefined);
		expect(await runtime.reader.getForeignStateAsync(STATE_ID))
			.to.equal(null);
	});

	it("propagates adapter failures unchanged", async () => {
		const expectedError = new Error("adapter read failed");
		const runtime = createStrategyIoBrokerRuntime({
			async getForeignObjectAsync() {
				throw expectedError;
			},
			async getForeignStateAsync() {
				return null;
			},
			async setForeignStateAsync() {},
		});
		let actualError: unknown;

		try {
			await runtime.reader.getForeignObjectAsync(STATE_ID);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});

	it("returns an immutable runtime and immutable boundaries", () => {
		const runtime = createStrategyIoBrokerRuntime({
			async getForeignObjectAsync() {
				return null;
			},
			async getForeignStateAsync() {
				return null;
			},
			async setForeignStateAsync() {},
		});

		expect(Object.isFrozen(runtime)).to.equal(true);
		expect(Object.isFrozen(runtime.reader)).to.equal(true);
		expect(Object.isFrozen(runtime.writer)).to.equal(true);
	});
});
