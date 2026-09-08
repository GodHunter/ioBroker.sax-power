import { expect } from "chai";
import {
	createBatteryPowerAcceptanceProgress,
	observeBatteryPowerAcceptance,
} from "./batteryPowerAcceptanceLearning";

function sample(
	minute: number,
	soc: number,
	batteryPower: number,
	requestedChargePowerW = 3500,
	gridExportPowerW = 300,
) {
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
		const result = observeBatteryPowerAcceptance(
			createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z"),
			sample(1, 95, -900, 3500, 0),
			7,
		);
		expect(result.progress.bins["94-96"].observedSamples).to.equal(1);
		expect(result.progress.bins["94-96"].samples).to.deep.equal([]);
		expect(result.stressIndex).to.equal(null);
	});

	it("does not learn an R44-limited sample even while exporting", () => {
		const result = observeBatteryPowerAcceptance(
			createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z"),
			sample(1, 95, -700, 700, 800),
			7,
		);
		expect(result.progress.bins["94-96"].observedSamples).to.equal(1);
		expect(result.progress.bins["94-96"].samples).to.deep.equal([]);
		expect(result.stressIndex).to.equal(null);
	});

	it("publishes stress only after a learned SOC-specific baseline", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) {
			progress = observeBatteryPowerAcceptance(progress, sample(minute, 95, -2000), 7).progress;
		}
		const result = observeBatteryPowerAcceptance(progress, sample(6, 95, -1400), 7);
		expect(result.confidence).to.equal("established");
		expect(result.expectedAcceptancePowerW).to.equal(2000);
		expect(result.acceptanceDeviationPercent).to.equal(-30);
		expect(result.stressIndex).to.equal(30);
		expect(result.stressStatus).to.equal("elevated");
	});

	it("does not report stress when the current sample is controller-limited", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		for (let minute = 1; minute <= 5; minute += 1) {
			progress = observeBatteryPowerAcceptance(progress, sample(minute, 95, -2000), 7).progress;
		}
		const result = observeBatteryPowerAcceptance(progress, sample(6, 95, -700, 700, 800), 7);
		expect(result.confidence).to.equal("established");
		expect(result.acceptanceDeviationPercent).to.equal(-65);
		expect(result.stressIndex).to.equal(null);
		expect(result.stressStatus).to.equal("learning");
	});

	it("integrates charging and discharging throughput independently", () => {
		let progress = createBatteryPowerAcceptanceProgress("2026-09-08T12:00:00.000Z");
		progress = observeBatteryPowerAcceptance(progress, sample(0, 80, -1000), 7).progress;
		progress = observeBatteryPowerAcceptance(progress, sample(1, 80, -1000), 7).progress;
		const firstDischarge = {
			...sample(2, 80, 1000, 0, 0),
			direction: "discharging" as const,
		};
		progress = observeBatteryPowerAcceptance(progress, firstDischarge, 7).progress;
		const secondDischarge = {
			...sample(3, 80, 1000, 0, 0),
			direction: "discharging" as const,
		};
		const result = observeBatteryPowerAcceptance(progress, secondDischarge, 7);
		expect(result.chargedEnergyTodayKwh).to.be.greaterThan(0);
		expect(result.dischargedEnergyTodayKwh).to.be.greaterThan(0);
		expect(result.throughputTodayKwh).to.be.greaterThan(result.chargedEnergyTodayKwh);
		expect(result.equivalentFullCyclesToday).to.be.greaterThan(0);
	});
});