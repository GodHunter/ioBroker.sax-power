import { strict as assert } from "node:assert";
import { StrategyHouseholdLoadModel } from "./strategyHouseholdLoadModel";

describe("strategy household load model", () => {
	it("learns the active 15 minute slot and reports remaining energy", () => {
		const model = new StrategyHouseholdLoadModel();
		for (const power of [400, 600, 800, 2_000]) {
			model.addObservation(new Date(2026, 8, 4, 18, 5).getTime(), power);
		}

		const status = model.status(
			new Date(2026, 8, 4, 18, 5),
			new Date(2026, 8, 4, 18, 14),
		);
		assert.equal(status.current.samples, 4);
		assert.equal(status.current.expectedWh, 200);
		assert.equal(status.expectedRemainingEnergyWh, 200);
		assert.equal(status.totalSamples, 4);
		assert.equal(status.confidence, "established");
	});

	it("keeps weekday and weekend observations separate", () => {
		const model = new StrategyHouseholdLoadModel();
		model.addObservation(new Date(2026, 8, 4, 18, 5).getTime(), 800);

		const weekend = model.status(
			new Date(2026, 8, 5, 18, 5),
			new Date(2026, 8, 5, 18, 14),
		);
		assert.equal(weekend.current.samples, 0);
		assert.equal(weekend.confidence, "learning");
	});

	it("round-trips its persistent snapshot", () => {
		const original = new StrategyHouseholdLoadModel();
		original.addObservation(new Date(2026, 8, 4, 15, 5).getTime(), 1_200);
		const restored = new StrategyHouseholdLoadModel(original.snapshot());

		const status = restored.status(
			new Date(2026, 8, 4, 15, 5),
			new Date(2026, 8, 4, 15, 14),
		);
		assert.equal(status.current.samples, 1);
		assert.equal(status.current.expectedWh, 300);
		assert.equal(status.totalSamples, 1);
	});

	it("ignores malformed restored slots", () => {
		const model = new StrategyHouseholdLoadModel({
			version: 1,
			slots: [{
				dayClass: "weekday",
				slotIndex: 200,
				samplesWh: [100],
			}],
		});
		assert.equal(
			model.status(new Date(2026, 8, 4, 15, 5), new Date(2026, 8, 4, 15, 14)).totalSamples,
			0,
		);
	});
});
