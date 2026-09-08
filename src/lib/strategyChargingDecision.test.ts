import { expect } from "chai";

import type { StrategyConfiguration } from "./strategyConfiguration";
import { createStrategyChargingDecision } from "./strategyChargingDecision";

const configuration: StrategyConfiguration = Object.freeze({
	batteryModelId: "home-plus-7.7",
	minimumStateOfChargePercent: 30,
	maximumStateOfChargePercent: 100,
	maximumChargePowerW: 4600,
	maximumDischargePowerW: 4600,
	pvForecastReserveWh: 0,
});

const HOUR = 60 * 60 * 1000;

describe("strategy charging decision", () => {
	it("calculates the remaining battery energy from usable capacity", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 50,
			forecastEnergyRemainingWh: 10_000,
			remainingDaylightMs: 5 * HOUR,
		});
		expect(decision.usableCapacityWh).to.equal(7000);
		expect(decision.energyRequiredWh).to.equal(3500);
	});

	it("plans charging against a target deadline one hour before sunset", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 50,
			forecastEnergyRemainingWh: 10_000,
			remainingDaylightMs: 5 * HOUR,
		});
		expect(decision.reason).to.equal("forecast-balanced");
		expect(decision.targetDeadlineRemainingMs).to.equal(4 * HOUR);
		expect(decision.requiredAverageChargePowerW).to.equal(875);
		expect(decision.chargePowerLimitW).to.equal(1094);
	});

	it("uses maximum charging power when remaining forecast cannot fill the battery", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 40,
			forecastEnergyRemainingWh: 2000,
			remainingDaylightMs: 5 * HOUR,
		});
		expect(decision.reason).to.equal("forecast-insufficient");
		expect(decision.chargePowerLimitW).to.equal(4600);
	});

	it("subtracts learned household energy and configured reserve", () => {
		const decision = createStrategyChargingDecision(
			{ ...configuration, pvForecastReserveWh: 500 },
			{
				stateOfChargePercent: 50,
				forecastEnergyRemainingWh: 6000,
				householdEnergyRemainingWh: 2000,
				remainingDaylightMs: 5 * HOUR,
			},
		);
		expect(decision.usableForecastEnergyWh).to.equal(3500);
		expect(decision.forecastMarginWh).to.equal(0);
	});

	it("uses a late-rising comfort trajectory instead of holding the plan at minimum", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 55,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 5 * HOUR,
			elapsedDaylightMs: 5 * HOUR,
			totalDaylightMs: 10 * HOUR,
		});
		// Five elapsed hours and four hours to the target deadline give progress
		// 5 / 9. Squared comfort progress moves the plan to about 51.6 % instead
		// of either front-loading it or leaving it stuck at the 30 % minimum.
		expect(decision.plannedSocPercent).to.be.closeTo(51.604938, 0.000001);
		expect(decision.plannedSocLowerPercent).to.be.closeTo(48.604938, 0.000001);
		expect(decision.plannedSocUpperPercent).to.be.closeTo(54.604938, 0.000001);
		expect(decision.reason).to.equal("forecast-balanced");
	});

	it("keeps the hard reachability floor when daylight progress is unavailable", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 60,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 3 * HOUR,
		});
		expect(decision.plannedSocPercent).to.equal(30);
		expect(decision.plannedSocLowerPercent).to.equal(30);
		expect(decision.plannedSocUpperPercent).to.equal(33);
	});

	it("lets the hard reachability floor overtake the comfort trajectory near deadline", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 60,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 2 * HOUR,
		});
		// One hour remains to the target deadline. The reachability floor reserves
		// both normal charging headroom and recovery headroom:
		// 4600 / 1.25 / 1.15 = 3200 W.
		expect(decision.plannedSocPercent).to.be.closeTo(54.285714, 0.000001);
		expect(decision.plannedSocLowerPercent).to.be.closeTo(51.285714, 0.000001);
		expect(decision.plannedSocUpperPercent).to.be.closeTo(57.285714, 0.000001);
	});

	it("increases charging when SOC falls below the hybrid trajectory corridor", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 50,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 2 * HOUR,
		});
		expect(decision.reason).to.equal("trajectory-recovery");
		expect(decision.chargePowerLimitW).to.be.greaterThan(decision.requiredAverageChargePowerW);
		expect(decision.chargePowerLimitW).to.be.at.most(configuration.maximumChargePowerW);
	});

	it("does not trigger trajectory recovery while inside the hybrid corridor", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 55,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 2 * HOUR,
		});
		expect(decision.reason).to.equal("forecast-balanced");
	});

	it("keeps trajectory recovery active inside the corridor until the upper boundary is reached", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 55,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 2 * HOUR,
			previousDecisionReason: "trajectory-recovery",
		});
		expect(decision.reason).to.equal("trajectory-recovery");
		expect(decision.chargePowerLimitW).to.be.greaterThan(decision.requiredAverageChargePowerW);
	});

	it("leaves trajectory recovery after the upper corridor boundary is reached", () => {
		const reference = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 55,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 2 * HOUR,
		});
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: reference.plannedSocUpperPercent,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 2 * HOUR,
			previousDecisionReason: "trajectory-recovery",
		});
		expect(decision.reason).to.equal("forecast-balanced");
	});

	it("forecast insufficiency overrides trajectory recovery hysteresis", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 50,
			forecastEnergyRemainingWh: 1000,
			remainingDaylightMs: 5 * HOUR,
			elapsedDaylightMs: 5 * HOUR,
			totalDaylightMs: 10 * HOUR,
			previousDecisionReason: "trajectory-recovery",
		});
		expect(decision.reason).to.equal("forecast-insufficient");
		expect(decision.chargePowerLimitW).to.equal(configuration.maximumChargePowerW);
	});

	it("forces maximum charge power once the completion deadline is reached", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 92,
			forecastEnergyRemainingWh: 5000,
			remainingDaylightMs: 45 * 60 * 1000,
			elapsedDaylightMs: 9.25 * HOUR,
			totalDaylightMs: 10 * HOUR,
		});
		expect(decision.reason).to.equal("target-deadline-recovery");
		expect(decision.chargePowerLimitW).to.equal(configuration.maximumChargePowerW);
		expect(decision.targetDeadlineRemainingMs).to.equal(60_000);
	});

	it("forces deadline recovery when the required deadline power reaches the technical limit", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 45,
			forecastEnergyRemainingWh: 10_000,
			remainingDaylightMs: 2 * HOUR,
		});
		expect(decision.requiredAverageChargePowerW).to.equal(3850);
		expect(decision.reason).to.equal("target-deadline-recovery");
		expect(decision.chargePowerLimitW).to.equal(configuration.maximumChargePowerW);
	});

	it("returns zero charging power once target SOC is reached", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 100,
			forecastEnergyRemainingWh: 12_000,
			remainingDaylightMs: 6 * HOUR,
			elapsedDaylightMs: 4 * HOUR,
			totalDaylightMs: 10 * HOUR,
		});
		expect(decision.reason).to.equal("target-soc-reached");
		expect(decision.chargePowerLimitW).to.equal(0);
	});

	it("maintains target SOC with gentle refill after target was reached", () => {
		const decision = createStrategyChargingDecision(
			{ ...configuration, maximumChargePowerW: 3500 },
			{
				stateOfChargePercent: 99,
				forecastEnergyRemainingWh: 5000,
				remainingDaylightMs: 45 * 60 * 1000,
				previousDecisionReason: "target-soc-reached",
			},
		);
		expect(decision.reason).to.equal("target-soc-maintenance");
		expect(decision.chargePowerLimitW).to.equal(700);
	});

	it("keeps target maintenance active down to the two percentage point band", () => {
		const decision = createStrategyChargingDecision(
			{ ...configuration, maximumChargePowerW: 3500 },
			{
				stateOfChargePercent: 98,
				forecastEnergyRemainingWh: 5000,
				remainingDaylightMs: 45 * 60 * 1000,
				previousDecisionReason: "target-soc-maintenance",
			},
		);
		expect(decision.reason).to.equal("target-soc-maintenance");
		expect(decision.chargePowerLimitW).to.equal(700);
	});

	it("returns to normal strategy below the target maintenance band", () => {
		const decision = createStrategyChargingDecision(
			{ ...configuration, maximumChargePowerW: 3500 },
			{
				stateOfChargePercent: 97,
				forecastEnergyRemainingWh: 5000,
				remainingDaylightMs: 45 * 60 * 1000,
				previousDecisionReason: "target-soc-maintenance",
			},
		);
		expect(decision.reason).to.not.equal("target-soc-maintenance");
	});

	it("fails closed for invalid observations", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: Number.NaN,
			forecastEnergyRemainingWh: 10_000,
			remainingDaylightMs: 5 * HOUR,
		});
		expect(decision.valid).to.equal(false);
		expect(decision.reason).to.equal("invalid-input");
		expect(decision.chargePowerLimitW).to.equal(0);
	});
});
