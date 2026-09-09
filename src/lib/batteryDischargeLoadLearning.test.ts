import { expect } from "chai";
import {
	createBatteryDischargeLoadProgress,
	observeBatteryDischargeLoad,
} from "./batteryDischargeLoadLearning";

const USABLE_CAPACITY_KWH = 7;
const MAX_DISCHARGE_POWER_W = 4_600;

function observe(
	previous: ReturnType<typeof createBatteryDischargeLoadProgress> | null,
	timestamp: string,
	batteryPower: number,
) {
	return observeBatteryDischargeLoad(
		previous,
		{
			timestamp,
			batteryPower,
			direction: batteryPower > 0 ? "discharging" : batteryPower < 0 ? "charging" : "idle",
		},
		USABLE_CAPACITY_KWH,
		MAX_DISCHARGE_POWER_W,
	);
}

describe("battery discharge load learning", () => {
	it("keeps idle and charging observations at zero discharge load", () => {
		const idle = observe(null, "2026-09-09T18:00:00.000Z", 0);
		expect(idle.actualDischargePowerW).to.equal(0);
		expect(idle.loadIndex).to.equal(0);
		expect(idle.loadStatus).to.equal("idle");
		const charging = observe(idle.progress, "2026-09-09T18:01:00.000Z", -3_000);
		expect(charging.actualDischargePowerW).to.equal(0);
		expect(charging.loadIndex).to.equal(0);
	});

	it("reports utilization against the technical discharge limit", () => {
		const result = observe(null, "2026-09-09T18:00:00.000Z", 2_300);
		expect(result.utilizationPercent).to.equal(50);
		expect(result.highLoadThresholdW).to.equal(2_300);
		expect(result.highLoadActive).to.equal(true);
	});

	it("classifies a brief near-limit discharge as high load", () => {
		const result = observe(null, "2026-09-09T18:00:00.000Z", 4_400);
		expect(result.utilizationPercent).to.be.greaterThan(95);
		expect(result.loadIndex).to.be.greaterThan(60);
		expect(result.loadStatus).to.equal("high");
	});

	it("accumulates consecutive and daily high-load duration", () => {
		const first = observe(null, "2026-09-09T18:00:00.000Z", 3_000);
		const second = observe(first.progress, "2026-09-09T18:10:00.000Z", 3_000);
		// Gaps above five minutes are deliberately not integrated.
		expect(second.consecutiveHighLoadMinutes).to.equal(0);
		const third = observe(second.progress, "2026-09-09T18:11:00.000Z", 3_000);
		expect(third.consecutiveHighLoadMinutes).to.equal(1);
		expect(third.highLoadMinutesToday).to.equal(1);
	});

	it("resets consecutive high-load duration once power falls below the threshold", () => {
		const first = observe(null, "2026-09-09T18:00:00.000Z", 3_000);
		const second = observe(first.progress, "2026-09-09T18:01:00.000Z", 3_000);
		expect(second.consecutiveHighLoadMinutes).to.equal(1);
		const third = observe(second.progress, "2026-09-09T18:02:00.000Z", 1_000);
		expect(third.consecutiveHighLoadMinutes).to.equal(0);
		expect(third.highLoadMinutesToday).to.equal(1);
	});

	it("integrates discharged energy and resets daily counters on day change", () => {
		const first = observe(null, "2026-09-09T23:58:00.000Z", 1_000);
		const second = observe(first.progress, "2026-09-09T23:59:00.000Z", 1_000);
		expect(second.dischargedEnergyTodayKwh).to.be.greaterThan(0);
		const nextDay = observe(second.progress, "2026-09-10T00:00:00.000Z", 1_000);
		expect(nextDay.progress.day).to.equal("2026-09-10");
		expect(nextDay.dischargedEnergyTodayKwh).to.be.greaterThan(0);
		expect(nextDay.dischargedEnergyTodayKwh).to.be.lessThan(second.dischargedEnergyTodayKwh);
	});

	it("tracks peak power and equivalent discharge cycles", () => {
		const first = observe(null, "2026-09-09T18:00:00.000Z", 2_000);
		const second = observe(first.progress, "2026-09-09T18:01:00.000Z", 4_000);
		expect(second.peakDischargePowerTodayW).to.equal(4_000);
		expect(second.equivalentDischargeCyclesToday).not.to.equal(null);
	});
});
