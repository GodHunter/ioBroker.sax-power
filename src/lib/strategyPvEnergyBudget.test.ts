import { expect } from "chai";

import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import { createStrategyPvEnergyBudget } from "./strategyPvEnergyBudget";
import type { StrategySafetyEnvelope } from "./strategySafetyEnvelope";

const CREATED_AT = 1_786_464_123_000;

const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	batteryCapacityWh: 10_000,
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 5_000,
	maximumDischargePowerW: 4_000,
	pvForecastReserveWh: 1_500,
};

function snapshot(forecastEnergyWh: number): StrategyInputSnapshot {
	return {
		createdAt: CREATED_AT,
		modbus: {
			operatingState: 2,
			stateOfChargePercent: 60,
			batteryPowerW: 0,
			smartMeterPowerW: 0,
		},
		pvForecast: {
			energyNowUntilEndOfDayWh: forecastEnergyWh,
			energyTodayWh: 12_000,
			energyTomorrowWh: 14_000,
			lastUpdatedTimestamp: CREATED_AT - 60_000,
		},
	};
}

function safetyEnvelope(
	availableChargeEnergyWh: number,
	availableDischargeEnergyWh: number = 4_000,
): StrategySafetyEnvelope {
	return {
		createdAt: CREATED_AT,
		stateOfChargePercent: 60,
		storedEnergyWh: 6_000,
		minimumStoredEnergyWh: 2_000,
		maximumStoredEnergyWh: 9_000,
		availableChargeEnergyWh,
		availableDischargeEnergyWh,
		maximumChargePowerW: 5_000,
		maximumDischargePowerW: 4_000,
	};
}

describe("strategy PV energy budget", () => {
	it("permits only forecast energy left after reserve and recharging", () => {
		const result = createStrategyPvEnergyBudget(
			snapshot(8_000),
			CONFIGURATION,
			safetyEnvelope(3_000),
		);

		expect(result).to.deep.equal({
			createdAt: CREATED_AT,
			forecastEnergyWh: 8_000,
			reserveEnergyWh: 1_500,
			usableForecastEnergyWh: 6_500,
			requiredChargeEnergyWh: 3_000,
			forecastSurplusEnergyWh: 3_500,
			permittedDayDischargeEnergyWh: 3_500,
		});
		expect(Object.isFrozen(result)).to.equal(true);
	});

	it("caps permitted discharge at the safety envelope", () => {
		const result = createStrategyPvEnergyBudget(
			snapshot(12_000),
			CONFIGURATION,
			safetyEnvelope(2_000, 2_500),
		);

		expect(result?.forecastSurplusEnergyWh).to.equal(8_500);
		expect(result?.permittedDayDischargeEnergyWh).to.equal(2_500);
	});

	it("permits no discharge when forecast cannot cover reserve and charge", () => {
		const result = createStrategyPvEnergyBudget(
			snapshot(4_000),
			CONFIGURATION,
			safetyEnvelope(3_000),
		);

		expect(result?.usableForecastEnergyWh).to.equal(2_500);
		expect(result?.forecastSurplusEnergyWh).to.equal(0);
		expect(result?.permittedDayDischargeEnergyWh).to.equal(0);
	});

	it("never lets the reserve produce negative usable energy", () => {
		const result = createStrategyPvEnergyBudget(
			snapshot(1_000),
			CONFIGURATION,
			safetyEnvelope(0),
		);

		expect(result?.usableForecastEnergyWh).to.equal(0);
		expect(result?.permittedDayDischargeEnergyWh).to.equal(0);
	});

	it("fails closed when snapshot and safety envelope differ", () => {
		const envelope = {
			...safetyEnvelope(3_000),
			createdAt: CREATED_AT + 1,
		};

		expect(createStrategyPvEnergyBudget(
			snapshot(8_000),
			CONFIGURATION,
			envelope,
		)).to.equal(null);
	});

	it("fails closed for invalid energy inputs", () => {
		expect(createStrategyPvEnergyBudget(
			snapshot(Number.NaN),
			CONFIGURATION,
			safetyEnvelope(3_000),
		)).to.equal(null);

		expect(createStrategyPvEnergyBudget(
			snapshot(8_000),
			CONFIGURATION,
			safetyEnvelope(-1),
		)).to.equal(null);
	});
});
