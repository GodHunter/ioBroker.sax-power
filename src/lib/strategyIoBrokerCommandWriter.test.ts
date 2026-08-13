import { expect } from "chai";

import {
	createStrategyIoBrokerCommandWriter,
	type StrategyForeignStateAdapter,
} from "./strategyIoBrokerCommandWriter";

interface ForeignStateCall {
	readonly stateId: string;
	readonly value: number;
	readonly acknowledged: false;
}

function recordingAdapter(calls: ForeignStateCall[]): StrategyForeignStateAdapter {
	return {
		async setForeignStateAsync(stateId, value, acknowledged) {
			calls.push(Object.freeze({
				stateId,
				value,
				acknowledged,
			}));
		},
	};
}

describe("strategy ioBroker command writer", () => {
	it("forwards a positive Modbus command unchanged", async () => {
		const calls: ForeignStateCall[] = [];
		const writer = createStrategyIoBrokerCommandWriter(
			recordingAdapter(calls),
		);

		await writer.setForeignState(
			"modbus.0.holdingRegisters.43_Discharging_Power",
			1800,
			false,
		);

		expect(calls).to.deep.equal([{
			stateId: "modbus.0.holdingRegisters.43_Discharging_Power",
			value: 1800,
			acknowledged: false,
		}]);
	});

	it("forwards an explicit zero-watt stop unchanged", async () => {
		const calls: ForeignStateCall[] = [];
		const writer = createStrategyIoBrokerCommandWriter(
			recordingAdapter(calls),
		);

		await writer.setForeignState(
			"modbus.0.holdingRegisters.43_Discharging_Power",
			0,
			false,
		);

		expect(calls).to.deep.equal([{
			stateId: "modbus.0.holdingRegisters.43_Discharging_Power",
			value: 0,
			acknowledged: false,
		}]);
	});

	it("supports an alternative resolved command object", async () => {
		const calls: ForeignStateCall[] = [];
		const writer = createStrategyIoBrokerCommandWriter(
			recordingAdapter(calls),
		);

		await writer.setForeignState(
			"modbus.4.holdingRegisters.43_Discharging_Power",
			725,
			false,
		);

		expect(calls).to.deep.equal([{
			stateId: "modbus.4.holdingRegisters.43_Discharging_Power",
			value: 725,
			acknowledged: false,
		}]);
	});

	it("waits for the asynchronous ioBroker write", async () => {
		let releaseWrite: (() => void) | undefined;
		let completed = false;
		const adapter: StrategyForeignStateAdapter = {
			setForeignStateAsync() {
				return new Promise<void>((resolve) => {
					releaseWrite = resolve;
				});
			},
		};
		const writer = createStrategyIoBrokerCommandWriter(adapter);
		const writing = writer.setForeignState("modbus.0.command.43", 900, false)
			.then(() => {
				completed = true;
			});

		await Promise.resolve();
		expect(completed).to.equal(false);

		releaseWrite?.();
		await writing;
		expect(completed).to.equal(true);
	});

	it("keeps technical ioBroker write errors visible", async () => {
		const expected = new Error("foreign state write failed");
		const writer = createStrategyIoBrokerCommandWriter({
			async setForeignStateAsync() {
				throw expected;
			},
		});

		let actual: unknown;
		try {
			await writer.setForeignState("modbus.0.command.43", 900, false);
		} catch (error) {
			actual = error;
		}

		expect(actual).to.equal(expected);
	});

	it("returns an immutable writer boundary", () => {
		const writer = createStrategyIoBrokerCommandWriter({
			async setForeignStateAsync() {
				return undefined;
			},
		});

		expect(Object.isFrozen(writer)).to.equal(true);
	});
});
