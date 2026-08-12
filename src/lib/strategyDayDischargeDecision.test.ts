import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import { createStrategyDayDischargeDecision } from "./strategyDayDischargeDecision";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";

const CREATED_AT = 1_800_000;
const DAYLIGHT_WINDOW_ENDS_AT = CREATED_AT + 10 * 60 * 60 * 1_000;
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 3_500,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

function snapshot(
	overrides: Partial<StrategyInputSnapshot["pvForecast"]> = {},
	stateOfChargePercent = 60,
): StrategyInputSnapshot {
	return {
		createdAt: CREATED_AT,
		modbus: {
			operatingState: 1,
			stateOfChargePercent,
			batteryPowerW: 0,
			smartMeterPowerW: 0,
		},
		pvForecast: {
			energyNowUntilEndOfDayWh: 8_000,
			energyTodayWh: 10_000,
			energyTomorrowWh: 12_000,
			lastUpdatedTimestamp: CREATED_AT - 1_000,
			...overrides,
		},
	};
}

describe("strategy day discharge decision", () => {
	it("composes an allowed decision and limits its power target", () => {
		const result = createStrategyDayDischargeDecision(
			snapshot(),
			CONFIGURATION,
			60_000,
			4_000,
			DAYLIGHT_WINDOW_ENDS_AT,
		);

		expect(result).not.to.equal(null);
		expect(result?.createdAt).to.equal(CREATED_AT);
		expect(result?.permission).to.deep.include({
			allowed: true,
			reason: "discharge-allowed",
			permittedDischargeEnergyWh: 2_800,
			maximumDischargePowerW: 3_000,
		});
		expect(result?.powerTarget).to.deep.equal({
			createdAt: CREATED_AT,
			requestedDischargePowerW: 4_000,
			targetDischargePowerW: 3_000,
			limited: true,
		});
	});

	it("returns a zero target with the forecast-stale reason", () => {
		const result = createStrategyDayDischargeDecision(
			snapshot({ lastUpdatedTimestamp: CREATED_AT - 60_001 }),
			CONFIGURATION,
			60_000,
			2_000,
			DAYLIGHT_WINDOW_ENDS_AT,
		);

		expect(result?.permission.reason).to.equal("forecast-stale");
		expect(result?.permission.allowed).to.equal(false);
		expect(result?.powerTarget.targetDischargePowerW).to.equal(0);
	});

	it("returns a zero target when the minimum state of charge is reached", () => {
		const result = createStrategyDayDischargeDecision(
			snapshot({}, 20),
			CONFIGURATION,
			60_000,
			2_000,
			DAYLIGHT_WINDOW_ENDS_AT,
		);

		expect(result?.permission.reason).to.equal(
			"minimum-state-of-charge-reached",
		);
		expect(result?.powerTarget.targetDischargePowerW).to.equal(0);
	});

	it("returns a zero target when no PV surplus remains", () => {
		const result = createStrategyDayDischargeDecision(
			snapshot({ energyNowUntilEndOfDayWh: 2_600 }),
			CONFIGURATION,
			60_000,
			2_000,
			DAYLIGHT_WINDOW_ENDS_AT,
		);

		expect(result?.permission.reason).to.equal("insufficient-pv-energy");
		expect(result?.powerTarget.targetDischargePowerW).to.equal(0);
	});

	it("returns a zero target when recharge cannot finish before sunset", () => {
		const result = createStrategyDayDischargeDecision(
			snapshot(),
			CONFIGURATION,
			60_000,
			2_000,
			CREATED_AT + 1_000,
		);

		expect(result?.chargeTime.sufficient).to.equal(false);
		expect(result?.permission.reason).to.equal("insufficient-charge-time");
		expect(result?.powerTarget.targetDischargePowerW).to.equal(0);
	});

	it("fails closed for an invalid snapshot", () => {
		const invalidSnapshot = {
			...snapshot(),
			createdAt: Number.NaN,
		};

		expect(createStrategyDayDischargeDecision(
			invalidSnapshot,
			CONFIGURATION,
			60_000,
			2_000,
			DAYLIGHT_WINDOW_ENDS_AT,
		)).to.equal(null);
	});

	it("fails closed for an invalid forecast age limit", () => {
		expect(createStrategyDayDischargeDecision(
			snapshot(),
			CONFIGURATION,
			-1,
			2_000,
			DAYLIGHT_WINDOW_ENDS_AT,
		)).to.equal(null);
	});

	it("fails closed for an invalid requested discharge power", () => {
		expect(createStrategyDayDischargeDecision(
			snapshot(),
			CONFIGURATION,
			60_000,
			Number.POSITIVE_INFINITY,
			DAYLIGHT_WINDOW_ENDS_AT,
		)).to.equal(null);
	});
});
