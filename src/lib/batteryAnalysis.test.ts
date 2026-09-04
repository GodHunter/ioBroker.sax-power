import { expect } from "chai";
import { calculateAggregateEquivalentFullCycles, calculateEquivalentFullCycles, getBatteryModel } from "./batteryAnalysis";

const energy = (chargedKwh: number, dischargedKwh: number) => ({
	chargedKwh, dischargedKwh, gridImportKwh: 0, gridExportKwh: 0, pvKwh: 0,
});

describe("battery analysis", () => {
	it("contains the documented capacities and technical power limits", () => {
		expect(getBatteryModel("home-5.8")).to.include({
		 nominalCapacityKwh: 5.76,
		 usableCapacityKwh: 5.2,
		 maximumChargePowerW: 2500,
		 maximumDischargePowerW: 4600,
	});
		expect(getBatteryModel("home-plus-7.7")).to.include({
		 nominalCapacityKwh: 7.68,
		 usableCapacityKwh: 7,
		 maximumChargePowerW: 3500,
		 maximumDischargePowerW: 4600,
	});
	});

	it("calculates equivalent full cycles", () => {
		expect(calculateEquivalentFullCycles(energy(5.76, 5.76), 5.76)).to.equal(1);
		expect(calculateEquivalentFullCycles(energy(2711.74, 2433.62), 5.76)).to.equal(446.646);
	});

	it("weights aggregate cycles by capacity", () => {
		expect(calculateAggregateEquivalentFullCycles([
			{ energy: energy(5.76, 5.76), nominalCapacityKwh: 5.76 },
			{ energy: energy(15.36, 15.36), nominalCapacityKwh: 7.68 },
	])).to.equal(1.571);
	});

	it("does not invent a result without capacity", () => {
		expect(calculateEquivalentFullCycles(energy(1, 1), 0)).to.equal(null);
		expect(calculateAggregateEquivalentFullCycles([])).to.equal(null);
	});
});
