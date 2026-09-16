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
	soc = 50,
	gridImportPowerW = 0,
) {
	return observeBatteryDischargeLoad(previous, {
		timestamp, soc, batteryPower,
		direction: batteryPower > 0 ? "discharging" : batteryPower < 0 ? "charging" : "idle",
		gridImportPowerW,
	}, USABLE_CAPACITY_KWH, MAX_DISCHARGE_POWER_W);
}

describe("battery discharge load learning", () => {
	it("creates and normalizes an immutable progress boundary", () => {
		const progress = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		expect(progress.day).to.equal("2026-09-09");
		expect(progress.dischargedEnergyTodayKwh).to.equal(0);
		const normalized = normalizeBatteryDischargeLoadProgress({ ...progress, lastDischargePowerW: -100, dischargedEnergyTodayKwh: -1, highLoadDurationTodayMs: -1, consecutiveHighLoadMs: -1, peakDischargePowerTodayW: -1 }, "2026-09-09T18:01:00.000Z");
		expect(normalized.lastDischargePowerW).to.equal(0);
		expect(normalized.dischargedEnergyTodayKwh).to.equal(0);
	});

	it("migrates schema 1 load history without inventing capability history", () => {
		const current = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		const legacy = { ...current, schemaVersion: 1, dischargedEnergyTodayKwh: 2.5 };
		const normalized = normalizeBatteryDischargeLoadProgress(legacy, "2026-09-09T18:01:00.000Z");
		expect(normalized.schemaVersion).to.equal(3);
		expect(normalized.dischargedEnergyTodayKwh).to.equal(2.5);
		expect(normalized.capabilityBins["40-60"].samples).to.deep.equal([]);
	});

	it("migrates schema 2 into V3 without losing learned discharge capability", () => {
		const current = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		const legacy = {
			...current,
			schemaVersion: 2,
			dischargedEnergyTodayKwh: 3,
			highLoadDurationTodayMs: 120000,
			capabilityBins: {
				...current.capabilityBins,
				"40-60": { samples: [4350, 4400], observedSamples: 10, maxObservedDischargePowerW: 4400 },
			},
		};
		const migrated = normalizeBatteryDischargeLoadProgress(legacy as never, "2026-09-09T18:10:00.000Z");
		expect(migrated.schemaVersion).to.equal(3);
		expect(migrated.capabilityBins["40-60"].samples).to.deep.equal([4350, 4400]);
		expect(migrated.totalDischargedEnergyKwh).to.equal(3);
		expect(migrated.totalHighLoadDurationMs).to.equal(120000);
		expect(migrated.capabilityEpisodeHistory).to.deep.equal([]);
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

	it("does not learn discharge capability without simultaneous unmet demand", () => {
		const result = observe(null, "2026-09-09T18:00:00.000Z", 4_400, 50, 0);
		expect(result.capabilityTestable).to.equal(false);
		expect(result.progress.capabilityBins["40-60"].samples).to.deep.equal([]);
	});

	it("learns a demand-backed SOC-specific discharge baseline", () => {
		let progress = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) progress = observe(progress, `2026-09-09T18:0${minute}:00.000Z`, 4_400, 50, 800).progress;
		const result = observe(progress, "2026-09-09T18:06:00.000Z", 4_350, 50, 900);
		expect(result.capabilityConfidence).to.equal("established");
		expect(result.expectedDischargePowerW).to.equal(4_400);
		expect(result.capabilityStatus).to.equal("normal");
	});

	it("does not teach a partially capable discharge observation into an established baseline", () => {
		let progress = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) {
			progress = observe(progress, `2026-09-09T18:0${minute}:00.000Z`, 4_400, 50, 800).progress;
		}
		const before = [...progress.capabilityBins["40-60"].samples];
		const result = observe(progress, "2026-09-09T18:06:00.000Z", 3_500, 50, 1_000);
		expect(result.capabilityStatus).to.equal("normal");
		expect(result.capabilityRatioPercent).to.be.closeTo(79.5, 0.1);
		expect(result.progress.activeCapabilityEpisode).to.equal(null);
		expect(result.progress.capabilityBins["40-60"].samples).to.deep.equal(before);
	});

	it("continues teaching normal discharge observations above the established learning threshold", () => {
		let progress = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) {
			progress = observe(progress, `2026-09-09T18:0${minute}:00.000Z`, 4_400, 50, 800).progress;
		}
		const result = observe(progress, "2026-09-09T18:06:00.000Z", 4_100, 50, 700);
		expect(result.capabilityStatus).to.equal("normal");
		expect(result.progress.capabilityBins["40-60"].samples).to.deep.equal([4400, 4400, 4400, 4400, 4400, 4100]);
	});

	it("freezes the discharge baseline while a limitation episode is recovering", () => {
		let progress = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) {
			progress = observe(progress, `2026-09-09T18:0${minute}:00.000Z`, 4_400, 50, 800).progress;
		}

		const baseline = [...progress.capabilityBins["40-60"].samples];

		const limited = observe(progress, "2026-09-09T18:06:00.000Z", 2_800, 50, 1_500);
		expect(limited.capabilityStatus).to.equal("limited");
		expect(limited.progress.capabilityBins["40-60"].samples).to.deep.equal(baseline);

		const recovering = observe(limited.progress, "2026-09-09T18:07:00.000Z", 3_500, 50, 1_000);
		expect(recovering.capabilityStatus).to.equal("recovering");
		expect(recovering.progress.activeCapabilityEpisode).not.to.equal(null);
		expect(recovering.progress.capabilityBins["40-60"].samples).to.deep.equal(baseline);

		const recovered = observe(recovering.progress, "2026-09-09T18:08:00.000Z", 4_100, 50, 700);
		expect(recovered.capabilityStatus).to.equal("recovered");
		expect(recovered.progress.activeCapabilityEpisode).to.equal(null);
		expect(recovered.progress.capabilityBins["40-60"].samples).to.deep.equal([...baseline, 4100]);
	});

	it("keeps a discharge limitation episode across midnight until recovery is proven", () => {
		let progress = createBatteryDischargeLoadProgress("2026-09-09T23:50:00.000Z");

		for (let minute = 51; minute <= 55; minute += 1) {
			progress = observe(progress, `2026-09-09T23:${minute}:00.000Z`, 4_400, 50, 800).progress;
		}

		const limited = observe(progress, "2026-09-09T23:59:00.000Z", 2_800, 50, 1_500);
		expect(limited.capabilityStatus).to.equal("limited");
		expect(limited.progress.activeCapabilityEpisode).not.to.equal(null);

		const baseline = [...limited.progress.capabilityBins["40-60"].samples];

		const recovering = observe(limited.progress, "2026-09-10T00:01:00.000Z", 3_500, 50, 1_000);
		expect(recovering.progress.day).to.equal("2026-09-10");
		expect(recovering.capabilityStatus).to.equal("recovering");
		expect(recovering.progress.activeCapabilityEpisode?.startedAt).to.equal("2026-09-09T23:59:00.000Z");
		expect(recovering.progress.capabilityBins["40-60"].samples).to.deep.equal(baseline);

		const recovered = observe(recovering.progress, "2026-09-10T00:02:00.000Z", 4_100, 50, 700);
		expect(recovered.capabilityStatus).to.equal("recovered");
		expect(recovered.progress.activeCapabilityEpisode).to.equal(null);
		expect(recovered.progress.recoveryEvents).to.equal(1);
		expect(recovered.progress.lastRecoveryDurationMinutes).to.equal(3);
	});

	it("preserves and anchors an active schema 2 discharge episode during V3 migration", () => {
		const current = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		const legacyEpisode = {
			startedAt: "2026-09-09T17:30:00.000Z",
			socAtStart: 50,
			minimumCapabilityPowerW: 2800,
			minimumCapabilityRatioPercent: 63.6,
			dischargedEnergyAtStartKwh: 2,
			equivalentDischargeCyclesAtStart: 0.286,
			highLoadMinutesAtStart: 10,
			lastLimitedAt: "2026-09-09T17:45:00.000Z",
		};
		const legacy = {
			...current,
			schemaVersion: 2,
			dischargedEnergyTodayKwh: 3,
			highLoadDurationTodayMs: 120_000,
			activeCapabilityEpisode: legacyEpisode,
		};
		const migrated = normalizeBatteryDischargeLoadProgress(legacy as never, "2026-09-09T18:10:00.000Z");
		expect(migrated.activeCapabilityEpisode).not.to.equal(null);
		expect(migrated.activeCapabilityEpisode?.startedAt).to.equal(legacyEpisode.startedAt);
		expect(migrated.activeCapabilityEpisode?.minimumCapabilityPowerW).to.equal(2800);
		expect(migrated.activeCapabilityEpisode?.totalDischargedEnergyAtStartKwh).to.equal(3);
		expect(migrated.activeCapabilityEpisode?.totalHighLoadMinutesAtStart).to.equal(2);
		expect(migrated.activeCapabilityEpisode?.equivalentDischargeCyclesTotalAtStart).to.equal(null);
	});

	it("stores a completed discharge capability episode with monotonic lifetime context", () => {
		let progress = createBatteryDischargeLoadProgress("2026-09-09T23:50:00.000Z");
		for (let minute = 51; minute <= 55; minute += 1) {
			progress = observe(progress, `2026-09-09T23:${minute}:00.000Z`, 4_400, 50, 800).progress;
		}
		progress = observe(progress, "2026-09-09T23:59:00.000Z", 2_800, 50, 1_500).progress;
		const recovered = observe(progress, "2026-09-10T00:02:00.000Z", 4_100, 50, 700);
		expect(recovered.progress.capabilityEpisodeHistory).to.have.length(1);
		const episode = recovered.progress.capabilityEpisodeHistory[0];
		expect(episode.startedAt).to.equal("2026-09-09T23:59:00.000Z");
		expect(episode.recoveredAt).to.equal("2026-09-10T00:02:00.000Z");
		expect(episode.durationMinutes).to.equal(3);
		expect(episode.dischargedEnergyDuringEpisodeKwh).to.be.at.least(0);
		expect(episode.totalDischargedEnergyAtRecoveryKwh).to.be.at.least(episode.totalDischargedEnergyAtStartKwh);
		expect(episode.highLoadMinutesDuringEpisode).to.be.at.least(0);
		expect(episode.recoveryCapabilityPowerW).to.equal(4100);
	});

	it("detects limitation and recovery without learning the limited sample into its baseline", () => {
		let progress = createBatteryDischargeLoadProgress("2026-09-09T18:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) progress = observe(progress, `2026-09-09T18:0${minute}:00.000Z`, 4_400, 50, 800).progress;
		const limited = observe(progress, "2026-09-09T18:06:00.000Z", 2_800, 50, 1_500);
		expect(limited.capabilityStatus).to.equal("limited");
		expect(limited.limitationEvidence).to.equal(true);
		expect(limited.progress.limitationEvents).to.equal(1);
		expect(limited.progress.capabilityBins["40-60"].samples).to.have.length(5);
		expect(limited.progress.activeCapabilityEpisode?.equivalentDischargeCyclesAtStart).not.to.equal(null);
		const recovering = observe(limited.progress, "2026-09-09T18:07:00.000Z", 3_500, 50, 1_000);
		expect(recovering.capabilityStatus).to.equal("recovering");
		const recovered = observe(recovering.progress, "2026-09-09T18:08:00.000Z", 4_100, 50, 700);
		expect(recovered.capabilityStatus).to.equal("recovered");
		expect(recovered.progress.recoveryEvents).to.equal(1);
		expect(recovered.progress.activeCapabilityEpisode).to.equal(null);
	});
});