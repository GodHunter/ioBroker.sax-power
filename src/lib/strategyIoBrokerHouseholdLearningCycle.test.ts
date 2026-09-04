import { strict as assert } from "node:assert";
import {
	createStrategyIoBrokerHouseholdLearningCycle,
} from "./strategyIoBrokerHouseholdLearningCycle";
import { STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS } from "./strategyHouseholdLearningStates";

function state(val: number, ts: number): ioBroker.State {
	return { val, ack: true, ts, lc: ts, from: "system.adapter.test.0", q: 0 };
}

describe("strategy ioBroker household learning cycle", () => {
	it("derives household power and publishes diagnostics", async () => {
		const now = new Date(2026, 8, 4, 18, 5).getTime();
		const values = new Map<string, unknown>();
		const foreign = new Map<string, ioBroker.State>([
			["pv.power", state(5_000, now)],
			["battery.power", state(-2_500, now)],
			["grid.power", state(-500, now)],
		]);
		const adapter = {
			extendObjectAsync: async (): Promise<void> => undefined,
			getForeignStateAsync: async (id: string): Promise<ioBroker.State | null> => foreign.get(id) ?? null,
			getStateAsync: async (): Promise<ioBroker.State | null> => null,
			setStateAsync: async (id: string, value: ioBroker.SettableState): Promise<void> => { values.set(id, value.val); },
		};
		const cycle = createStrategyIoBrokerHouseholdLearningCycle(adapter, {
			enabled: true,
			pvPowerStateId: "pv.power",
			batteryPowerStateId: "battery.power",
			gridPowerStateId: "grid.power",
		});

		await cycle.runOnce(now, new Date(2026, 8, 4, 20, 0).getTime());

		assert.equal(values.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.currentPowerW), 2_000);
		assert.equal(values.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.source), "pv-grid-battery");
		assert.equal(values.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.totalSamples), 0);
	});

	it("commits one averaged sample when the 15 minute slot changes", async () => {
		const start = new Date(2026, 8, 4, 18, 1).getTime();
		let currentNow = start;
		const values = new Map<string, unknown>();
		const adapter = {
			extendObjectAsync: async (): Promise<void> => undefined,
			getForeignStateAsync: async (id: string): Promise<ioBroker.State | null> => {
				if (id === "pv.power") return state(2_000, currentNow);
				if (id === "battery.power") return state(0, currentNow);
				if (id === "grid.power") return state(-1_000, currentNow);
				return null;
			},
			getStateAsync: async (): Promise<ioBroker.State | null> => null,
			setStateAsync: async (id: string, value: ioBroker.SettableState): Promise<void> => { values.set(id, value.val); },
		};
		const cycle = createStrategyIoBrokerHouseholdLearningCycle(adapter, {
			enabled: true,
			pvPowerStateId: "pv.power",
			batteryPowerStateId: "battery.power",
			gridPowerStateId: "grid.power",
		});

		await cycle.runOnce(currentNow, currentNow);
		currentNow = new Date(2026, 8, 4, 18, 10).getTime();
		await cycle.runOnce(currentNow, currentNow);
		currentNow = new Date(2026, 8, 4, 18, 16).getTime();
		await cycle.runOnce(currentNow, currentNow);

		assert.equal(values.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.totalSamples), 1);
		assert.equal(values.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.confidence), "learning");
	});

	it("does not invent daytime household power without a PV state", async () => {
		const now = new Date(2026, 8, 4, 12, 0).getTime();
		const values = new Map<string, unknown>();
		const adapter = {
			extendObjectAsync: async (): Promise<void> => undefined,
			getForeignStateAsync: async (): Promise<ioBroker.State | null> => null,
			getStateAsync: async (): Promise<ioBroker.State | null> => null,
			setStateAsync: async (id: string, value: ioBroker.SettableState): Promise<void> => { values.set(id, value.val); },
		};
		const cycle = createStrategyIoBrokerHouseholdLearningCycle(adapter, {
			enabled: true,
			pvPowerStateId: null,
			batteryPowerStateId: "battery.power",
			gridPowerStateId: "grid.power",
		});

		await cycle.runOnce(now, now);

		assert.equal(values.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.currentPowerW), null);
		assert.equal(values.get(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.source), "unavailable");
	});
});
