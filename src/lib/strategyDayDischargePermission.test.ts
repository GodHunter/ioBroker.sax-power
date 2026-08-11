import { expect } from "chai";

import {
	createStrategyDayDischargePermission,
} from "./strategyDayDischargePermission";
import type { StrategyPvEnergyBudget } from "./strategyPvEnergyBudget";
import type { StrategyPvForecastFreshness } from "./strategyPvForecastFreshness";
import type { StrategySafetyEnvelope } from "./strategySafetyEnvelope";

const CREATED_AT = 1_786_464_123_000;

function safetyEnvelope(
	availableDischargeEnergyWh: number = 4_000,
	maximumDischargePowerW: number = 3_000,
): StrategySafetyEnvelope {
	return {
		createdAt: CREATED_AT,
		stateOfChargePercent: 60,
		storedEnergyWh: 6_000,
		minimumStoredEnergyWh: 2_000,
		maximumStoredEnergyWh: 9_000,
		availableChargeEnergyWh: 3_000,
		availableDischargeEnergyWh,
		maximumChargePowerW: 5_000,
		maximumDischargePowerW,
	};
}

function pvEnergyBudget(
	permittedDayDischargeEnergyWh: number = 2_500,
): StrategyPvEnergyBudget {
	return {
		createdAt: CREATED_AT,
		forecastEnergyWh: 8_000,
		reserveEnergyWh: 1_500,
		usableForecastEnergyWh: 6_500,
		requiredChargeEnergyWh: 3_000,
		forecastSurplusEnergyWh: 3_500,
		permittedDayDischargeEnergyWh,
	};
}

function freshness(fresh: boolean = true): StrategyPvForecastFreshness {
	return {
		createdAt: CREATED_AT,
		lastUpdatedTimestamp: CREATED_AT - 60_000,
		ageMs: 60_000,
		maximumAgeMs: 15 * 60_000,
		fresh,
	};
}

describe("strategy day discharge permission", () => {
	it("allows discharge within the PV budget and safety envelope", () => {
		const result = createStrategyDayDischargePermission(
			safetyEnvelope(),
			pvEnergyBudget(),
			freshness(),
		);

		expect(result).to.deep.equal({
			createdAt: CREATED_AT,
			allowed: true,
			reason: "discharge-allowed",
			permittedDischargeEnergyWh: 2_500,
			maximumDischargePowerW: 3_000,
		});
		expect(Object.isFrozen(result)).to.equal(true);
	});

	it("caps energy at the safety envelope", () => {
		const result = createStrategyDayDischargePermission(
			safetyEnvelope(1_000),
			pvEnergyBudget(2_500),
			freshness(),
		);

		expect(result?.allowed).to.equal(true);
		expect(result?.permittedDischargeEnergyWh).to.equal(1_000);
	});

	it("denies discharge for a stale forecast", () => {
		const result = createStrategyDayDischargePermission(
			safetyEnvelope(),
			pvEnergyBudget(),
			freshness(false),
		);

		expect(result).to.include({
			allowed: false,
			reason: "forecast-stale",
			permittedDischargeEnergyWh: 0,
			maximumDischargePowerW: 0,
		});
	});

	it("denies discharge at the minimum state of charge", () => {
		const result = createStrategyDayDischargePermission(
			safetyEnvelope(0, 0),
			pvEnergyBudget(0),
			freshness(),
		);

		expect(result).to.include({
			allowed: false,
			reason: "minimum-state-of-charge-reached",
		});
	});

	it("denies discharge without sufficient PV energy", () => {
		const result = createStrategyDayDischargePermission(
			safetyEnvelope(),
			pvEnergyBudget(0),
			freshness(),
		);

		expect(result).to.include({
			allowed: false,
			reason: "insufficient-pv-energy",
		});
	});

	it("fails closed when inputs were created at different times", () => {
		const budget = { ...pvEnergyBudget(), createdAt: CREATED_AT + 1 };

		expect(createStrategyDayDischargePermission(
			safetyEnvelope(),
			budget,
			freshness(),
		)).to.equal(null);
	});

	it("fails closed for invalid limits", () => {
		expect(createStrategyDayDischargePermission(
			safetyEnvelope(-1),
			pvEnergyBudget(),
			freshness(),
		)).to.equal(null);

		expect(createStrategyDayDischargePermission(
			safetyEnvelope(),
			pvEnergyBudget(Number.NaN),
			freshness(),
		)).to.equal(null);
	});
});
