import { expect } from "chai";
import { assessStrategyDaylightWindow } from "./strategyDaylightWindow";

const STARTS_AT = Date.parse("2026-08-11T04:15:00.000Z");
const ENDS_AT = Date.parse("2026-08-11T18:45:00.000Z");

describe("strategy daylight window", () => {
	it("is inactive before the daylight window", () => {
		const assessment = assessStrategyDaylightWindow(
			STARTS_AT - 1,
			STARTS_AT,
			ENDS_AT,
		);

		expect(assessment).to.deep.equal({
			evaluatedAt: STARTS_AT - 1,
			startsAt: STARTS_AT,
			endsAt: ENDS_AT,
			active: false,
			reason: "before-daylight-window",
		});
	});

	it("includes the exact start of the daylight window", () => {
		const assessment = assessStrategyDaylightWindow(
			STARTS_AT,
			STARTS_AT,
			ENDS_AT,
		);

		expect(assessment?.active).to.equal(true);
		expect(assessment?.reason).to.equal("within-daylight-window");
	});

	it("is active inside the daylight window", () => {
		const evaluatedAt = STARTS_AT + (ENDS_AT - STARTS_AT) / 2;
		const assessment = assessStrategyDaylightWindow(
			evaluatedAt,
			STARTS_AT,
			ENDS_AT,
		);

		expect(assessment).to.deep.equal({
			evaluatedAt,
			startsAt: STARTS_AT,
			endsAt: ENDS_AT,
			active: true,
			reason: "within-daylight-window",
		});
	});

	it("excludes the exact end of the daylight window", () => {
		const assessment = assessStrategyDaylightWindow(
			ENDS_AT,
			STARTS_AT,
			ENDS_AT,
		);

		expect(assessment?.active).to.equal(false);
		expect(assessment?.reason).to.equal("after-daylight-window");
	});

	it("is inactive after the daylight window", () => {
		const assessment = assessStrategyDaylightWindow(
			ENDS_AT + 1,
			STARTS_AT,
			ENDS_AT,
		);

		expect(assessment?.active).to.equal(false);
		expect(assessment?.reason).to.equal("after-daylight-window");
	});

	it("fails closed for non-finite timestamps", () => {
		expect(
			assessStrategyDaylightWindow(Number.NaN, STARTS_AT, ENDS_AT),
		).to.equal(null);
		expect(
			assessStrategyDaylightWindow(STARTS_AT, Number.POSITIVE_INFINITY, ENDS_AT),
		).to.equal(null);
		expect(
			assessStrategyDaylightWindow(STARTS_AT, STARTS_AT, Number.NaN),
		).to.equal(null);
	});

	it("fails closed for empty or reversed daylight windows", () => {
		expect(
			assessStrategyDaylightWindow(STARTS_AT, STARTS_AT, STARTS_AT),
		).to.equal(null);
		expect(
			assessStrategyDaylightWindow(STARTS_AT, ENDS_AT, STARTS_AT),
		).to.equal(null);
	});

	it("returns an immutable assessment", () => {
		const assessment = assessStrategyDaylightWindow(
			STARTS_AT,
			STARTS_AT,
			ENDS_AT,
		);

		expect(Object.isFrozen(assessment)).to.equal(true);
	});
});
