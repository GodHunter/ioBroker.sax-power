import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { calculateStrategyOpportunitySocLift } from "./strategyChargeOpportunity";

describe("charge opportunity SOC lift", () => {
	const base = { forecastMarginWh: -2000, requiredEnergyWh: 3000, sustainedExportPowerW: 1200, householdLearningEstablished: true };
	it("does not lift without established household learning", () => {
		assert.equal(calculateStrategyOpportunitySocLift({ ...base, householdLearningEstablished: false }), 0);
	});
	it("does not lift when real export is missing", () => {
		assert.equal(calculateStrategyOpportunitySocLift({ ...base, sustainedExportPowerW: 0 }), 0);
	});
	it("keeps comfortable forecast unchanged", () => {
		assert.equal(calculateStrategyOpportunitySocLift({ ...base, forecastMarginWh: 5000 }), 0);
	});
	it("lifts conservatively for a scarce forecast with export", () => {
		const lift = calculateStrategyOpportunitySocLift(base);
		assert.ok(lift > 0 && lift <= 14);
	});
	it("never exceeds 14 percentage points", () => {
		assert.equal(calculateStrategyOpportunitySocLift({ ...base, forecastMarginWh: -99999, sustainedExportPowerW: 10000 }), 14);
	});
	it("rejects invalid inputs", () => {
		assert.equal(calculateStrategyOpportunitySocLift({ ...base, forecastMarginWh: Number.NaN }), 0);
	});
});
