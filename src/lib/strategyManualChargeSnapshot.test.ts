import { expect } from "chai";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import { prepareStrategyManualChargeSnapshot } from "./strategyManualChargeSnapshot";
import type { StrategyStateReader } from "./strategyStateResolver";

const NOW = 1_800_000;

function reader(options: {
	readonly soc?: ioBroker.State | null;
	readonly missingCommand?: boolean;
} = {}) {
	const reads: string[] = [];
	const commandId = STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId;
	const socId = STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;
	const stateReader: StrategyStateReader = {
		async getForeignObjectAsync(id) {
			reads.push(`object:${id}`);
			if (id === commandId && options.missingCommand) return null;
			return { _id: id, type: "state", common: {}, native: {} } as ioBroker.StateObject;
		},
		async getForeignStateAsync(id) {
			reads.push(`state:${id}`);
			if (id !== socId) return null;
			return options.soc === undefined
				? { val: 72, ack: true, q: 0, ts: NOW - 1_000 } as ioBroker.State
				: options.soc;
		},
	};
	return { stateReader, reads, commandId, socId };
}

describe("strategy manual charge snapshot", () => {
	it("resolves only register 44 and the current SOC", async () => {
		const run = reader();
		const result = await prepareStrategyManualChargeSnapshot(
			run.stateReader, undefined, { now: NOW },
		);

		expect(result?.snapshot).to.deep.equal({
			createdAt: NOW,
			modbus: { stateOfChargePercent: 72 },
		});
		expect(run.reads).to.deep.equal([
			`object:${run.commandId}`,
			`object:${run.socId}`,
			`state:${run.socId}`,
		]);
		expect(run.reads.some(id => id.includes("pvforecast"))).to.equal(false);
		expect(Object.isFrozen(result)).to.equal(true);
		expect(Object.isFrozen(result?.snapshot.modbus)).to.equal(true);
	});

	it("fails closed for a missing command or invalid SOC observation", async () => {
		for (const run of [
			reader({ missingCommand: true }),
			reader({ soc: null }),
			reader({ soc: { val: 72, ack: false, ts: NOW - 1_000 } as ioBroker.State }),
			reader({ soc: { val: 72, ack: true, ts: NOW - 999_999 } as ioBroker.State }),
		]) {
			expect(await prepareStrategyManualChargeSnapshot(
				run.stateReader, undefined, { now: NOW },
			)).to.equal(null);
		}
	});

	it("fails before reading for a non-finite cycle timestamp", async () => {
		const run = reader();
		expect(await prepareStrategyManualChargeSnapshot(
			run.stateReader, undefined, { now: Number.NaN },
		)).to.equal(null);
		expect(run.reads).to.deep.equal([]);
	});
});
