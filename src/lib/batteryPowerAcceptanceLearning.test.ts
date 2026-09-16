import { expect } from "chai";
import {
	createBatteryPowerAcceptanceProgress,
	normalizeBatteryPowerAcceptanceProgress,
	observeBatteryPowerAcceptance,
} from "./batteryPowerAcceptanceLearning";

function sample(minute: number, soc: number, batteryPower: number, requestedChargePowerW = 3500, gridExportPowerW = 300) {
	return {
		timestamp: `2026-09-08T12:${String(minute).padStart(2, "0")}:00.000Z`,
		soc,
		batteryPower,
		direction: batteryPower < 0 ? "charging" as const : "discharging" as const,
		requestedChargePowerW,
		gridExportPowerW,
	};
}

describe("battery power acceptance learning", () => {
	it("keeps the high-SOC taper separate from the lower SOC bin", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		let result = observeBatteryPowerAcceptance(progress, sample(1, 89, -3400), 7);
		progress = result.progress;
		result = observeBatteryPowerAcceptance(progress, sample(2, 96, -1800), 7);
		expect(result.socBin).to.equal("96-98");
		expect(result.progress.bins["85-90"].samples).to.deep.equal([3400]);
		expect(result.progress.bins["96-98"].samples).to.deep.equal([1800]);
	});

	it("does not learn a PV-limited sample as normal battery acceptance", () => {
		const result = observeBatteryPowerAcceptance(createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z"), sample(1, 95, -900, 3500, 0), 7);
		expect(result.progress.bins["94-96"].observedSamples).to.equal(1);
		expect(result.progress.bins["94-96"].samples).to.deep.equal([]);
		expect(result.testable).to.equal(false);
		expect(result.capabilityStatus).to.equal("notTestable");
		expect(result.stressIndex).to.equal(null);
	});

	it("does not learn an R44-limited sample even while exporting", () => {
		const result = observeBatteryPowerAcceptance(createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z"), sample(1, 95, -700, 700, 800), 7);
		expect(result.progress.bins["94-96"].observedSamples).to.equal(1);
		expect(result.progress.bins["94-96"].samples).to.deep.equal([]);
		expect(result.testable).to.equal(false);
		expect(result.stressIndex).to.equal(null);
	});

	it("publishes stress only after a learned SOC-specific baseline", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) progress = observeBatteryPowerAcceptance(progress, sample(minute, 95, -2000), 7).progress;
		const result = observeBatteryPowerAcceptance(progress, sample(6, 95, -1400), 7);
		expect(result.confidence).to.equal("established");
		expect(result.expectedAcceptancePowerW).to.equal(2000);
		expect(result.acceptanceDeviationPercent).to.equal(-30);
		expect(result.stressIndex).to.equal(30);
		expect(result.stressStatus).to.equal("elevated");
	});

	it("does not report stress when the current sample is controller-limited", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) progress = observeBatteryPowerAcceptance(progress, sample(minute, 95, -2000), 7).progress;
		const result = observeBatteryPowerAcceptance(progress, sample(6, 95, -700, 700, 800), 7);
		expect(result.confidence).to.equal("established");
		expect(result.acceptanceDeviationPercent).to.equal(-65);
		expect(result.stressIndex).to.equal(null);
		expect(result.capabilityStatus).to.equal("notTestable");
	});

	it("detects a real limitation without teaching the baseline downwards", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) progress = observeBatteryPowerAcceptance(progress, sample(minute, 65, -3450, 3500, 500), 7).progress;
		const before = [...progress.bins["30-80"].samples];
		const result = observeBatteryPowerAcceptance(progress, sample(6, 65, -1400, 3500, 650), 7);
		expect(result.testable).to.equal(true);
		expect(result.limitationEvidence).to.equal(true);
		expect(result.capabilityStatus).to.equal("limited");
		expect(result.capabilityRatioPercent).to.be.closeTo(40.6, 0.1);
		expect(result.progress.bins["30-80"].samples).to.deep.equal(before);
		expect(result.progress.limitationEvents).to.equal(1);
		expect(result.progress.activeEpisode?.throughputAtStartKwh).to.be.greaterThan(0);
	});

	it("recognizes same-day recovery and records duration", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) progress = observeBatteryPowerAcceptance(progress, sample(minute, 65, -3450, 3500, 500), 7).progress;
		progress = observeBatteryPowerAcceptance(progress, sample(6, 65, -1400, 3500, 650), 7).progress;
		const recovering = observeBatteryPowerAcceptance(progress, sample(7, 65, -2800, 3500, 500), 7);
		expect(recovering.capabilityStatus).to.equal("recovering");
		const recovered = observeBatteryPowerAcceptance(recovering.progress, sample(8, 65, -3300, 3500, 500), 7);
		expect(recovered.capabilityStatus).to.equal("recovered");
		expect(recovered.progress.activeEpisode).to.equal(null);
		expect(recovered.progress.recoveryEvents).to.equal(1);
		expect(recovered.progress.lastRecoveryDurationMinutes).to.equal(2);
	});

	it("freezes the charge baseline while a limitation episode is recovering", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) {
			progress = observeBatteryPowerAcceptance(progress, sample(minute, 65, -3450, 3500, 500), 7).progress;
		}

		const baseline = [...progress.bins["30-80"].samples];

		const limited = observeBatteryPowerAcceptance(progress, sample(6, 65, -1400, 3500, 650), 7);
		expect(limited.capabilityStatus).to.equal("limited");
		expect(limited.progress.bins["30-80"].samples).to.deep.equal(baseline);

		const recovering = observeBatteryPowerAcceptance(limited.progress, sample(7, 65, -2800, 3500, 500), 7);
		expect(recovering.capabilityStatus).to.equal("recovering");
		expect(recovering.progress.activeEpisode).not.to.equal(null);
		expect(recovering.progress.bins["30-80"].samples).to.deep.equal(baseline);

		const recovered = observeBatteryPowerAcceptance(recovering.progress, sample(8, 65, -3300, 3500, 500), 7);
		expect(recovered.capabilityStatus).to.equal("recovered");
		expect(recovered.progress.activeEpisode).to.equal(null);
		expect(recovered.progress.bins["30-80"].samples).to.deep.equal([...baseline, 3300]);
	});

	it("keeps a charge limitation episode across midnight until recovery is proven", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T23:50:00.000Z");

		for (let minute = 51; minute <= 55; minute += 1) {
			progress = observeBatteryPowerAcceptance(progress, {
				...sample(1, 65, -3450, 3500, 500),
				timestamp: `2026-09-08T23:${minute}:00.000Z`,
			}, 7).progress;
		}

		const limited = observeBatteryPowerAcceptance(progress, {
			...sample(1, 65, -1400, 3500, 650),
			timestamp: "2026-09-08T23:59:00.000Z",
		}, 7);

		expect(limited.capabilityStatus).to.equal("limited");
		expect(limited.progress.activeEpisode).not.to.equal(null);

		const baseline = [...limited.progress.bins["30-80"].samples];

		const recovering = observeBatteryPowerAcceptance(limited.progress, {
			...sample(1, 65, -2800, 3500, 500),
			timestamp: "2026-09-09T00:01:00.000Z",
		}, 7);

		expect(recovering.progress.day).to.equal("2026-09-09");
		expect(recovering.capabilityStatus).to.equal("recovering");
		expect(recovering.progress.activeEpisode?.startedAt).to.equal("2026-09-08T23:59:00.000Z");
		expect(recovering.progress.bins["30-80"].samples).to.deep.equal(baseline);

		const recovered = observeBatteryPowerAcceptance(recovering.progress, {
			...sample(1, 65, -3300, 3500, 500),
			timestamp: "2026-09-09T00:02:00.000Z",
		}, 7);

		expect(recovered.capabilityStatus).to.equal("recovered");
		expect(recovered.progress.activeEpisode).to.equal(null);
		expect(recovered.progress.recoveryEvents).to.equal(1);
		expect(recovered.progress.lastRecoveryDurationMinutes).to.equal(3);
	});

	it("migrates schema 1 baselines without inventing limitation history", () => {
		const old = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z") as unknown as Record<string, unknown>;
		old.schemaVersion = 1;
		delete old.activeEpisode;
		delete old.limitationEvents;
		delete old.recoveryEvents;
		delete old.lastRecoveryAt;
		delete old.lastRecoveryDurationMinutes;
		const migrated = normalizeBatteryPowerAcceptanceProgress(old as never, "2026-09-08T12:10:00.000Z");
		expect(migrated.schemaVersion).to.equal(2);
		expect(migrated.activeEpisode).to.equal(null);
		expect(migrated.limitationEvents).to.equal(0);
		expect(migrated.recoveryEvents).to.equal(0);
	});

	it("integrates charging and discharging throughput independently", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		progress = observeBatteryPowerAcceptance(progress, sample(0, 80, -1000), 7).progress;
		progress = observeBatteryPowerAcceptance(progress, sample(1, 80, -1000), 7).progress;
		progress = observeBatteryPowerAcceptance(progress, { ...sample(2, 80, 1000, 0, 0), direction: "discharging" as const }, 7).progress;
		const result = observeBatteryPowerAcceptance(progress, { ...sample(3, 80, 1000, 0, 0), direction: "discharging" as const }, 7);
		expect(result.chargedEnergyTodayKwh).to.be.greaterThan(0);
		expect(result.dischargedEnergyTodayKwh).to.be.greaterThan(0);
		expect(result.throughputTodayKwh).to.be.greaterThan(result.chargedEnergyTodayKwh);
		expect(result.equivalentFullCyclesToday).to.be.greaterThan(0);
	});
});
