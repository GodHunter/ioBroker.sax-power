import { expect } from "chai";
import {
	createStrategyIoBrokerDaylightWindowProvider,
	type StrategyIoBrokerAstroAdapter,
} from "./strategyIoBrokerDaylightWindow";

const CYCLE_TIMESTAMP = Date.UTC(2026, 5, 21, 12);
const SUNRISE = Date.UTC(2026, 5, 21, 4, 17);
const SUNSET = Date.UTC(2026, 5, 21, 19, 34);

function adapter(
	sunrise = new Date(SUNRISE),
	sunset = new Date(SUNSET),
): StrategyIoBrokerAstroAdapter {
	return {
		getAstroDate(pattern) {
			return pattern === "sunrise" ? sunrise : sunset;
		},
	};
}

describe("strategy ioBroker daylight window provider", () => {
	it("normalizes the requested cycle date to local noon before resolving sunrise and sunset", async () => {
		const calls: Array<readonly unknown[]> = [];
		const provider = createStrategyIoBrokerDaylightWindowProvider({
			getAstroDate(pattern, date, offsetMinutes) {
				calls.push([
					pattern,
					date?.getFullYear(),
					date?.getMonth(),
					date?.getDate(),
					date?.getHours(),
					date?.getMinutes(),
					date?.getSeconds(),
					date?.getMilliseconds(),
					offsetMinutes,
				]);
				return pattern === "sunrise"
					? new Date(SUNRISE)
					: new Date(SUNSET);
			},
		});

		const cycleDate = new Date(CYCLE_TIMESTAMP);
		const window = await provider.getDaylightWindow(CYCLE_TIMESTAMP);

		expect(window).to.deep.equal({
			startsAt: SUNRISE,
			endsAt: SUNSET,
		});
		expect(calls).to.deep.equal([
			[
				"sunrise",
				cycleDate.getFullYear(),
				cycleDate.getMonth(),
				cycleDate.getDate(),
				12,
				0,
				0,
				0,
				undefined,
			],
			[
				"sunset",
				cycleDate.getFullYear(),
				cycleDate.getMonth(),
				cycleDate.getDate(),
				12,
				0,
				0,
				0,
				undefined,
			],
		]);
		expect(Object.isFrozen(window)).to.equal(true);
	});

	it("fails closed before querying astro data for an invalid timestamp", async () => {
		let calls = 0;
		const provider = createStrategyIoBrokerDaylightWindowProvider({
			getAstroDate() {
				calls += 1;
				return new Date(SUNRISE);
			},
		});

		expect(await provider.getDaylightWindow(Number.NaN)).to.equal(null);
		expect(calls).to.equal(0);
	});

	it("fails closed for an invalid astro boundary", async () => {
		const provider = createStrategyIoBrokerDaylightWindowProvider(
			adapter(new Date(Number.NaN)),
		);

		expect(await provider.getDaylightWindow(CYCLE_TIMESTAMP)).to.equal(null);
	});

	it("fails closed when sunrise is not before sunset", async () => {
		const provider = createStrategyIoBrokerDaylightWindowProvider(
			adapter(new Date(SUNSET), new Date(SUNRISE)),
		);

		expect(await provider.getDaylightWindow(CYCLE_TIMESTAMP)).to.equal(null);
	});

	it("propagates astro provider failures unchanged", async () => {
		const expectedError = new Error("ioBroker astro calculation failed");
		const provider = createStrategyIoBrokerDaylightWindowProvider({
			getAstroDate() {
				throw expectedError;
			},
		});
		let actualError: unknown;

		try {
			await provider.getDaylightWindow(CYCLE_TIMESTAMP);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});

	it("returns an immutable provider", () => {
		const provider = createStrategyIoBrokerDaylightWindowProvider(adapter());

		expect(Object.isFrozen(provider)).to.equal(true);
	});
});
