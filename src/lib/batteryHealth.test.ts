import { expect } from "chai";
import { createBatteryHealthProgress, observeBatteryHealth } from "./batteryHealth";

describe("battery health tracker", () => {
	it("counts a sufficiently large discharge and estimates capacity", () => {
		let progress = createBatteryHealthProgress("2026-08-10T10:00:00.000Z");
		for (let minute = 0; minute <= 60; minute += 10) {
			const result = observeBatteryHealth(progress, {
				timestamp: new Date(Date.parse("2026-08-10T10:00:00.000Z") + minute * 60_000).toISOString(),
				soc: 90 - minute,
				batteryPower: 3120,
				direction: "discharging",
			}, 5.2);
			progress = result.progress;
		}
		const finished = observeBatteryHealth(progress, {
			timestamp: "2026-08-10T11:01:00.000Z", soc: 30, batteryPower: 0, direction: "idle",
		}, 5.2);
		expect(finished.progress.validRuns).to.equal(1);
		expect(finished.progress.rejectedRuns).to.equal(0);
		expect(finished.value).to.equal(null);
	});

	it("rejects short and interrupted runs", () => {
		let result = observeBatteryHealth(null, {
			timestamp: "2026-08-10T10:00:00.000Z", soc: 80, batteryPower: 1000, direction: "discharging",
		}, 5.2);
		result = observeBatteryHealth(result.progress, {
			timestamp: "2026-08-10T10:10:00.000Z", soc: 75, batteryPower: 0, direction: "idle",
		}, 5.2);
		expect(result.progress.rejectedRuns).to.equal(1);
	});

	it("publishes the median after five valid discharges", () => {
		const progress = createBatteryHealthProgress("2026-08-10T10:00:00.000Z");
		progress.validRuns = 5;
		progress.estimates = [95, 97, 96, 80, 98];
		const result = observeBatteryHealth(progress, {
			timestamp: "2026-08-10T10:01:00.000Z", soc: null, batteryPower: null, direction: "idle",
		}, 5.2);
		expect(result.status).to.equal("available");
		expect(result.value).to.equal(96);
	});
});
