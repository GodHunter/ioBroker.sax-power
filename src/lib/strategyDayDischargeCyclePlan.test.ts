import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import { createStrategyDayDischargeCyclePlan } from "./strategyDayDischargeCyclePlan";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import type { StrategyStateContract } from "./strategyIntegrationContract";

const CREATED_AT = 1_800_000;
const CONFIGURATION: StrategyConfiguration = {
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

function plan(
	inputSnapshot: StrategyInputSnapshot = snapshot(),
	requestedDischargePowerW = 2_000,
	daylightWindowStartsAt = CREATED_AT - 1_000,
	daylightWindowEndsAt = CREATED_AT + 1_000,
	commandContract?: StrategyStateContract,
) {
	return createStrategyDayDischargeCyclePlan(
		inputSnapshot,
		CONFIGURATION,
		60_000,
		requestedDischargePowerW,
		daylightWindowStartsAt,
		daylightWindowEndsAt,
		commandContract,
	);
}

describe("strategy day discharge cycle plan", () => {
	it("composes an allowed evaluation and discharge command", () => {
		const result = plan();

		expect(result?.createdAt).to.equal(CREATED_AT);
		expect(result?.evaluation.windowGate.targetDischargePowerW).to.equal(2_000);
		expect(result?.commandPlan).to.deep.include({
			register: 43,
			valueW: 2_000,
			reason: "apply-discharge-target",
		});
		expect(result?.commandPlan.evaluation).to.equal(result?.evaluation);
	});

	it("plans a safe stop outside the daylight window", () => {
		const result = plan(
			snapshot(),
			2_000,
			CREATED_AT + 1,
			CREATED_AT + 2_000,
		);

		expect(result?.evaluation.windowGate.reason).to.equal(
			"before-daylight-window",
		);
		expect(result?.commandPlan).to.deep.include({
			valueW: 0,
			reason: "apply-safe-stop",
		});
	});

	it("plans a safe stop for a forecast-based block", () => {
		const result = plan(snapshot({
			lastUpdatedTimestamp: CREATED_AT - 60_001,
		}));

		expect(result?.evaluation.decision.permission.reason).to.equal(
			"forecast-stale",
		);
		expect(result?.commandPlan.valueW).to.equal(0);
	});

	it("preserves a valid command contract", () => {
		const result = plan(
			snapshot(),
			2_000,
			CREATED_AT - 1_000,
			CREATED_AT + 1_000,
			{
				stateId: "modbus.2.command.43",
				register: 43,
				unit: "W",
				access: "command",
				confirmation: "transient-command",
			},
		);

		expect(result?.commandPlan.stateId).to.equal("modbus.2.command.43");
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

	it("fails closed for an unsuitable command contract", () => {
		expect(plan(
			snapshot(),
			2_000,
			CREATED_AT - 1_000,
			CREATED_AT + 1_000,
			{
				stateId: "modbus.2.observation.43",
				register: 43,
				unit: "W",
				access: "observation",
				confirmation: "state-value",
			},
		)).to.equal(null);
	});
});
