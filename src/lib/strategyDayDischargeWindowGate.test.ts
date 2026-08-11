import { expect } from "chai";
import type { StrategyDayDischargeDecision } from "./strategyDayDischargeDecision";
import { applyStrategyDayDischargeWindowGate } from "./strategyDayDischargeWindowGate";
import type { StrategyDaylightWindow } from "./strategyDaylightWindow";

const CREATED_AT = 1_800_000;

function decision(targetDischargePowerW = 2_000): StrategyDayDischargeDecision {
	return {
		createdAt: CREATED_AT,
		powerTarget: {
			createdAt: CREATED_AT,
			requestedDischargePowerW: 2_000,
			targetDischargePowerW,
			limited: targetDischargePowerW !== 2_000,
		},
	} as StrategyDayDischargeDecision;
}

function daylightWindow(
	overrides: Partial<StrategyDaylightWindow> = {},
): StrategyDaylightWindow {
	return {
		evaluatedAt: CREATED_AT,
		startsAt: CREATED_AT - 1_000,
		endsAt: CREATED_AT + 1_000,
		active: true,
		reason: "within-daylight-window",
		...overrides,
	};
}

describe("strategy day discharge window gate", () => {
	it("keeps an allowed discharge target inside the daylight window", () => {
		const result = applyStrategyDayDischargeWindowGate(
			decision(),
			daylightWindow(),
		);

		expect(result).to.deep.include({
			createdAt: CREATED_AT,
			targetDischargePowerW: 2_000,
			limitedByDaylightWindow: false,
			reason: "daylight-window-active",
		});
	});

	it("sets an allowed target to zero before the daylight window", () => {
		const result = applyStrategyDayDischargeWindowGate(
			decision(),
			daylightWindow({
				startsAt: CREATED_AT + 1,
				endsAt: CREATED_AT + 2_000,
				active: false,
				reason: "before-daylight-window",
			}),
		);

		expect(result).to.deep.include({
			targetDischargePowerW: 0,
			limitedByDaylightWindow: true,
			reason: "before-daylight-window",
		});
	});

	it("sets an allowed target to zero at or after the daylight window end", () => {
		const result = applyStrategyDayDischargeWindowGate(
			decision(),
			daylightWindow({
				startsAt: CREATED_AT - 2_000,
				endsAt: CREATED_AT,
				active: false,
				reason: "after-daylight-window",
			}),
		);

		expect(result).to.deep.include({
			targetDischargePowerW: 0,
			limitedByDaylightWindow: true,
			reason: "after-daylight-window",
		});
	});

	it("preserves an existing zero target outside the daylight window", () => {
		const result = applyStrategyDayDischargeWindowGate(
			decision(0),
			daylightWindow({
				startsAt: CREATED_AT + 1,
				endsAt: CREATED_AT + 2_000,
				active: false,
				reason: "before-daylight-window",
			}),
		);

		expect(result?.targetDischargePowerW).to.equal(0);
		expect(result?.limitedByDaylightWindow).to.equal(false);
	});

	it("fails closed when decision and window timestamps differ", () => {
		expect(applyStrategyDayDischargeWindowGate(
			decision(),
			daylightWindow({ evaluatedAt: CREATED_AT + 1 }),
		)).to.equal(null);
	});

	it("fails closed for an inconsistent daylight window", () => {
		expect(applyStrategyDayDischargeWindowGate(
			decision(),
			daylightWindow({
				active: false,
				reason: "before-daylight-window",
			}),
		)).to.equal(null);
	});

	it("fails closed for an invalid decision target", () => {
		expect(applyStrategyDayDischargeWindowGate(
			decision(Number.NaN),
			daylightWindow(),
		)).to.equal(null);
	});
});
