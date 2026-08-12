import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	prepareStrategyDayDischargeCycleWithDaylightWindow,
	type StrategyDaylightWindowProvider,
} from "./strategyDaylightWindowCyclePreparation";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import type { StrategyStateReader } from "./strategyStateResolver";

const NOW = Date.parse("2026-08-12T10:00:00.000Z");
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	batteryCapacityWh: 10_000,
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 4_000,
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

function prepare(
	daylightWindowProvider: StrategyDaylightWindowProvider = provider(),
) {
	return prepareStrategyDayDischargeCycleWithDaylightWindow(
		reader(),
		daylightWindowProvider,
		CONFIGURATION,
		60_000,
		2_000,
		undefined,
		{ now: NOW },
	);
}

describe("strategy daylight window cycle preparation", () => {
	it("prepares an allowed cycle from provider boundaries", async () => {
		let requestedTimestamp: number | undefined;
		const result = await prepare({
			async getDaylightWindow(cycleTimestamp) {
				requestedTimestamp = cycleTimestamp;
				return {
					startsAt: NOW - 1_000,
					endsAt: NOW + 10 * 60 * 60 * 1_000,
				};
			},
		});

		expect(requestedTimestamp).to.equal(NOW);
		expect(result?.createdAt).to.equal(NOW);
		expect(result?.cyclePreparation.createdAt).to.equal(NOW);
		expect(result?.cyclePreparation.cyclePlan.commandPlan.valueW).to.equal(
			2_000,
		);
		expect(
			result?.cyclePreparation.cyclePlan.evaluation.daylightWindow.startsAt,
		).to.equal(result?.daylightWindow.startsAt);
	});

	it("prepares an explicit safe stop outside provider boundaries", async () => {
		const result = await prepare(provider(NOW + 1, NOW + 2_000));

		expect(
			result?.cyclePreparation.cyclePlan.evaluation.windowGate.reason,
		).to.equal("before-daylight-window");
		expect(result?.cyclePreparation.cyclePlan.commandPlan.valueW).to.equal(0);
	});

	it("fails closed when the provider has no boundaries", async () => {
		expect(await prepare({
			async getDaylightWindow() {
				return null;
			},
		})).to.equal(null);
	});

	it("fails closed for non-finite provider boundaries", async () => {
		expect(await prepare(provider(Number.NaN, NOW + 1_000))).to.equal(null);
		expect(await prepare(provider(NOW - 1_000, Number.POSITIVE_INFINITY)))
			.to.equal(null);
	});

	it("fails closed for empty or reversed provider boundaries", async () => {
		expect(await prepare(provider(NOW, NOW))).to.equal(null);
		expect(await prepare(provider(NOW + 1, NOW))).to.equal(null);
	});

	it("fails closed before calling the provider for an invalid cycle time", async () => {
		let providerCalled = false;
		const result = await prepareStrategyDayDischargeCycleWithDaylightWindow(
			reader(),
			{
				async getDaylightWindow() {
					providerCalled = true;
					return { startsAt: NOW - 1_000, endsAt: NOW + 1_000 };
				},
			},
			CONFIGURATION,
			60_000,
			2_000,
			undefined,
			{ now: Number.NaN },
		);

		expect(result).to.equal(null);
		expect(providerCalled).to.equal(false);
	});

	it("propagates technical provider failures", async () => {
		const failure = new Error("daylight provider failed");
		let caught: unknown;

		try {
			await prepare({
				async getDaylightWindow() {
					throw failure;
				},
			});
		} catch (error) {
			caught = error;
		}

		expect(caught).to.equal(failure);
	});
});
