import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyIoBrokerStrategyCycleScheduler,
	type StrategyIoBrokerStrategyTimerAdapter,
} from "./strategyIoBrokerStrategyCycleScheduler";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import { STRATEGY_MANUAL_CHARGE_STATE_IDS } from "./strategyManualChargeStates";

const NOW = Date.UTC(2026, 5, 21, 12);
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 3_500,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

interface TimerCall {
	readonly callback: () => void | Promise<void>;
	readonly delay: number;
	readonly handle: ioBroker.Timeout;
}

function state(value: ioBroker.StateValue): ioBroker.State {
	return { val: value, ack: true, q: 0, ts: NOW, lc: NOW } as ioBroker.State;
}

function recordingAdapter(manualEnabled = false) {
	const timers: TimerCall[] = [];
	const cleared: ioBroker.Timeout[] = [];
	const writes: Array<{ id: string; value: ioBroker.StateValue }> = [];
	const values = new Map<string, ioBroker.State>([
		[STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.operatingState.stateId, state(1)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId, state(60)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.smartMeterPower.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyNowUntilEndOfDay.stateId, state(8_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyToday.stateId, state(12_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyTomorrow.stateId, state(10_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId, state(NOW)],
	]);
	let nextHandle = 1;
	const adapter: StrategyIoBrokerStrategyTimerAdapter = {
		getAstroDate(pattern) {
			return new Date(pattern === "sunrise"
				? NOW - 60 * 60 * 1_000
				: NOW + 10 * 60 * 60 * 1_000);
		},
		async extendObjectAsync() {},
		async getStateAsync(id) {
			return id === STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled
				? state(manualEnabled)
				: state(1_800);
		},
		async setStateAsync(id, value) {
			writes.push({ id, value: value.val ?? null });
		},
		async getForeignObjectAsync(id) {
			return {
				_id: id,
				type: "state",
				common: {
					name: id,
					type: "number",
					role: "value",
					read: true,
					write: id === STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId
						|| id === STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
				},
				native: {},
			} as ioBroker.StateObject;
		},
		async getForeignStateAsync(id) {
			return values.get(id) ?? null;
		},
		async setForeignStateAsync(id, value) {
			writes.push({ id, value });
		},
		setTimeout(callback, delay) {
			const handle = nextHandle++ as unknown as ioBroker.Timeout;
			timers.push({ callback, delay, handle });
			return handle;
		},
		clearTimeout(handle) {
			cleared.push(handle);
		},
	};
	return { adapter, timers, cleared, writes };
}

function scheduler(
	run: ReturnType<typeof recordingAdapter>,
	onError: (error: unknown) => void = () => undefined,
) {
	return createStrategyIoBrokerStrategyCycleScheduler(
		run.adapter,
		CONFIGURATION,
		60 * 60 * 1_000,
		2_000,
		30_000,
		onError,
		undefined,
		{ now: NOW },
	);
}

describe("strategy ioBroker operating-mode cycle scheduler", () => {
	it("rejects invalid intervals and starts idempotently", () => {
		const invalid = recordingAdapter();
		expect(createStrategyIoBrokerStrategyCycleScheduler(
			invalid.adapter, CONFIGURATION, 1, 1, 0, () => undefined,
		)).to.equal(null);
		expect(invalid.timers).to.deep.equal([]);

		const run = recordingAdapter();
		const instance = scheduler(run);
		instance?.start();
		instance?.start();
		expect(run.timers).to.have.length(1);
		expect(run.timers[0]?.delay).to.equal(30_000);
	});

	it("schedules the next automatic cycle after execution", async () => {
		const run = recordingAdapter();
		const instance = scheduler(run);
		instance?.start();
		await run.timers[0]?.callback();

		expect(run.writes).to.deep.include({
			id: "strategy.dayDischarge.availablePowerW",
			value: 2_000,
		});
		expect(run.writes.some(({ id }) => id ===
			STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
		)).to.equal(false);
		expect(run.timers).to.have.length(2);
	});

	it("schedules manual charging without running the automatic command", async () => {
		const run = recordingAdapter(true);
		const instance = scheduler(run);
		instance?.start();
		await run.timers[0]?.callback();

		expect(run.writes.filter(({ id }) => id.startsWith("modbus."))).to.deep.equal([{
			id: STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId,
			value: 1_800,
		}]);
		expect(run.timers).to.have.length(2);
	});

	it("stops, clears the timer and prevents manual runs", async () => {
		const run = recordingAdapter();
		const instance = scheduler(run);
		expect(await instance?.runNow()).to.equal(null);
		instance?.start();
		const handle = run.timers[0]?.handle;
		instance?.stop();
		instance?.stop();

		expect(run.cleared).to.deep.equal([handle]);
		expect(await instance?.runNow()).to.equal(null);
		expect(run.writes).to.deep.equal([]);
	});

	it("reports failures and continues scheduling", async () => {
		const run = recordingAdapter();
		const expectedError = new Error("strategy read failed");
		const errors: unknown[] = [];
		run.adapter.getForeignObjectAsync = async () => { throw expectedError; };
		const instance = scheduler(run, error => errors.push(error));
		instance?.start();
		await run.timers[0]?.callback();

		expect(errors).to.deep.equal([expectedError]);
		expect(run.timers).to.have.length(2);
		expect(run.writes).to.deep.equal([]);
	});

	it("returns an immutable scheduler boundary", () => {
		expect(Object.isFrozen(scheduler(recordingAdapter()))).to.equal(true);
	});
});
