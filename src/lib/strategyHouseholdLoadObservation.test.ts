import { strict as assert } from "node:assert";
import {
	createStrategyHouseholdLoadObservation,
} from "./strategyHouseholdLoadObservation";

describe("strategy household load observation", () => {
	it("derives household load from PV, grid and battery flow", () => {
		const result = createStrategyHouseholdLoadObservation({
			pvPowerW: 5_000,
			gridPowerW: -500,
			batteryPowerW: -2_500,
		});

		assert.equal(result.available, true);
		assert.equal(result.householdPowerW, 2_000);
		assert.equal(result.source, "pv-grid-battery");
	});

	it("includes battery discharge as household supply", () => {
		const result = createStrategyHouseholdLoadObservation({
			pvPowerW: 500,
			gridPowerW: 100,
			batteryPowerW: 900,
		});

		assert.equal(result.available, true);
		assert.equal(result.householdPowerW, 1_500);
	});

	it("fails closed when no actual PV power is available", () => {
		const result = createStrategyHouseholdLoadObservation({
			pvPowerW: null,
			gridPowerW: 250,
			batteryPowerW: 350,
		});

		assert.equal(result.available, false);
		assert.equal(result.householdPowerW, null);
		assert.equal(result.source, "unavailable");
	});

	it("rejects invalid PV observations", () => {
		for (const pvPowerW of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
			const result = createStrategyHouseholdLoadObservation({
				pvPowerW,
				gridPowerW: 0,
				batteryPowerW: 0,
			});

			assert.equal(result.available, false);
		}
	});
});
