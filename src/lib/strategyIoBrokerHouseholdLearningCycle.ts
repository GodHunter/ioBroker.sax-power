import { createStrategyHouseholdLoadObservation } from "./strategyHouseholdLoadObservation";
import { StrategyHouseholdLoadCollector } from "./strategyHouseholdLoadCollector";
import {
	StrategyHouseholdLoadModel,
	type StrategyHouseholdLoadModelSnapshot,
} from "./strategyHouseholdLoadModel";
import {
	STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS,
	publishStrategyHouseholdLearning,
	type StrategyHouseholdLearningIoBrokerAdapter,
	type StrategyHouseholdLearningSource,
} from "./strategyHouseholdLearningStates";

const MAXIMUM_INPUT_AGE_MS = 120_000;

export interface StrategyIoBrokerHouseholdLearningAdapter extends StrategyHouseholdLearningIoBrokerAdapter {
	getForeignStateAsync(stateId: string): Promise<ioBroker.State | null | undefined>;
	getStateAsync(stateId: string): Promise<ioBroker.State | null | undefined>;
}

export interface StrategyIoBrokerHouseholdLearningConfiguration {
	readonly enabled: boolean;
	readonly pvPowerStateId: string | null;
	readonly batteryPowerStateId: string;
	readonly gridPowerStateId: string;
}

export interface StrategyIoBrokerHouseholdLearningCycle {
	readonly runOnce: (nowMs?: number, untilMs?: number) => Promise<void>;
}

function numericFreshValue(state: ioBroker.State | null | undefined, nowMs: number): number | null {
	if (state === null || state === undefined) return null;
	if (typeof state.val !== "number" || !Number.isFinite(state.val)) return null;
	if (state.q !== undefined && state.q !== 0) return null;
	if (state.ack !== true) return null;
	if (!Number.isFinite(state.ts) || nowMs - state.ts > MAXIMUM_INPUT_AGE_MS) return null;
	return state.val;
}

function parseSnapshot(value: unknown): StrategyHouseholdLoadModelSnapshot | null {
	if (typeof value !== "string" || value.trim().length === 0) return null;
	try {
		const parsed = JSON.parse(value) as Partial<StrategyHouseholdLoadModelSnapshot>;
		if (parsed.version !== 1 || !Array.isArray(parsed.slots)) return null;
		return parsed as StrategyHouseholdLoadModelSnapshot;
	} catch {
		return null;
	}
}

function expectedPowerW(expectedWh: number): number {
	return Math.round(expectedWh * 4);
}

export function createStrategyIoBrokerHouseholdLearningCycle(
	adapter: StrategyIoBrokerHouseholdLearningAdapter,
	configuration: StrategyIoBrokerHouseholdLearningConfiguration,
): StrategyIoBrokerHouseholdLearningCycle {
	const collector = new StrategyHouseholdLoadCollector();
	let model: StrategyHouseholdLoadModel | null = null;

	async function loadModel(): Promise<StrategyHouseholdLoadModel> {
		if (model !== null) return model;
		const state = await adapter.getStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.modelSnapshot);
		model = new StrategyHouseholdLoadModel(parseSnapshot(state?.val));
		return model;
	}

	return Object.freeze({
		runOnce: async (nowMs = Date.now(), untilMs = nowMs): Promise<void> => {
			if (!configuration.enabled) return;

			const activeModel = await loadModel();
			let currentPowerW: number | null = null;
			let source: StrategyHouseholdLearningSource = "unavailable";

			if (configuration.pvPowerStateId !== null) {
				const [pvState, batteryState, gridState] = await Promise.all([
					adapter.getForeignStateAsync(configuration.pvPowerStateId),
					adapter.getForeignStateAsync(configuration.batteryPowerStateId),
					adapter.getForeignStateAsync(configuration.gridPowerStateId),
				]);
				const pvPowerW = numericFreshValue(pvState, nowMs);
				const batteryPowerW = numericFreshValue(batteryState, nowMs);
				const gridPowerW = numericFreshValue(gridState, nowMs);

				if (pvPowerW !== null && batteryPowerW !== null && gridPowerW !== null) {
					const observation = createStrategyHouseholdLoadObservation({
						pvPowerW,
						gridPowerW,
						batteryPowerW,
					});
					const observedPowerW = observation.householdPowerW;
					if (observation.available && observedPowerW !== null) {
						currentPowerW = observedPowerW;
						source = "pv-grid-battery";
						const completed = collector.addObservation(nowMs, observedPowerW);
						if (completed !== null) {
							activeModel.addObservation(completed.timestampMs, completed.averagePowerW);
						}
					}
				}
			}

			const status = activeModel.status(new Date(nowMs), new Date(Math.max(nowMs, untilMs)));
			await publishStrategyHouseholdLearning(adapter, {
				currentPowerW,
				expectedPowerW: status.current.available ? expectedPowerW(status.current.expectedWh) : null,
				expectedRemainingEnergyWh: status.expectedRemainingEnergyWh,
				totalSamples: status.totalSamples,
				confidence: status.confidence,
				source,
				lastUpdate: nowMs,
				modelSnapshot: JSON.stringify(activeModel.snapshot()),
			});
		},
	});
}
