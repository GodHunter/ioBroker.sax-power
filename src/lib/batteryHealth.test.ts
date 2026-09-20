import { expect } from "chai";
import {
	BATTERY_HEALTH_SCHEMA_VERSION,
	createBatteryHealthProgress,
	normalizeBatteryHealthProgress,
	observeBatteryHealth,
} from "./batteryHealth";

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

	it("does not reject charging phases or tiny discharge fluctuations", () => {
		let result = observeBatteryHealth(null, {
			timestamp: "2026-08-10T10:00:00.000Z", soc: 50, batteryPower: 1000, direction: "charging",
		}, 5.2);
		result = observeBatteryHealth(result.progress, {
			timestamp: "2026-08-10T10:10:00.000Z", soc: 55, batteryPower: 0, direction: "idle",
		}, 5.2);
		expect(result.progress.rejectedRuns).to.equal(0);

		result = observeBatteryHealth(result.progress, {
			timestamp: "2026-08-10T10:20:00.000Z", soc: 55, batteryPower: 1000, direction: "discharging",
		}, 5.2);
		result = observeBatteryHealth(result.progress, {
			timestamp: "2026-08-10T10:30:00.000Z", soc: 53, batteryPower: 0, direction: "idle",
		}, 5.2);
		expect(result.progress.rejectedRuns).to.equal(0);
	});

	it("migrates legacy estimates into a rolling window and preserves the published value", () => {
		const legacy = createBatteryHealthProgress("2026-08-10T10:00:00.000Z");
		legacy.schemaVersion = 3;
		legacy.validRuns = 9;
		legacy.rejectedRuns = 13;
		legacy.estimates = [90, 91, 92, 93, 94, 95, 96, 97, 98];
		legacy.publishedValue = 97.4;
		const migrated = normalizeBatteryHealthProgress(legacy);
		expect(migrated.schemaVersion).to.equal(BATTERY_HEALTH_SCHEMA_VERSION);
		expect(migrated.validRuns).to.equal(5);
		expect(migrated.rejectedRuns).to.equal(13);
		expect(migrated.estimates).to.deep.equal([94, 95, 96, 97, 98]);
		expect(migrated.publishedValue).to.equal(97.4);
		expect(normalizeBatteryHealthProgress(migrated)).to.equal(migrated);
	});

	it("publishes one median per batch of five valid discharges", () => {
		let progress = createBatteryHealthProgress("2026-08-10T00:00:00.000Z");
		let result = observeBatteryHealth(progress, {
			timestamp: "2026-08-10T00:00:00.000Z", soc: null, batteryPower: null, direction: "idle",
		}, 5.2);
		const completeRun = (estimate: number, day: number): void => {
			const startedAt = `2026-08-${String(10 + day).padStart(2, "0")}T10:00:00.000Z`;
			for (let minute = 0; minute <= 60; minute += 10) {
				result = observeBatteryHealth(minute === 0 ? progress : result.progress, {
					timestamp: new Date(Date.parse(startedAt) + minute * 60_000).toISOString(),
					soc: 90 - minute * 2 / 3,
					batteryPower: estimate * 20.8,
					direction: "discharging",
				}, 5.2);
			}
			result = observeBatteryHealth(result.progress, {
				timestamp: new Date(Date.parse(startedAt) + 61 * 60_000).toISOString(),
				soc: 50,
				batteryPower: 0,
				direction: "idle",
			}, 5.2);
			progress = result.progress;
		};

		[95, 97, 96, 80].forEach(completeRun);
		expect(result.value).to.equal(null);
		expect(result.progress.validRuns).to.equal(4);

		completeRun(98, 4);
		expect(result.status).to.equal("available");
		expect(result.value).to.equal(96);
		expect(result.progress.validRuns).to.equal(5);
		expect(result.progress.estimates).to.deep.equal([95, 97, 96, 80, 98]);

		completeRun(110, 5);
		expect(result.progress.validRuns).to.equal(5);
		expect(result.progress.estimates).to.deep.equal([97, 96, 80, 98, 110]);
		expect(result.value).to.equal(97);

		completeRun(102, 6);
		expect(result.progress.estimates).to.deep.equal([96, 80, 98, 110, 102]);
		expect(result.value).to.equal(98);
	});
});
