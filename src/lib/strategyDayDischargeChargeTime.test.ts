import { expect } from "chai";

import type { StrategyConfiguration } from "./strategyConfiguration";
import { assessStrategyDayDischargeChargeTime } from "./strategyDayDischargeChargeTime";
import type { StrategyPvEnergyBudget } from "./strategyPvEnergyBudget";
import type { StrategySafetyEnvelope } from "./strategySafetyEnvelope";

const CREATED_AT = 1_786_464_123_000;
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-5.8",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 2_500,
	maximumDischargePowerW: 4_000,
	pvForecastReserveWh: 500,
};

function safetyEnvelope(): StrategySafetyEnvelope {
	return {
		createdAt: CREATED_AT,
		stateOfChargePercent: 60,
		storedEnergyWh: 3_120,
		minimumStoredEnergyWh: 1_040,
		maximumStoredEnergyWh: 4_680,
		availableChargeEnergyWh: 1_560,
		availableDischargeEnergyWh: 2_080,
		maximumChargePowerW: 4_000,
		maximumDischargePowerW: 4_000,
	};
}

function pvEnergyBudget(
	permittedDayDischargeEnergyWh = 1_040,
): StrategyPvEnergyBudget {
	return {
		createdAt: CREATED_AT,
		forecastEnergyWh: 4_000,
		reserveEnergyWh: 500,
		usableForecastEnergyWh: 3_500,
		requiredChargeEnergyWh: 1_560,
		forecastSurplusEnergyWh: 1_940,
		permittedDayDischargeEnergyWh,
	};
}

describe("strategy day discharge charge time", () => {
	it("checks recharge time from the SOC projected after permitted discharge", () => {
		const result = assessStrategyDayDischargeChargeTime(
			safetyEnvelope(),
			pvEnergyBudget(),
			CONFIGURATION,
			CREATED_AT + 4_000_000,
		);

		expect(result?.projectedStateOfChargePercent).to.equal(40);
		expect(result?.chargeDurationEstimate.requiredChargeEnergyWh)
			.to.equal(2_600);
		expect(result?.chargeDurationEstimate.estimatedDurationSeconds)
			.to.equal(3_744);
		expect(result?.remainingDaylightSeconds).to.equal(4_000);
		expect(result?.sufficient).to.equal(true);
	});

	it("blocks when the projected recharge cannot finish before sunset", () => {
		const result = assessStrategyDayDischargeChargeTime(
			safetyEnvelope(),
			pvEnergyBudget(),
			CONFIGURATION,
			CREATED_AT + 3_743_000,
		);

		expect(result?.remainingDaylightSeconds).to.equal(3_743);
		expect(result?.chargeDurationEstimate.estimatedDurationSeconds)
			.to.equal(3_744);
		expect(result?.sufficient).to.equal(false);
	});

	it("uses zero remaining time at or after sunset", () => {
		for (const daylightWindowEndsAt of [CREATED_AT, CREATED_AT - 1]) {
			const result = assessStrategyDayDischargeChargeTime(
				safetyEnvelope(),
				pvEnergyBudget(0),
				CONFIGURATION,
				daylightWindowEndsAt,
			);

			expect(result?.remainingDaylightSeconds).to.equal(0);
			expect(result?.sufficient).to.equal(false);
		}
	});

	it("clamps the projection at the configured minimum SOC", () => {
		const result = assessStrategyDayDischargeChargeTime(
			safetyEnvelope(),
			pvEnergyBudget(10_000),
			CONFIGURATION,
			CREATED_AT + 10_000_000,
		);

		expect(result?.projectedStateOfChargePercent).to.equal(20);
	});

	it("fails closed for mismatched timestamps and invalid boundaries", () => {
		expect(assessStrategyDayDischargeChargeTime(
			safetyEnvelope(),
			{ ...pvEnergyBudget(), createdAt: CREATED_AT + 1 },
			CONFIGURATION,
			CREATED_AT + 4_000_000,
		)).to.equal(null);
		expect(assessStrategyDayDischargeChargeTime(
			safetyEnvelope(),
			pvEnergyBudget(Number.NaN),
			CONFIGURATION,
			CREATED_AT + 4_000_000,
		)).to.equal(null);
		expect(assessStrategyDayDischargeChargeTime(
			safetyEnvelope(),
			pvEnergyBudget(),
			CONFIGURATION,
			Number.NaN,
		)).to.equal(null);
	});

	it("returns an immutable assessment and nested estimate", () => {
		const result = assessStrategyDayDischargeChargeTime(
			safetyEnvelope(),
			pvEnergyBudget(),
			CONFIGURATION,
			CREATED_AT + 4_000_000,
		);

		expect(Object.isFrozen(result)).to.equal(true);
		expect(Object.isFrozen(result?.chargeDurationEstimate)).to.equal(true);
		expect(Object.isFrozen(result?.chargeDurationEstimate.segments))
			.to.equal(true);
	});
});
