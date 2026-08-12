import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import { createStrategyDayDischargeEvaluation } from "./strategyDayDischargeEvaluation";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";

const CREATED_AT = 1_800_000;
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	batteryCapacityWh: 10_000,
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 4_000,
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

function evaluate(
	inputSnapshot: StrategyInputSnapshot = snapshot(),
	requestedDischargePowerW = 2_000,
	daylightWindowStartsAt = CREATED_AT - 1_000,
	daylightWindowEndsAt = CREATED_AT + 10 * 60 * 60 * 1_000,
) {
	return createStrategyDayDischargeEvaluation(
		inputSnapshot,
		CONFIGURATION,
		60_000,
		requestedDischargePowerW,
		daylightWindowStartsAt,
		daylightWindowEndsAt,
	);
}

describe("strategy day discharge evaluation", () => {
	it("composes an allowed target inside the daylight window", () => {
		const result = evaluate();

		expect(result?.createdAt).to.equal(CREATED_AT);
		expect(result?.decision.permission.reason).to.equal("discharge-allowed");
		expect(result?.daylightWindow.reason).to.equal(
			"within-daylight-window",
		);
		expect(result?.windowGate).to.deep.include({
			targetDischargePowerW: 2_000,
			limitedByDaylightWindow: false,
			reason: "daylight-window-active",
		});
	});

	it("limits an allowed target to zero before the daylight window", () => {
		const result = evaluate(
			snapshot(),
			2_000,
			CREATED_AT + 1,
			CREATED_AT + 2_000,
		);

		expect(result?.decision.permission.allowed).to.equal(true);
		expect(result?.windowGate).to.deep.include({
			targetDischargePowerW: 0,
			limitedByDaylightWindow: true,
			reason: "before-daylight-window",
		});
	});

	it("limits an allowed target to zero at the daylight window end", () => {
		const result = evaluate(
			snapshot(),
			2_000,
			CREATED_AT - 1_000,
			CREATED_AT,
		);

		expect(result?.windowGate).to.deep.include({
			targetDischargePowerW: 0,
			limitedByDaylightWindow: true,
			reason: "after-daylight-window",
		});
	});

	it("preserves a forecast-based zero target inside the window", () => {
		const result = evaluate(snapshot({
			lastUpdatedTimestamp: CREATED_AT - 60_001,
		}));

		expect(result?.decision.permission.reason).to.equal("forecast-stale");
		expect(result?.windowGate).to.deep.include({
			targetDischargePowerW: 0,
			limitedByDaylightWindow: false,
			reason: "daylight-window-active",
		});
	});

	it("fails closed for an invalid snapshot", () => {
		expect(evaluate({
			...snapshot(),
			createdAt: Number.NaN,
		})).to.equal(null);
	});

	it("fails closed for an invalid requested discharge power", () => {
		expect(evaluate(snapshot(), Number.POSITIVE_INFINITY)).to.equal(null);
	});

	it("fails closed for an invalid daylight window", () => {
		expect(evaluate(
			snapshot(),
			2_000,
			CREATED_AT + 1_000,
			CREATED_AT + 1_000,
		)).to.equal(null);
	});
});
