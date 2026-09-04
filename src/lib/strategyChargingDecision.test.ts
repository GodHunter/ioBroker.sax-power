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

	it("builds a dynamic SOC corridor from daylight progress", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 70,
			forecastEnergyRemainingWh: 10_000,
			remainingDaylightMs: 5 * HOUR,
			elapsedDaylightMs: 5 * HOUR,
			totalDaylightMs: 10 * HOUR,
		});
		expect(decision.plannedSocPercent).to.be.greaterThan(65);
		expect(decision.plannedSocPercent).to.be.lessThan(70);
		expect(decision.plannedSocLowerPercent).to.equal(decision.plannedSocPercent - 3);
		expect(decision.plannedSocUpperPercent).to.equal(decision.plannedSocPercent + 3);
		expect(decision.socDeviationPercent).to.equal(70 - decision.plannedSocPercent);
	});

	it("increases charging when SOC falls below the dynamic trajectory corridor", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 45,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 5 * HOUR,
			elapsedDaylightMs: 5 * HOUR,
			totalDaylightMs: 10 * HOUR,
		});
		expect(decision.reason).to.equal("trajectory-recovery");
		expect(decision.chargePowerLimitW).to.be.greaterThan(decision.requiredAverageChargePowerW);
		expect(decision.chargePowerLimitW).to.be.at.most(configuration.maximumChargePowerW);
	});

	it("does not trigger trajectory recovery while inside the corridor", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 68,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 5 * HOUR,
			elapsedDaylightMs: 5 * HOUR,
			totalDaylightMs: 10 * HOUR,
		});
		expect(decision.reason).to.equal("forecast-balanced");
	});

	it("keeps trajectory recovery active inside the corridor until the upper boundary is reached", () => {
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 68,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 5 * HOUR,
			elapsedDaylightMs: 5 * HOUR,
			totalDaylightMs: 10 * HOUR,
			previousDecisionReason: "trajectory-recovery",
		});
		expect(decision.reason).to.equal("trajectory-recovery");
		expect(decision.chargePowerLimitW).to.be.greaterThan(decision.requiredAverageChargePowerW);
	});

	it("leaves trajectory recovery after the upper corridor boundary is reached", () => {
		const reference = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: 68,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 5 * HOUR,
			elapsedDaylightMs: 5 * HOUR,
			totalDaylightMs: 10 * HOUR,
		});
		const decision = createStrategyChargingDecision(configuration, {
			stateOfChargePercent: reference.plannedSocUpperPercent,
			forecastEnergyRemainingWh: 20_000,
			remainingDaylightMs: 5 * HOUR,
			elapsedDaylightMs: 5 * HOUR,
			totalDaylightMs: 10 * HOUR,
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
			stateOfChargePercent: 60,
			forecastEnergyRemainingWh: 10_000,
			remainingDaylightMs: 2 * HOUR,
		});
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
