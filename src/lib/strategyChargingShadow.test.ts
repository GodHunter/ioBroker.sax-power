import { expect } from "chai";

import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyChargingShadowDecision,
} from "./strategyChargingShadow";

const configuration: StrategyConfiguration = Object.freeze({
	batteryModelId: "home-plus-7.7",
	minimumStateOfChargePercent: 30,
	maximumStateOfChargePercent: 100,
	maximumChargePowerW: 4600,
	maximumDischargePowerW: 4600,
	pvForecastReserveWh: 0,
});

describe("strategy charging shadow", () => {
	it("never authorizes a register 44 write", () => {
		const decision = createStrategyChargingShadowDecision(
			configuration,
			{
				stateOfChargePercent: 50,
				forecastEnergyRemainingWh: 10_000,
				remainingDaylightMs: 5 * 60 * 60 * 1000,
			},
		);

		expect(decision.wouldWriteRegister44).to.equal(false);
	});

	it("calculates the remaining battery energy from usable capacity", () => {
		const decision = createStrategyChargingShadowDecision(
			configuration,
			{
				stateOfChargePercent: 50,
				forecastEnergyRemainingWh: 10_000,
				remainingDaylightMs: 5 * 60 * 60 * 1000,
			},
		);

		expect(decision.usableCapacityWh).to.equal(7000);
		expect(decision.energyRequiredWh).to.equal(3500);
	});

	it("spreads charging across the remaining daylight when forecast is sufficient", () => {
		const decision = createStrategyChargingShadowDecision(
			configuration,
			{
				stateOfChargePercent: 50,
				forecastEnergyRemainingWh: 10_000,
				remainingDaylightMs: 5 * 60 * 60 * 1000,
			},
		);

		expect(decision.reason).to.equal("forecast-balanced");
		expect(decision.requiredAverageChargePowerW).to.equal(700);
		expect(decision.shadowChargePowerLimitW).to.equal(875);
	});

	it("uses maximum charging power when the remaining forecast cannot fill the battery", () => {
		const decision = createStrategyChargingShadowDecision(
			configuration,
			{
				stateOfChargePercent: 40,
				forecastEnergyRemainingWh: 2000,
				remainingDaylightMs: 5 * 60 * 60 * 1000,
			},
		);

		expect(decision.reason).to.equal("forecast-insufficient");
		expect(decision.shadowChargePowerLimitW).to.equal(4600);
	});

	it("applies the configured PV reserve before assessing forecast coverage", () => {
		const decision = createStrategyChargingShadowDecision(
			{
				...configuration,
				pvForecastReserveWh: 6000,
			},
			{
				stateOfChargePercent: 50,
				forecastEnergyRemainingWh: 9000,
				remainingDaylightMs: 5 * 60 * 60 * 1000,
			},
		);

		expect(decision.usableForecastEnergyWh).to.equal(3000);
		expect(decision.reason).to.equal("forecast-insufficient");
		expect(decision.shadowChargePowerLimitW).to.equal(4600);
	});

	it("returns zero charging power once the target SOC is reached", () => {
		const decision = createStrategyChargingShadowDecision(
			configuration,
			{
				stateOfChargePercent: 100,
				forecastEnergyRemainingWh: 12_000,
				remainingDaylightMs: 6 * 60 * 60 * 1000,
			},
		);

		expect(decision.reason).to.equal("target-soc-reached");
		expect(decision.shadowChargePowerLimitW).to.equal(0);
	});

	it("fails closed for invalid observations", () => {
		const decision = createStrategyChargingShadowDecision(
			configuration,
			{
				stateOfChargePercent: Number.NaN,
				forecastEnergyRemainingWh: 10_000,
				remainingDaylightMs: 5 * 60 * 60 * 1000,
			},
		);

		expect(decision.valid).to.equal(false);
		expect(decision.reason).to.equal("invalid-input");
		expect(decision.shadowChargePowerLimitW).to.equal(0);
		expect(decision.wouldWriteRegister44).to.equal(false);
	});
});
