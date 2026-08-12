import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyCommandWriter } from "./strategyDayDischargeCommandExecutor";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import { executeStrategyManualChargeCycle } from "./strategyManualChargeCycle";
import {
	STRATEGY_MANUAL_CHARGE_STATE_IDS,
	type StrategyManualChargeIoBrokerAdapter,
} from "./strategyManualChargeStates";

const configuration: StrategyConfiguration = Object.freeze({
	batteryModelId: "home-5.8",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 2_000,
	maximumDischargePowerW: 3_500,
	pvForecastReserveWh: 500,
});

function snapshot(stateOfChargePercent = 50): StrategyInputSnapshot {
	return {
		createdAt: 1_800_000,
		modbus: {
			operatingState: 1,
			stateOfChargePercent,
			batteryPowerW: 0,
			smartMeterPowerW: 0,
		},
		pvForecast: {
			energyNowUntilEndOfDayWh: 0,
			energyTodayWh: 0,
			energyTomorrowWh: 0,
			lastUpdatedTimestamp: 0,
		},
	};
}

function runtime(enabled: boolean, requestedChargePowerW: number) {
	const events: string[] = [];
	const statusWrites: Array<{ id: string; state: ioBroker.SettableState }> = [];
	const commandWrites: Array<{ stateId: string; value: number }> = [];
	const states: Record<string, ioBroker.State> = {
		[STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled]: { val: enabled } as ioBroker.State,
		[STRATEGY_MANUAL_CHARGE_STATE_IDS.requestedChargePowerW]: {
			val: requestedChargePowerW,
		} as ioBroker.State,
	};
	const adapter: StrategyManualChargeIoBrokerAdapter = {
		async extendObjectAsync() {},
		async getStateAsync(id) {
			events.push(`read:${id}`);
			return states[id];
		},
		async setStateAsync(id, state) {
			events.push(`status:${id}`);
			statusWrites.push({ id, state });
		},
	};
	const writer: StrategyCommandWriter = {
		async setForeignState(stateId, value) {
			events.push(`command:${stateId}`);
			commandWrites.push({ stateId, value });
		},
	};

	return { adapter, writer, events, statusWrites, commandWrites };
}

describe("strategy manual charge cycle", () => {
	it("reads, evaluates, publishes and executes one manual charge cycle", async () => {
		const run = runtime(true, 1_800);
		const result = await executeStrategyManualChargeCycle(
			run.adapter,
			run.writer,
			snapshot(),
			configuration,
		);

		expect(result?.control.targetChargePowerW).to.equal(1_800);
		expect(result?.commandPlan?.register).to.equal(44);
		expect(result?.commandExecution?.valueW).to.equal(1_800);
		expect(run.statusWrites).to.have.length(4);
		expect(run.commandWrites).to.deep.equal([{
			stateId: "modbus.1.holdingRegisters.44_Leistungsgrenzwert_für_Ladung",
			value: 1_800,
		}]);
		expect(run.events.findIndex(event => event.startsWith("command:")))
			.to.be.greaterThan(run.events.findIndex(event => event.startsWith("status:")));
	});

	it("publishes automatic ownership without writing register 44", async () => {
		const run = runtime(false, 1_800);
		const result = await executeStrategyManualChargeCycle(
			run.adapter,
			run.writer,
			snapshot(),
			configuration,
		);

		expect(result?.control.operatingMode).to.equal("automatic");
		expect(result?.commandPlan).to.equal(null);
		expect(result?.commandExecution).to.equal(null);
		expect(run.statusWrites).to.have.length(4);
		expect(run.commandWrites).to.deep.equal([]);
	});

	it("writes a safety-limited target and an explicit manual stop", async () => {
		const limited = runtime(true, 4_000);
		const stopped = runtime(true, 1_800);

		const limitedResult = await executeStrategyManualChargeCycle(
			limited.adapter, limited.writer, snapshot(), configuration,
		);
		const stoppedResult = await executeStrategyManualChargeCycle(
			stopped.adapter, stopped.writer, snapshot(90), configuration,
		);

		expect(limitedResult?.commandExecution?.valueW).to.equal(2_000);
		expect(stoppedResult?.commandExecution?.valueW).to.equal(0);
		expect(stoppedResult?.control.reason)
			.to.equal("maximum-state-of-charge-reached");
	});

	it("fails closed before status or command writes for invalid inputs", async () => {
		const run = runtime(true, -1);

		expect(await executeStrategyManualChargeCycle(
			run.adapter, run.writer, snapshot(), configuration,
		)).to.equal(null);
		expect(run.statusWrites).to.deep.equal([]);
		expect(run.commandWrites).to.deep.equal([]);
	});

	it("keeps status and command write failures visible", async () => {
		for (const boundary of ["status", "command"] as const) {
			const run = runtime(true, 1_800);
			const expectedError = new Error(`${boundary} failed`);

			if (boundary === "status") {
				run.adapter.setStateAsync = async () => { throw expectedError; };
			} else {
				run.writer.setForeignState = async () => { throw expectedError; };
			}

			let actualError: unknown;
			try {
				await executeStrategyManualChargeCycle(
					run.adapter, run.writer, snapshot(), configuration,
				);
			} catch (error) {
				actualError = error;
			}
			expect(actualError).to.equal(expectedError);
		}
	});
});
