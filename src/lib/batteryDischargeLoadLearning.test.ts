import { expect } from "chai";
import {
	createBatteryDischargeLoadProgress,
	normalizeBatteryDischargeLoadProgress,
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
	it("creates and normalizes an immutable progress boundary", () => {
		const progress = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		expect(progress.day).to.equal("2026-09-09");
		expect(progress.dischargedEnergyTodayKwh).to.equal(0);
		const normalized = normalizeBatteryDischargeLoadProgress({
			...progress,
			lastDischargePowerW: -100,
			dischargedEnergyTodayKwh: -1,
			highLoadDurationTodayMs: -1,
			consecutiveHighLoadMs: -1,
			peakDischargePowerTodayW: -1,
		}, "2026-09-09T18:01:00.000Z");
		expect(normalized.lastDischargePowerW).to.equal(0);
		expect(normalized.dischargedEnergyTodayKwh).to.equal(0);
	});

	it("treats charging and idle power as zero discharge load", () => {
		const charging = observe(null, "2026-09-09T18:00:00.000Z", -3_000);
		expect(charging.actualDischargePowerW).to.equal(0);
		expect(charging.loadStatus).to.equal("idle");
		const idle = observe(charging.progress, "2026-09-09T18:01:00.000Z", 0);
		expect(idle.actualDischargePowerW).to.equal(0);
		expect(idle.loadIndex).to.equal(0);
	});

	it("derives utilization and high-load state from the technical maximum", () => {
		const result = observe(null, "2026-09-09T18:00:00.000Z", 3_000);
		expect(result.maximumDischargePowerW).to.equal(4_600);
		expect(result.highLoadThresholdW).to.equal(2_300);
		expect(result.highLoadActive).to.equal(true);
		expect(result.utilizationPercent).to.equal(65.2);
	});

	it("accumulates consecutive and daily high-load duration", () => {
		const first = observe(null, "2026-09-09T18:00:00.000Z", 3_000);
		const second = observe(first.progress, "2026-09-09T18:01:00.000Z", 3_000);
		expect(second.consecutiveHighLoadMinutes).to.equal(1);
		expect(second.highLoadMinutesToday).to.equal(1);
		const third = observe(second.progress, "2026-09-09T18:02:00.000Z", 3_000);
		expect(third.consecutiveHighLoadMinutes).to.equal(2);
		expect(third.highLoadMinutesToday).to.equal(2);
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

		const midnight = observe(second.progress, "2026-09-10T00:00:00.000Z", 1_000);
		expect(midnight.progress.day).to.equal("2026-09-10");
		expect(midnight.dischargedEnergyTodayKwh).to.equal(0);
		expect(midnight.highLoadMinutesToday).to.equal(0);

		const nextMinute = observe(midnight.progress, "2026-09-10T00:01:00.000Z", 1_000);
		expect(nextMinute.dischargedEnergyTodayKwh).to.be.greaterThan(0);
		expect(nextMinute.dischargedEnergyTodayKwh).to.be.lessThan(second.dischargedEnergyTodayKwh * 2);
	});

	it("tracks peak power and equivalent discharge cycles", () => {
		const first = observe(null, "2026-09-09T18:00:00.000Z", 2_000);
		const second = observe(first.progress, "2026-09-09T18:01:00.000Z", 4_000);
		expect(second.peakDischargePowerTodayW).to.equal(4_000);
		expect(second.equivalentDischargeCyclesToday).not.to.equal(null);
	});
});