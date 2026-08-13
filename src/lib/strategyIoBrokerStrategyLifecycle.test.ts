import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyIoBrokerStrategyLifecycle,
	type StrategyIoBrokerStrategyLifecycle,
} from "./strategyIoBrokerStrategyLifecycle";
import type { StrategyIoBrokerStrategyTimerAdapter } from "./strategyIoBrokerStrategyCycleScheduler";
import { STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS } from "./strategyManualChargeStates";

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

function recordingAdapter() {
	const objects: string[] = [];
	const timers: TimerCall[] = [];
	const cleared: ioBroker.Timeout[] = [];
	let nextHandle = 1;
	let releaseObject: (() => void) | undefined;
	let blockObjects = false;
	const adapter: StrategyIoBrokerStrategyTimerAdapter = {
		getAstroDate() {
			return new Date();
		},
		async extendObjectAsync(id) {
			objects.push(id);
			if (blockObjects) {
				await new Promise<void>(resolve => { releaseObject = resolve; });
				blockObjects = false;
			}
		},
		async getStateAsync() {
			return null;
		},
		async setStateAsync() {},
		async getForeignObjectAsync() {
			return null;
		},
		async getForeignStateAsync() {
			return null;
		},
		async setForeignStateAsync() {},
		setTimeout(callback, delay) {
			const handle = nextHandle++ as unknown as ioBroker.Timeout;
			timers.push({ callback, delay, handle });
			return handle;
		},
		clearTimeout(handle) {
			cleared.push(handle);
		},
	};
	return {
		adapter,
		objects,
		timers,
		cleared,
		blockNextObject: () => { blockObjects = true; },
		releaseObject: () => releaseObject?.(),
	};
}

function lifecycle(
	run: ReturnType<typeof recordingAdapter>,
): StrategyIoBrokerStrategyLifecycle | null {
	return createStrategyIoBrokerStrategyLifecycle(
		run.adapter,
		CONFIGURATION,
		60 * 60 * 1_000,
		2_000,
		30_000,
		() => undefined,
	);
}

describe("strategy ioBroker lifecycle", () => {
	it("rejects an invalid scheduler interval before creating states", () => {
		const run = recordingAdapter();
		expect(createStrategyIoBrokerStrategyLifecycle(
			run.adapter, CONFIGURATION, 1, 1, 0, () => undefined,
		)).to.equal(null);
		expect(run.objects).to.deep.equal([]);
		expect(run.timers).to.deep.equal([]);
	});

	it("creates all strategy states before scheduling the first cycle", async () => {
		const run = recordingAdapter();
		await lifecycle(run)?.start();

		expect(run.objects).to.deep.equal([
			"strategy",
			"strategy.manualCharge",
			"strategy.status",
			...STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS.map(({ id }) => id),
			"strategy.dayDischarge",
			"strategy.dayDischarge.allowed",
			"strategy.dayDischarge.availablePowerW",
			"strategy.dayDischarge.reason",
			"strategy.dayDischarge.validUntil",
		]);
		expect(run.timers).to.have.length(1);
		expect(run.timers[0]?.delay).to.equal(30_000);
	});

	it("shares concurrent initialization and schedules only once", async () => {
		const run = recordingAdapter();
		run.blockNextObject();
		const instance = lifecycle(run);
		const first = instance?.start();
		const second = instance?.start();

		expect(first).to.equal(second);
		run.releaseObject();
		await Promise.all([first, second]);
		expect(run.timers).to.have.length(1);
	});

	it("does not schedule when stopped during state initialization", async () => {
		const run = recordingAdapter();
		run.blockNextObject();
		const instance = lifecycle(run);
		const starting = instance?.start();
		instance?.stop();
		run.releaseObject();
		await starting;

		expect(run.timers).to.deep.equal([]);
	});

	it("stops the scheduled strategy cycle idempotently", async () => {
		const run = recordingAdapter();
		const instance = lifecycle(run);
		await instance?.start();
		const handle = run.timers[0]?.handle;
		instance?.stop();
		instance?.stop();

		expect(run.cleared).to.deep.equal([handle]);
	});

	it("keeps state creation failures visible and remains restartable", async () => {
		const run = recordingAdapter();
		const expectedError = new Error("state creation failed");
		let fail = true;
		run.adapter.extendObjectAsync = async id => {
			run.objects.push(id);
			if (fail) {
				fail = false;
				throw expectedError;
			}
		};
		const instance = lifecycle(run);
		let actualError: unknown;
		try {
			await instance?.start();
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
		expect(run.timers).to.deep.equal([]);
		await instance?.start();
		expect(run.timers).to.have.length(1);
	});

	it("returns an immutable lifecycle boundary", () => {
		expect(Object.isFrozen(lifecycle(recordingAdapter()))).to.equal(true);
	});
});
