import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import {
	executeStrategyIoBrokerManualChargeCycle,
	type StrategyIoBrokerManualChargeAdapter,
} from "./strategyIoBrokerManualChargeCycle";
import { STRATEGY_MANUAL_CHARGE_STATE_IDS } from "./strategyManualChargeStates";

const NOW = 1_800_000;
const configuration: StrategyConfiguration = {
	batteryModelId: "home-5.8",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 2_000,
	maximumDischargePowerW: 3_500,
	pvForecastReserveWh: 500,
};

function runtime(enabled = true) {
	const foreignReads: string[] = [];
	const commands: Array<{ id: string; value: number }> = [];
	const commandId = STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId;
	const socId = STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;
	const adapter: StrategyIoBrokerManualChargeAdapter = {
		async extendObjectAsync() {},
		async getStateAsync(id) {
			if (id === STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled) {
				return { val: enabled } as ioBroker.State;
			}
			return { val: 1_800 } as ioBroker.State;
		},
		async setStateAsync() {},
		async getForeignObjectAsync(id) {
			foreignReads.push(`object:${id}`);
			return { _id: id, type: "state", common: {}, native: {} } as ioBroker.StateObject;
		},
		async getForeignStateAsync(id) {
			foreignReads.push(`state:${id}`);
			return id === socId
				? { val: 72, ack: true, q: 0, ts: NOW - 1_000 } as ioBroker.State
				: null;
		},
		async setForeignStateAsync(id, value) {
			commands.push({ id, value });
		},
	};
	return { adapter, foreignReads, commands, commandId, socId };
}

describe("strategy ioBroker manual charge cycle", () => {
	it("executes from ioBroker SOC and register 44 without PV reads", async () => {
		const run = runtime();
		const result = await executeStrategyIoBrokerManualChargeCycle(
			run.adapter, configuration, undefined, { now: NOW },
		);

		expect(result?.commandExecution?.valueW).to.equal(1_800);
		expect(run.commands).to.deep.equal([{
			id: run.commandId,
			value: 1_800,
		}]);
		expect(run.foreignReads).to.deep.equal([
			`object:${run.commandId}`,
			`object:${run.socId}`,
			`state:${run.socId}`,
		]);
		expect(run.foreignReads.some(id => id.includes("pvforecast")))
			.to.equal(false);
	});

	it("publishes automatic ownership without a register write", async () => {
		const run = runtime(false);
		const result = await executeStrategyIoBrokerManualChargeCycle(
			run.adapter, configuration, undefined, { now: NOW },
		);

		expect(result?.control.operatingMode).to.equal("automatic");
		expect(run.commands).to.deep.equal([]);
	});

	it("keeps foreign reader failures visible", async () => {
		const run = runtime();
		const expectedError = new Error("modbus read failed");
		run.adapter.getForeignObjectAsync = async () => { throw expectedError; };
		let actualError: unknown;

		try {
			await executeStrategyIoBrokerManualChargeCycle(
				run.adapter, configuration, undefined, { now: NOW },
			);
		} catch (error) {
			actualError = error;
		}
		expect(actualError).to.equal(expectedError);
	});
});
