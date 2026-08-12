import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	executeStrategyIoBrokerDaylightCycle,
	type StrategyIoBrokerDaylightCycleAdapter,
} from "./strategyIoBrokerDaylightCycle";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";

const NOW = Date.UTC(2026, 5, 21, 12);
const SUNRISE = Date.UTC(2026, 5, 21, 4, 17);
const SUNSET = Date.UTC(2026, 5, 21, 19, 34);
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	batteryCapacityWh: 10_000,
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 4_000,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

function stateObject(stateId: string, write = false): ioBroker.Object {
	return {
		_id: stateId,
		type: "state",
		common: {
			name: stateId,
			type: "number",
			role: "value",
			read: true,
			write,
		},
		native: {},
	};
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

function adapter(
	writes: Array<readonly unknown[]>,
	astroCalls: Array<readonly unknown[]>,
): StrategyIoBrokerDaylightCycleAdapter {
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

	return {
		getAstroDate(pattern, date, offsetMinutes) {
			astroCalls.push([pattern, date?.getTime(), offsetMinutes]);
			return new Date(pattern === "sunrise" ? SUNRISE : SUNSET);
		},
		async getForeignObjectAsync(stateId) {
			return stateObject(
				stateId,
				stateId === STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
			);
		},
		async getForeignStateAsync(stateId) {
			return values.get(stateId) ?? null;
		},
		async setForeignStateAsync(stateId, value, acknowledged) {
			writes.push([stateId, value, acknowledged]);
		},
	};
}

describe("strategy ioBroker daylight cycle runtime execution", () => {
	it("uses one adapter for astro data, state reads, and one command write", async () => {
		const writes: Array<readonly unknown[]> = [];
		const astroCalls: Array<readonly unknown[]> = [];

		const result = await executeStrategyIoBrokerDaylightCycle(
			adapter(writes, astroCalls),
			CONFIGURATION,
			60 * 60 * 1_000,
			2_000,
			STRATEGY_INTEGRATION_CONTRACT,
			{ now: NOW },
		);

		expect(result?.createdAt).to.equal(NOW);
		expect(astroCalls).to.deep.equal([
			["sunrise", NOW, undefined],
			["sunset", NOW, undefined],
		]);
		expect(writes).to.deep.equal([[
			STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
			2_000,
			false,
		]]);
	});

	it("fails closed without writing when astro boundaries are invalid", async () => {
		const writes: Array<readonly unknown[]> = [];
		const invalidAdapter = adapter(writes, []);
		invalidAdapter.getAstroDate = () => new Date(Number.NaN);

		const result = await executeStrategyIoBrokerDaylightCycle(
			invalidAdapter,
			CONFIGURATION,
			60 * 60 * 1_000,
			2_000,
			STRATEGY_INTEGRATION_CONTRACT,
			{ now: NOW },
		);

		expect(result).to.equal(null);
		expect(writes).to.deep.equal([]);
	});

	it("propagates astro failures unchanged", async () => {
		const expectedError = new Error("ioBroker astro failed");
		const failingAdapter = adapter([], []);
		failingAdapter.getAstroDate = () => {
			throw expectedError;
		};
		let actualError: unknown;

		try {
			await executeStrategyIoBrokerDaylightCycle(
				failingAdapter,
				CONFIGURATION,
				60 * 60 * 1_000,
				2_000,
				STRATEGY_INTEGRATION_CONTRACT,
				{ now: NOW },
			);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});

	it("propagates state reader failures unchanged", async () => {
		const expectedError = new Error("ioBroker read failed");
		const failingAdapter = adapter([], []);
		failingAdapter.getForeignStateAsync = async () => {
			throw expectedError;
		};
		let actualError: unknown;

		try {
			await executeStrategyIoBrokerDaylightCycle(
				failingAdapter,
				CONFIGURATION,
				60 * 60 * 1_000,
				2_000,
				STRATEGY_INTEGRATION_CONTRACT,
				{ now: NOW },
			);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});

	it("propagates command writer failures unchanged", async () => {
		const expectedError = new Error("ioBroker write failed");
		const failingAdapter = adapter([], []);
		failingAdapter.setForeignStateAsync = async () => {
			throw expectedError;
		};
		let actualError: unknown;

		try {
			await executeStrategyIoBrokerDaylightCycle(
				failingAdapter,
				CONFIGURATION,
				60 * 60 * 1_000,
				2_000,
				STRATEGY_INTEGRATION_CONTRACT,
				{ now: NOW },
			);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});
});
