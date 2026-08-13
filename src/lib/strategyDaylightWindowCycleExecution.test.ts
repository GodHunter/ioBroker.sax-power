import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyDayDischargeAvailabilityAdapter } from "./strategyDayDischargeAvailabilityStates";
import { executeStrategyDayDischargeCycleWithDaylightWindow } from "./strategyDaylightWindowCycleExecution";
import type { StrategyDaylightWindowProvider } from "./strategyDaylightWindowCyclePreparation";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import type { StrategyStateReader } from "./strategyStateResolver";

const NOW = Date.parse("2026-08-12T10:00:00.000Z");
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 3_500,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

function reader(): StrategyStateReader {
	const values: Record<string, number> = {
		[STRATEGY_INTEGRATION_CONTRACT.modbus.operatingState.stateId]: 1,
		[STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId]: 60,
		[STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower.stateId]: 0,
		[STRATEGY_INTEGRATION_CONTRACT.modbus.smartMeterPower.stateId]: 0,
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyNowUntilEndOfDay.stateId]: 8_000,
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyToday.stateId]: 10_000,
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyTomorrow.stateId]: 12_000,
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId]: NOW - 1_000,
	};

	return {
		async getForeignObjectAsync(id) {
			return {
				_id: id,
				type: "state",
				common: {
					name: id,
					type: "number",
					role: "value",
					read: true,
					write: false,
				},
				native: {},
			};
		},
		async getForeignStateAsync(id) {
			if (!Object.hasOwn(values, id)) {
				return null;
			}

			return {
				val: values[id],
				ack: true,
				ts: NOW - 1_000,
				lc: NOW - 1_000,
				from: "system.adapter.strategy-test.0",
				q: 0,
			};
		},
	};
}

function provider(
	startsAt = NOW - 1_000,
	endsAt = NOW + 10 * 60 * 60 * 1_000,
): StrategyDaylightWindowProvider {
	return {
		async getDaylightWindow() {
			return { startsAt, endsAt };
		},
	};
}

function statusAdapter() {
	const states: Array<readonly unknown[]> = [];
	const adapter: StrategyDayDischargeAvailabilityAdapter = {
		async extendObjectAsync() {},
		async setStateAsync(stateId, value) {
			states.push([stateId, value.val, value.ack]);
		},
	};

	return { adapter, states };
}

function execute(
	daylightWindowProvider: StrategyDaylightWindowProvider = provider(),
	adapter: StrategyDayDischargeAvailabilityAdapter = statusAdapter().adapter,
) {
	return executeStrategyDayDischargeCycleWithDaylightWindow(
		reader(),
		daylightWindowProvider,
		adapter,
		CONFIGURATION,
		60_000,
		2_000,
		undefined,
		{ now: NOW },
	);
}

describe("strategy daylight window cycle execution", () => {
	it("publishes available day power without a Modbus discharge write", async () => {
		const { adapter, states } = statusAdapter();
		const result = await execute(provider(), adapter);

		expect(states).to.deep.include([
			"strategy.dayDischarge.availablePowerW", 2_000, true,
		]);
		expect(result?.createdAt).to.equal(NOW);
		expect(result?.availability.allowed).to.equal(true);
		expect(result?.availability.availablePowerW).to.equal(2_000);
	});

	it("publishes zero availability outside the daylight window", async () => {
		const { adapter, states } = statusAdapter();
		const result = await execute(
			provider(NOW + 1, NOW + 2_000),
			adapter,
		);

		expect(states).to.deep.include([
			"strategy.dayDischarge.availablePowerW", 0, true,
		]);
		expect(result?.availability.reason).to.equal("before-daylight-window");
	});

	it("fails closed without writing when cycle preparation is unavailable", async () => {
		const { adapter, states } = statusAdapter();
		const result = await execute({
			async getDaylightWindow() {
				return null;
			},
		}, adapter);

		expect(result).to.equal(null);
		expect(states).to.deep.equal([]);
	});

	it("propagates technical daylight provider failures without writing", async () => {
		const expectedError = new Error("daylight provider failed");
		const { adapter, states } = statusAdapter();
		let actualError: unknown;

		try {
			await execute({
				async getDaylightWindow() {
					throw expectedError;
				},
			}, adapter);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
		expect(states).to.deep.equal([]);
	});

	it("propagates technical reader failures without writing", async () => {
		const expectedError = new Error("state reader failed");
		const { adapter, states } = statusAdapter();
		let actualError: unknown;

		try {
			await executeStrategyDayDischargeCycleWithDaylightWindow(
				{
					async getForeignObjectAsync() {
						throw expectedError;
					},
					async getForeignStateAsync() {
						return null;
					},
				},
				provider(),
				adapter,
				CONFIGURATION,
				60_000,
				2_000,
				undefined,
				{ now: NOW },
			);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
		expect(states).to.deep.equal([]);
	});

	it("propagates technical status publishing failures", async () => {
		const expectedError = new Error("status write failed");
		let actualError: unknown;

		try {
			await execute(provider(), {
				async extendObjectAsync() {},
				async setStateAsync() {
					throw expectedError;
				},
			});
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});
});
