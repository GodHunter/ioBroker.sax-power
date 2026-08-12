import { expect } from "chai";

import { getBatteryModel } from "./batteryAnalysis";
import {
	estimateStrategyChargeDuration,
	PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS,
	resolveStrategyBatteryTechnicalLimits,
} from "./strategyBatteryChargeCapability";

function model(id: "home-5.8" | "home-plus-7.7") {
	const result = getBatteryModel(id);
	expect(result).to.not.equal(null);
	return result!;
}

describe("strategy battery charge capability", () => {
	it("resolves manufacturer limits from the selected battery model", () => {
		expect(resolveStrategyBatteryTechnicalLimits(model("home-5.8")))
			.to.deep.equal({
				batteryModelId: "home-5.8",
				usableCapacityWh: 5_200,
				maximumChargePowerW: 2_500,
				maximumDischargePowerW: 4_600,
				source: "manufacturer-specification",
			});
		expect(resolveStrategyBatteryTechnicalLimits(model("home-plus-7.7")))
			.to.deep.equal({
				batteryModelId: "home-plus-7.7",
				usableCapacityWh: 7_000,
				maximumChargePowerW: 3_500,
				maximumDischargePowerW: 4_600,
				source: "manufacturer-specification",
			});
	});

	it("uses the lower of manufacturer and configured charge limits", () => {
		const manufacturerLimited = estimateStrategyChargeDuration(
			model("home-5.8"), 50, 60, 4_000,
		);
		const userLimited = estimateStrategyChargeDuration(
			model("home-plus-7.7"), 50, 60, 1_000,
		);

		expect(manufacturerLimited?.segments[0].effectiveChargePowerW)
			.to.equal(2_500);
		expect(userLimited?.segments[0].effectiveChargePowerW)
			.to.equal(1_000);
		expect(manufacturerLimited?.provisional).to.equal(false);
	});

	it("applies the provisional taper only above 93 percent SOC", () => {
		const result = estimateStrategyChargeDuration(
			model("home-plus-7.7"), 92, 100, 3_500,
		);

		expect(result?.segments.map(segment => ({
			range: [
				segment.minimumStateOfChargePercent,
				segment.maximumStateOfChargePercent,
			],
			power: segment.effectiveChargePowerW,
			source: segment.powerSource,
		}))).to.deep.equal([
			{ range: [92, 93], power: 3_500, source: "manufacturer-specification" },
			{ range: [93, 94], power: 1_800, source: "provisional-influx-estimate" },
			{ range: [94, 95], power: 1_500, source: "provisional-influx-estimate" },
			{ range: [95, 96], power: 1_200, source: "provisional-influx-estimate" },
			{ range: [96, 97], power: 900, source: "provisional-influx-estimate" },
			{ range: [97, 98], power: 550, source: "provisional-influx-estimate" },
			{ range: [98, 99], power: 250, source: "provisional-influx-estimate" },
			{ range: [99, 100], power: 150, source: "provisional-influx-estimate" },
		]);
		expect(result?.provisional).to.equal(true);
	});

	it("calculates the energy and piecewise duration to the target SOC", () => {
		const result = estimateStrategyChargeDuration(
			model("home-5.8"), 90, 95, 2_000,
		);

		expect(result?.requiredChargeEnergyWh).to.equal(260);
		expect(result?.segments).to.have.length(3);
		expect(result?.estimatedDurationSeconds).to.be.closeTo(
			280.8 + 104 + 124.8,
			1e-10,
		);
	});

	it("returns a zero-duration immutable estimate at the target SOC", () => {
		const result = estimateStrategyChargeDuration(
			model("home-5.8"), 100, 100, 2_500,
		);

		expect(result).to.deep.equal({
			batteryModelId: "home-5.8",
			requiredChargeEnergyWh: 0,
			estimatedDurationSeconds: 0,
			segments: [],
			provisional: false,
		});
		expect(Object.isFrozen(result)).to.equal(true);
		expect(Object.isFrozen(result?.segments)).to.equal(true);
	});

	it("fails closed for invalid SOC, power or model capacity", () => {
		for (const input of [
			[-1, 50, 2_500],
			[60, 50, 2_500],
			[50, 101, 2_500],
			[50, 60, 0],
			[50, 60, Number.NaN],
		]) {
			expect(estimateStrategyChargeDuration(
				model("home-5.8"), input[0], input[1], input[2],
			)).to.equal(null);
		}

		expect(resolveStrategyBatteryTechnicalLimits({
			...model("home-5.8"),
			usableCapacityKwh: 0,
		})).to.equal(null);
	});

	it("publishes an immutable provisional curve without mutating the model", () => {
		const batteryModel = model("home-plus-7.7");
		const before = { ...batteryModel };
		const result = estimateStrategyChargeDuration(
			batteryModel, 95, 97, 3_500,
		);

		expect(Object.isFrozen(PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS))
			.to.equal(true);
		expect(PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS.every(Object.isFrozen))
			.to.equal(true);
		expect(Object.isFrozen(result)).to.equal(true);
		expect(Object.isFrozen(result?.segments)).to.equal(true);
		expect(batteryModel).to.deep.equal(before);
	});
});
