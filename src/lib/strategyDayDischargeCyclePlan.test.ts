import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import { createStrategyDayDischargeCyclePlan } from "./strategyDayDischargeCyclePlan";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";

const CREATED_AT = 1_800_000;
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
): StrategyInputSnapshot {
	return {
		createdAt: CREATED_AT,
		modbus: {
			operatingState: 1,
			stateOfChargePercent: 60,
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

function plan(
	inputSnapshot: StrategyInputSnapshot = snapshot(),
	requestedDischargePowerW = 2_000,
	daylightWindowStartsAt = CREATED_AT - 1_000,
	daylightWindowEndsAt = CREATED_AT + 10 * 60 * 60 * 1_000,
) {
	return createStrategyDayDischargeCyclePlan(
		inputSnapshot,
		CONFIGURATION,
		60_000,
		requestedDischargePowerW,
		daylightWindowStartsAt,
		daylightWindowEndsAt,
	);
}

describe("strategy day discharge cycle plan", () => {
	it("composes an allowed daytime availability evaluation", () => {
		const result = plan();

		expect(result?.createdAt).to.equal(CREATED_AT);
		expect(result?.evaluation.windowGate.targetDischargePowerW).to.equal(2_000);
	});

	it("publishes zero availability outside the daylight window", () => {
		const result = plan(
			snapshot(),
			2_000,
			CREATED_AT + 1,
			CREATED_AT + 2_000,
		);

		expect(result?.evaluation.windowGate.reason).to.equal(
			"before-daylight-window",
		);
		expect(result?.evaluation.windowGate.targetDischargePowerW).to.equal(0);
	});

	it("plans a safe stop for a forecast-based block", () => {
		const result = plan(snapshot({
			lastUpdatedTimestamp: CREATED_AT - 60_001,
		}));

		expect(result?.evaluation.decision.permission.reason).to.equal(
			"forecast-stale",
		);
		expect(result?.evaluation.windowGate.targetDischargePowerW).to.equal(0);
	});

	it("fails closed when evaluation input is invalid", () => {
		expect(plan({
			...snapshot(),
			createdAt: Number.NaN,
		})).to.equal(null);
		expect(plan(snapshot(), Number.POSITIVE_INFINITY)).to.equal(null);
	});

	it("fails closed for invalid daylight boundaries", () => {
		expect(plan(
			snapshot(),
			2_000,
			CREATED_AT,
			CREATED_AT,
		)).to.equal(null);
	});
});
