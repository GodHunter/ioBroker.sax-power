import { expect } from "chai";

import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import { assessStrategyPvForecastFreshness } from "./strategyPvForecastFreshness";

const CREATED_AT = 1_786_464_123_000;

function snapshot(lastUpdatedTimestamp: number): StrategyInputSnapshot {
	return {
		createdAt: CREATED_AT,
		modbus: {
			operatingState: 2,
			stateOfChargePercent: 60,
			batteryPowerW: 0,
			smartMeterPowerW: 0,
		},
		pvForecast: {
			energyNowUntilEndOfDayWh: 8_000,
			energyTodayWh: 12_000,
			energyTomorrowWh: 14_000,
			lastUpdatedTimestamp,
		},
	};
}

describe("strategy PV forecast freshness", () => {
	it("marks a forecast within the maximum age as fresh", () => {
		const result = assessStrategyPvForecastFreshness(
			snapshot(CREATED_AT - 5 * 60_000),
			15 * 60_000,
		);

		expect(result).to.deep.equal({
			createdAt: CREATED_AT,
			lastUpdatedTimestamp: CREATED_AT - 5 * 60_000,
			ageMs: 5 * 60_000,
			maximumAgeMs: 15 * 60_000,
			fresh: true,
		});
		expect(Object.isFrozen(result)).to.equal(true);
	});

	it("accepts a forecast exactly at the maximum age", () => {
		const result = assessStrategyPvForecastFreshness(
			snapshot(CREATED_AT - 15 * 60_000),
			15 * 60_000,
		);

		expect(result?.fresh).to.equal(true);
	});

	it("marks an older forecast as stale", () => {
		const result = assessStrategyPvForecastFreshness(
			snapshot(CREATED_AT - 15 * 60_000 - 1),
			15 * 60_000,
		);

		expect(result?.fresh).to.equal(false);
	});

	it("fails closed for a future forecast timestamp", () => {
		expect(assessStrategyPvForecastFreshness(
			snapshot(CREATED_AT + 1),
			15 * 60_000,
		)).to.equal(null);
	});

	it("fails closed for invalid timestamps", () => {
		expect(assessStrategyPvForecastFreshness(
			snapshot(Number.NaN),
			15 * 60_000,
		)).to.equal(null);

		const invalidSnapshot = {
			...snapshot(CREATED_AT),
			createdAt: Number.NaN,
		};

		expect(assessStrategyPvForecastFreshness(
			invalidSnapshot,
			15 * 60_000,
		)).to.equal(null);
	});

	it("fails closed for an invalid maximum age", () => {
		expect(assessStrategyPvForecastFreshness(
			snapshot(CREATED_AT),
			-1,
		)).to.equal(null);

		expect(assessStrategyPvForecastFreshness(
			snapshot(CREATED_AT),
			Number.POSITIVE_INFINITY,
		)).to.equal(null);
	});
});
