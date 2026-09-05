import { strict as assert } from "node:assert";
import { StrategyPvForecastErrorModel } from "./strategyPvForecastErrorLearning";

describe("strategy PV forecast error learning", () => {
	it("integrates actual PV energy and stores a completed daily forecast error", () => {
		const model = new StrategyPvForecastErrorModel();
		const start = new Date(2026, 8, 6, 9, 0).getTime();
		const end = new Date(2026, 8, 6, 15, 0).getTime();
		for (let now = start; now < end; now += 60_000) {
			model.observe({ nowMs: now, pvPowerW: 1_000, forecastTodayWh: 8_000, daylightStartsAt: start, daylightEndsAt: end });
		}
		model.finalizeIfPastDaylight(end);
		const status = model.status();
		assert.equal(status.samples, 1);
		assert.equal(status.lastCompletedDate, "2026-09-06");
		assert.equal(status.meanErrorPercent, -25.21);
		assert.equal(status.medianRatio, 0.7479);
		assert.equal(status.conservativeFactor, 0.7479);
	});

	it("persists current-day integration across a restart", () => {
		const start = new Date(2026, 8, 6, 9, 0).getTime();
		const end = new Date(2026, 8, 6, 15, 0).getTime();
		const original = new StrategyPvForecastErrorModel();
		original.observe({ nowMs: start, pvPowerW: 2_000, forecastTodayWh: 10_000, daylightStartsAt: start, daylightEndsAt: end });
		original.observe({ nowMs: start + 60_000, pvPowerW: 2_000, forecastTodayWh: 12_000, daylightStartsAt: start, daylightEndsAt: end });
		const restored = new StrategyPvForecastErrorModel(original.snapshot());
		restored.observe({ nowMs: start + 120_000, pvPowerW: 2_000, forecastTodayWh: 12_000, daylightStartsAt: start, daylightEndsAt: end });
		const status = restored.status();
		assert.equal(status.todayForecastWh, 10_000);
		assert.equal(Math.round(status.todayActualWh), 67);
	});

	it("does not turn large observation gaps into fictitious PV energy", () => {
		const start = new Date(2026, 8, 6, 9, 0).getTime();
		const end = new Date(2026, 8, 6, 15, 0).getTime();
		const model = new StrategyPvForecastErrorModel();
		model.observe({ nowMs: start, pvPowerW: 5_000, forecastTodayWh: 20_000, daylightStartsAt: start, daylightEndsAt: end });
		model.observe({ nowMs: start + 30 * 60_000, pvPowerW: 5_000, forecastTodayWh: 20_000, daylightStartsAt: start, daylightEndsAt: end });
		assert.equal(model.status().todayActualWh, 0);
		assert.equal(model.status().todayCoveragePercent, 0);
	});
});
