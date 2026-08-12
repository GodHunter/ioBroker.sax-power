import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyDaylightWindowProvider } from "./strategyDaylightWindowCyclePreparation";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import {
	executeStrategyIoBrokerDayDischargeCycle,
} from "./strategyIoBrokerCycleExecution";
import type { StrategyIoBrokerRuntimeAdapter } from "./strategyIoBrokerRuntime";

const NOW = Date.UTC(2026, 5, 21, 12);
const MAXIMUM_FORECAST_AGE_MS = 60 * 60 * 1_000;
const CONFIGURATION: StrategyConfiguration = {
	batteryCapacityWh: 10_000,
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 4_000,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

function stateObject(
	stateId: string,
	write = false,
): ioBroker.Object {
	return {
		_id: stateId,
		type: "state",
		common: {
			name: stateId,
			type: "number",
			role: "value",
			read: true,
			write,
			unit: stateId.endsWith("lastUpdated") ? undefined : "W",
		},
		native: {},
	};
}

function state(value: ioBroker.StateValue, ts = NOW): ioBroker.State {
	return {
		val: value,
		ack: true,
		ts,
		lc: ts,
		from: "system.adapter.strategy-test.0",
		q: 0,
	};
}

function provider(active = true): StrategyDaylightWindowProvider {
	return {
		async getDaylightWindow(createdAt) {
			return {
				startsAt: active
					? createdAt - 6 * 60 * 60 * 1_000
					: createdAt + 1,
				endsAt: createdAt + 6 * 60 * 60 * 1_000,
			};
		},
	};
}

function adapter(
	writes: Array<readonly unknown[]>,
): StrategyIoBrokerRuntimeAdapter {
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
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId, state(NOW, NOW)],
	]);

	return {
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

describe("strategy ioBroker daylight window cycle execution", () => {
	it("executes one discharge command through one adapter boundary", async () => {
		const writes: Array<readonly unknown[]> = [];

		const result = await executeStrategyIoBrokerDayDischargeCycle(
			adapter(writes),
			provider(),
			CONFIGURATION,
			MAXIMUM_FORECAST_AGE_MS,
			2_000,
			STRATEGY_INTEGRATION_CONTRACT,
			{ now: NOW },
		);

		expect(result?.createdAt).to.equal(NOW);
		expect(writes).to.deep.equal([[
			STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
			2_000,
			false,
		]]);
	});

	it("writes a safe zero target outside the daylight window", async () => {
		const writes: Array<readonly unknown[]> = [];

		const result = await executeStrategyIoBrokerDayDischargeCycle(
			adapter(writes),
			provider(false),
			CONFIGURATION,
			MAXIMUM_FORECAST_AGE_MS,
			2_000,
			STRATEGY_INTEGRATION_CONTRACT,
			{ now: NOW },
		);

		expect(result?.commandExecution.valueW).to.equal(0);
		expect(writes[0]?.[1]).to.equal(0);
	});

	it("does not write when cycle preparation fails closed", async () => {
		const writes: Array<readonly unknown[]> = [];
		const incompleteAdapter = adapter(writes);
		incompleteAdapter.getForeignObjectAsync = async () => null;

		const result = await executeStrategyIoBrokerDayDischargeCycle(
			incompleteAdapter,
			provider(),
			CONFIGURATION,
			MAXIMUM_FORECAST_AGE_MS,
			2_000,
			STRATEGY_INTEGRATION_CONTRACT,
			{ now: NOW },
		);

		expect(result).to.equal(null);
		expect(writes).to.deep.equal([]);
	});

	it("propagates reader failures unchanged", async () => {
		const expectedError = new Error("ioBroker read failed");
		const failingAdapter = adapter([]);
		failingAdapter.getForeignStateAsync = async () => {
			throw expectedError;
		};
		let actualError: unknown;

		try {
			await executeStrategyIoBrokerDayDischargeCycle(
				failingAdapter,
				provider(),
				CONFIGURATION,
				MAXIMUM_FORECAST_AGE_MS,
				2_000,
				STRATEGY_INTEGRATION_CONTRACT,
				{ now: NOW },
			);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});

	it("propagates writer failures unchanged", async () => {
		const expectedError = new Error("ioBroker write failed");
		const failingAdapter = adapter([]);
		failingAdapter.setForeignStateAsync = async () => {
			throw expectedError;
		};
		let actualError: unknown;

		try {
			await executeStrategyIoBrokerDayDischargeCycle(
				failingAdapter,
				provider(),
				CONFIGURATION,
				MAXIMUM_FORECAST_AGE_MS,
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
