import { expect } from "chai";

import { createStrategyPlanningDiagnostics } from "./strategyPlanning";

describe("strategy planning diagnostics", () => {
	it("shows household-aware battery-available forecast without applying it", () => {
		const result = createStrategyPlanningDiagnostics({
			forecastEnergyRemainingWh: 8_000,
			householdEnergyRemainingWh: 2_500,
			forecastReserveWh: 500,
			householdLearningConfidence: "learning",
		});

		expect(result).to.deep.equal({
			forecastEnergyRemainingWh: 8_000,
			householdEnergyRemainingWh: 2_500,
			batteryAvailableEnergyWh: 5_000,
			householdLearningApplied: false,
			householdLearningConfidence: "learning",
		});
		expect(Object.isFrozen(result)).to.equal(true);
	});

	it("never exposes negative battery-available energy", () => {
		const result = createStrategyPlanningDiagnostics({
			forecastEnergyRemainingWh: 1_000,
			householdEnergyRemainingWh: 900,
			forecastReserveWh: 500,
			householdLearningConfidence: "established",
		});

		expect(result.batteryAvailableEnergyWh).to.equal(0);
		expect(result.householdLearningApplied).to.equal(false);
	});

	it("keeps an unavailable forecast unavailable", () => {
		const result = createStrategyPlanningDiagnostics({
			forecastEnergyRemainingWh: null,
			householdEnergyRemainingWh: 1_000,
			forecastReserveWh: 500,
			householdLearningConfidence: "none",
		});

		expect(result.forecastEnergyRemainingWh).to.equal(null);
		expect(result.batteryAvailableEnergyWh).to.equal(null);
	});
});
