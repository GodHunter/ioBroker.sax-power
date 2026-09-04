import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS,
	ensureStrategyHouseholdLearningStates,
	publishStrategyHouseholdLearning,
} from "./strategyHouseholdLearningStates";

describe("strategy household learning states", () => {
	it("creates the household learning state tree", async () => {
		const objects: string[] = [];
		const adapter = {
			extendObjectAsync: async (id: string): Promise<void> => { objects.push(id); },
			setStateAsync: async (): Promise<void> => undefined,
		};

		await ensureStrategyHouseholdLearningStates(adapter);

		assert.ok(objects.includes("strategy.learning"));
		assert.ok(objects.includes("strategy.learning.household"));
		for (const id of Object.values(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS)) {
			assert.ok(objects.includes(id));
		}
	});

	it("publishes diagnostic values and the persistent model snapshot", async () => {
		const states = new Map<string, unknown>();
		const adapter = {
			extendObjectAsync: async (): Promise<void> => undefined,
			setStateAsync: async (id: string, state: ioBroker.SettableState): Promise<void> => {
				states.set(id, state.val);
			},
		};

		await publishStrategyHouseholdLearning(adapter, {
			currentPowerW: 1234,
			expectedPowerW: 900,
			expectedRemainingEnergyWh: 4200,
			totalSamples: 18,
			confidence: "learning",
			source: "pv-grid-battery",
			lastUpdate: 123456,
			modelSnapshot: "{\"version\":1,\"slots\":[]}",
		});

		assert.equal(states.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.currentPowerW), 1234);
		assert.equal(states.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedPowerW), 900);
		assert.equal(states.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedRemainingEnergyWh), 4200);
		assert.equal(states.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.totalSamples), 18);
		assert.equal(states.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.confidence), "learning");
		assert.equal(states.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.source), "pv-grid-battery");
		assert.equal(states.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.modelSnapshot), "{\"version\":1,\"slots\":[]}");
	});
});
