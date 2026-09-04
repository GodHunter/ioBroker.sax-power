import { strict as assert } from "node:assert";
import { StrategyHouseholdLoadCollector } from "./strategyHouseholdLoadCollector";

describe("strategy household load collector", () => {
	it("emits one averaged sample when a 15 minute slot completes", () => {
		const collector = new StrategyHouseholdLoadCollector();
		const first = new Date(2026, 8, 4, 18, 1).getTime();

		assert.equal(collector.addObservation(first, 400), null);
		assert.equal(collector.addObservation(new Date(2026, 8, 4, 18, 5).getTime(), 800), null);
		assert.equal(collector.addObservation(new Date(2026, 8, 4, 18, 14).getTime(), 1_200), null);

		const completed = collector.addObservation(
			new Date(2026, 8, 4, 18, 15).getTime(),
			500,
		);

		assert.ok(completed);
		assert.equal(completed.averagePowerW, 800);
		assert.equal(completed.observationCount, 3);
		assert.equal(completed.slotIndex, 72);
		assert.equal(completed.dayClass, "weekday");
		assert.equal(completed.timestampMs, new Date(2026, 8, 4, 18, 0).getTime());
	});

	it("does not turn every runtime cycle into a learned slot sample", () => {
		const collector = new StrategyHouseholdLoadCollector();
		for (let minute = 0; minute < 15; minute += 1) {
			assert.equal(
				collector.addObservation(new Date(2026, 8, 4, 12, minute).getTime(), 900),
				null,
			);
		}

		const completed = collector.addObservation(
			new Date(2026, 8, 4, 12, 15).getTime(),
			900,
		);
		assert.ok(completed);
		assert.equal(completed.observationCount, 15);
		assert.equal(completed.averagePowerW, 900);
	});

	it("starts a fresh bucket after a slot transition", () => {
		const collector = new StrategyHouseholdLoadCollector();
		collector.addObservation(new Date(2026, 8, 4, 9, 14).getTime(), 600);
		const first = collector.addObservation(new Date(2026, 8, 4, 9, 15).getTime(), 1_000);
		assert.ok(first);
		assert.equal(first.averagePowerW, 600);

		const second = collector.addObservation(new Date(2026, 8, 4, 9, 30).getTime(), 1_400);
		assert.ok(second);
		assert.equal(second.averagePowerW, 1_000);
		assert.equal(second.observationCount, 1);
	});

	it("rejects invalid observations without disturbing the active bucket", () => {
		const collector = new StrategyHouseholdLoadCollector();
		collector.addObservation(new Date(2026, 8, 4, 10, 1).getTime(), 700);
		assert.equal(collector.addObservation(Number.NaN, 500), null);
		assert.equal(collector.addObservation(new Date(2026, 8, 4, 10, 2).getTime(), -1), null);

		const completed = collector.addObservation(new Date(2026, 8, 4, 10, 15).getTime(), 500);
		assert.ok(completed);
		assert.equal(completed.averagePowerW, 700);
		assert.equal(completed.observationCount, 1);
	});
});
