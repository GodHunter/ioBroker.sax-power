import { expect } from "chai";

import { resolveStrategyAstroDate } from "./strategyAstroDate";

describe("strategy astro date", () => {
	const date = new Date("2026-06-21T12:00:00.000Z");

	it("resolves an ordered sunrise and sunset from configured coordinates", () => {
		const sunrise = resolveStrategyAstroDate(
			"sunrise", date, 49.08, 9.07,
		);
		const sunset = resolveStrategyAstroDate(
			"sunset", date, 49.08, 9.07,
		);

		expect(sunrise.getTime()).to.be.lessThan(sunset.getTime());
	});

	it("applies the requested offset in minutes", () => {
		const baseline = resolveStrategyAstroDate(
			"sunrise", date, 49.08, 9.07,
		);
		const offset = resolveStrategyAstroDate(
			"sunrise", date, 49.08, 9.07, 15,
		);

		expect(offset.getTime() - baseline.getTime()).to.equal(900_000);
	});

	it("fails closed for missing or invalid coordinates", () => {
		for (const [latitude, longitude] of [
			[undefined, 9.07],
			[49.08, undefined],
			[91, 9.07],
			[49.08, 181],
		]) {
			expect(Number.isNaN(resolveStrategyAstroDate(
				"sunrise", date, latitude, longitude,
			).getTime())).to.equal(true);
		}
	});

	it("fails closed for an invalid date or offset", () => {
		expect(Number.isNaN(resolveStrategyAstroDate(
			"sunrise", new Date(Number.NaN), 49.08, 9.07,
		).getTime())).to.equal(true);
		expect(Number.isNaN(resolveStrategyAstroDate(
			"sunrise", date, 49.08, 9.07, Number.NaN,
		).getTime())).to.equal(true);
	});
});
