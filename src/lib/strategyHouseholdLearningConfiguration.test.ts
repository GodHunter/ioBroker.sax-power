import { strict as assert } from "node:assert";
import { validateStrategyHouseholdLearningConfiguration } from "./strategyHouseholdLearningConfiguration";

describe("strategy household learning source configuration", () => {
	it("accepts an optional direct PV power state", () => {
		const result = validateStrategyHouseholdLearningConfiguration({
			enabled: true,
			pvPowerSourceMode: "state",
			pvPowerStateId: "modbus.0.holdingRegisters.40083_PV_Power",
			pvNominalPowerWp: 10_000,
		});
		assert.equal(result.valid, true);
		if (!result.valid) return;
		assert.equal(result.configuration.pvPowerStateId, "modbus.0.holdingRegisters.40083_PV_Power");
		assert.equal(result.configuration.pvNominalPowerWp, 10_000);
	});

	it("works without direct PV measurement", () => {
		const result = validateStrategyHouseholdLearningConfiguration({
			enabled: true,
			pvPowerSourceMode: "none",
			pvPowerStateId: undefined,
			pvNominalPowerWp: 9_900,
		});
		assert.equal(result.valid, true);
		if (!result.valid) return;
		assert.equal(result.configuration.pvPowerStateId, null);
		assert.equal(result.configuration.pvNominalPowerWp, 9_900);
	});

	it("does not treat nominal PV power as a live measurement", () => {
		const result = validateStrategyHouseholdLearningConfiguration({
			enabled: true,
			pvPowerSourceMode: "none",
			pvPowerStateId: "ignored.state",
			pvNominalPowerWp: 12_000,
		});
		assert.equal(result.valid, true);
		if (!result.valid) return;
		assert.equal(result.configuration.pvPowerStateId, null);
	});

	it("requires a state id only in state mode", () => {
		const result = validateStrategyHouseholdLearningConfiguration({
			enabled: true,
			pvPowerSourceMode: "state",
			pvPowerStateId: " ",
			pvNominalPowerWp: null,
		});
		assert.equal(result.valid, false);
		if (result.valid) return;
		assert.deepEqual(result.issues, [{ field: "pvPowerStateId", reason: "invalid-state-id" }]);
	});

	it("rejects invalid nominal PV power", () => {
		for (const pvNominalPowerWp of [0, -1, Number.NaN, "10000"]) {
			const result = validateStrategyHouseholdLearningConfiguration({
				enabled: true,
				pvPowerSourceMode: "none",
				pvPowerStateId: undefined,
				pvNominalPowerWp,
			});
			assert.equal(result.valid, false);
		}
	});
});
