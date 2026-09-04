import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT,
	addStrategyHouseholdLoadSample,
	createEmptyStrategyHouseholdLoadSlot,
	estimateStrategyHouseholdLoad,
	resolveStrategyHouseholdDayClass,
	resolveStrategyHouseholdLoadSlotIndex,
} from "./strategyHouseholdLoadLearning";

describe("strategy household load learning", () => {
	it("separates weekday and weekend", () => {
		assert.equal(resolveStrategyHouseholdDayClass(new Date(2026, 8, 4, 15, 0)), "weekday");
		assert.equal(resolveStrategyHouseholdDayClass(new Date(2026, 8, 5, 15, 0)), "weekend");
	});

	it("maps local time into 15 minute slots", () => {
		assert.equal(resolveStrategyHouseholdLoadSlotIndex(new Date(2026, 8, 4, 0, 0)), 0);
		assert.equal(resolveStrategyHouseholdLoadSlotIndex(new Date(2026, 8, 4, 15, 37)), 62);
		assert.equal(resolveStrategyHouseholdLoadSlotIndex(new Date(2026, 8, 4, 23, 59)), 95);
	});

	it("learns energy and uses p75 after four samples", () => {
		let slot = createEmptyStrategyHouseholdLoadSlot("weekday", 72); // 18:00
		for (const power of [400, 600, 800, 2000]) {
			slot = addStrategyHouseholdLoadSample(slot, {
				timestampMs: new Date(2026, 8, 4, 18, 5).getTime(),
				averagePowerW: power,
			});
		}
		const estimate = estimateStrategyHouseholdLoad(slot);
		assert.equal(estimate.samples, 4);
		assert.equal(estimate.meanWh, 237.5);
		assert.equal(estimate.medianWh, 175);
		assert.equal(estimate.p75Wh, 200);
		assert.equal(estimate.expectedWh, 200);
	});

	it("rejects samples from another slot or day class", () => {
		const slot = createEmptyStrategyHouseholdLoadSlot("weekday", 72);
		const wrongTime = addStrategyHouseholdLoadSample(slot, {
			timestampMs: new Date(2026, 8, 4, 19, 5).getTime(),
			averagePowerW: 1000,
		});
		const weekend = addStrategyHouseholdLoadSample(slot, {
			timestampMs: new Date(2026, 8, 5, 18, 5).getTime(),
			averagePowerW: 1000,
		});
		assert.equal(wrongTime.samplesWh.length, 0);
		assert.equal(weekend.samplesWh.length, 0);
	});

	it("bounds retained history per slot", () => {
		let slot = createEmptyStrategyHouseholdLoadSlot("weekday", 72);
		for (let index = 0; index < HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT + 5; index += 1) {
			slot = addStrategyHouseholdLoadSample(slot, {
				timestampMs: new Date(2026, 8, 4, 18, 5).getTime(),
				averagePowerW: 400 + index,
			});
		}
		assert.equal(slot.samplesWh.length, HOUSEHOLD_LOAD_MAX_SAMPLES_PER_SLOT);
	});
});
