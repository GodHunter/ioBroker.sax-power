import { expect } from "chai";

import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import { createStrategySafetyEnvelope } from "./strategySafetyEnvelope";

const CONFIGURATION: StrategyConfiguration = {
	batteryCapacityWh: 15400,
	minimumStateOfChargePercent: 10,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 4600,
	maximumDischargePowerW: 4200,
	pvForecastReserveWh: 1500,
};

function snapshot(stateOfChargePercent: number): StrategyInputSnapshot {
	return {
		createdAt: 1_786_464_123_000,
		modbus: {
			operatingState: 2,
			stateOfChargePercent,
			batteryPowerW: -1250,
			smartMeterPowerW: 340,
		},
		pvForecast: {
			energyNowUntilEndOfDayWh: 12400,
			energyTodayWh: 18700,
			energyTomorrowWh: 22100,
			lastUpdatedTimestamp: 1_786_464_000_000,
		},
	};
}

describe("strategy safety envelope", () => {
	it("derives the energy and power boundaries from SOC", () => {
		const result = createStrategySafetyEnvelope(
			snapshot(50),
			CONFIGURATION,
		);

		expect(result).to.deep.equal({
			createdAt: 1_786_464_123_000,
			stateOfChargePercent: 50,
			storedEnergyWh: 7700,
			minimumStoredEnergyWh: 1540,
			maximumStoredEnergyWh: 13860,
			availableChargeEnergyWh: 6160,
			availableDischargeEnergyWh: 6160,
			maximumChargePowerW: 4600,
			maximumDischargePowerW: 4200,
		});
	});

	it("blocks discharge at and below the minimum SOC", () => {
		for (const stateOfChargePercent of [10, 5]) {
			const result = createStrategySafetyEnvelope(
				snapshot(stateOfChargePercent),
				CONFIGURATION,
			);

			expect(result?.availableDischargeEnergyWh).to.equal(0);
			expect(result?.maximumDischargePowerW).to.equal(0);
		}
	});

	it("blocks charging at and above the maximum SOC", () => {
		for (const stateOfChargePercent of [90, 95]) {
			const result = createStrategySafetyEnvelope(
				snapshot(stateOfChargePercent),
				CONFIGURATION,
			);

			expect(result?.availableChargeEnergyWh).to.equal(0);
			expect(result?.maximumChargePowerW).to.equal(0);
		}
	});

	it("fails closed for an invalid runtime SOC", () => {
		for (const stateOfChargePercent of [-1, 101, Number.NaN]) {
			expect(createStrategySafetyEnvelope(
				snapshot(stateOfChargePercent),
				CONFIGURATION,
			)).to.equal(null);
		}
	});

	it("creates an immutable result without mutating its inputs", () => {
		const inputSnapshot = snapshot(63);
		const before = { ...inputSnapshot.modbus };
		const result = createStrategySafetyEnvelope(
			inputSnapshot,
			CONFIGURATION,
		);

		expect(Object.isFrozen(result)).to.equal(true);
		expect(inputSnapshot.modbus).to.deep.equal(before);
		expect(Object.isFrozen(inputSnapshot)).to.equal(false);
	});
});
