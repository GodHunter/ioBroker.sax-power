import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyIoBrokerDaylightCycleScheduler,
	type StrategyIoBrokerCycleTimerAdapter,
} from "./strategyIoBrokerDaylightCycleScheduler";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";

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

interface AdapterRecording {
	readonly adapter: StrategyIoBrokerCycleTimerAdapter;
	readonly timers: TimerCall[];
	readonly cleared: ioBroker.Timeout[];
	readonly writes: Array<readonly unknown[]>;
}

function state(value: ioBroker.StateValue): ioBroker.State {
	return {
		val: value,
		ack: true,
		ts: NOW,
		lc: NOW,
		from: "system.adapter.strategy-test.0",
		q: 0,
	};
}

function recordingAdapter(): AdapterRecording {
	const timers: TimerCall[] = [];
	const cleared: ioBroker.Timeout[] = [];
	const writes: Array<readonly unknown[]> = [];
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

	const adapter: StrategyIoBrokerCycleTimerAdapter = {
		getAstroDate(pattern) {
			return new Date(pattern === "sunrise"
				? NOW - 1_000
				: NOW + 10 * 60 * 60 * 1_000);
		},
		async getForeignObjectAsync(stateId) {
			return {
				_id: stateId,
				type: "state",
				common: {
					name: stateId,
					type: "number",
					role: "value",
					read: true,
					write: stateId === STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
				},
				native: {},
			};
		},
		async getForeignStateAsync(stateId) {
			return values.get(stateId) ?? null;
		},
		async setForeignStateAsync(stateId, value, acknowledged) {
			writes.push([stateId, value, acknowledged]);
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

function createScheduler(
	recording: AdapterRecording,
	onError: (error: unknown) => void = () => undefined,
) {
	return createStrategyIoBrokerDaylightCycleScheduler(
		recording.adapter,
		CONFIGURATION,
		60 * 60 * 1_000,
		2_000,
		30_000,
		onError,
		STRATEGY_INTEGRATION_CONTRACT,
		{ now: NOW },
	);
}

describe("strategy ioBroker daylight cycle scheduler", () => {
	it("rejects invalid intervals fail-closed", () => {
		const recording = recordingAdapter();
		const scheduler = createStrategyIoBrokerDaylightCycleScheduler(
			recording.adapter,
			CONFIGURATION,
			60 * 60 * 1_000,
			2_000,
			0,
			() => undefined,
		);

		expect(scheduler).to.equal(null);
		expect(recording.timers).to.deep.equal([]);
	});

	it("starts idempotently and schedules without an immediate write", () => {
		const recording = recordingAdapter();
		const scheduler = createScheduler(recording);

		scheduler?.start();
		scheduler?.start();

		expect(recording.timers).to.have.length(1);
		expect(recording.timers[0]?.delay).to.equal(30_000);
		expect(recording.writes).to.deep.equal([]);
	});

	it("executes one cycle and schedules the next interval afterwards", async () => {
		const recording = recordingAdapter();
		const scheduler = createScheduler(recording);
		scheduler?.start();

		await recording.timers[0]?.callback();

		expect(recording.writes).to.deep.equal([[
			STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
			2_000,
			false,
		]]);
		expect(recording.timers).to.have.length(2);
	});

	it("stops safely and clears the pending ioBroker timer", () => {
		const recording = recordingAdapter();
		const scheduler = createScheduler(recording);
		scheduler?.start();
		const handle = recording.timers[0]?.handle;

		scheduler?.stop();
		scheduler?.stop();

		expect(recording.cleared).to.deep.equal([handle]);
		expect(recording.writes).to.deep.equal([]);
	});

	it("reports scheduled failures and continues scheduling", async () => {
		const recording = recordingAdapter();
		const expectedError = new Error("strategy cycle failed");
		const errors: unknown[] = [];
		recording.adapter.getAstroDate = () => {
			throw expectedError;
		};
		const scheduler = createScheduler(recording, error => errors.push(error));
		scheduler?.start();

		await recording.timers[0]?.callback();

		expect(errors).to.deep.equal([expectedError]);
		expect(recording.timers).to.have.length(2);
		expect(recording.writes).to.deep.equal([]);
	});

	it("does not run manually before start or after stop", async () => {
		const recording = recordingAdapter();
		const scheduler = createScheduler(recording);

		expect(await scheduler?.runNow()).to.equal(null);
		scheduler?.start();
		scheduler?.stop();
		expect(await scheduler?.runNow()).to.equal(null);
		expect(recording.writes).to.deep.equal([]);
	});

	it("returns an immutable scheduler boundary", () => {
		const scheduler = createScheduler(recordingAdapter());
		expect(Object.isFrozen(scheduler)).to.equal(true);
	});
});
