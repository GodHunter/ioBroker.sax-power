export const STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS = Object.freeze({
	currentPowerW: "strategy.learning.household.currentPowerW",
	expectedPowerW: "strategy.learning.household.expectedPowerW",
	expectedRemainingEnergyWh: "strategy.learning.household.expectedRemainingEnergyWh",
	totalSamples: "strategy.learning.household.samples",
	confidence: "strategy.learning.household.confidence",
	source: "strategy.learning.household.source",
	lastUpdate: "strategy.learning.household.lastUpdate",
	modelSnapshot: "strategy.learning.household.modelSnapshot",
});

export type StrategyHouseholdLearningSource =
	| "pv-grid-battery"
	| "unavailable";

export interface StrategyHouseholdLearningPublication {
	readonly currentPowerW: number | null;
	readonly expectedPowerW: number | null;
	readonly expectedRemainingEnergyWh: number;
	readonly totalSamples: number;
	readonly confidence: "none" | "learning" | "established";
	readonly source: StrategyHouseholdLearningSource;
	readonly lastUpdate: number;
	readonly modelSnapshot: string;
}

export interface StrategyHouseholdLearningIoBrokerAdapter {
	extendObjectAsync(stateId: string, object: ioBroker.PartialObject): Promise<unknown>;
	setStateAsync(stateId: string, state: ioBroker.SettableState): Promise<unknown>;
}

export async function ensureStrategyHouseholdLearningStates(
	adapter: StrategyHouseholdLearningIoBrokerAdapter,
): Promise<void> {
	await adapter.extendObjectAsync("strategy.learning", {
		type: "channel",
		common: { name: "Strategy learning" },
		native: {},
	});
	await adapter.extendObjectAsync("strategy.learning.household", {
		type: "channel",
		common: { name: "Household load learning" },
		native: {},
	});

	const definitions: readonly Readonly<{
		id: string;
		name: string;
		desc: string;
		type: "number" | "string";
		role: string;
		unit?: "W" | "Wh" | "ms";
	}>[] = [
		{ id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.currentPowerW, name: "Current household power", desc: "Household power derived from PV, grid and battery flows when an actual PV power state is available.", type: "number", role: "value.power", unit: "W" },
		{ id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedPowerW, name: "Expected household power", desc: "Learned expected household power for the current 15 minute time slot.", type: "number", role: "value.power", unit: "W" },
		{ id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedRemainingEnergyWh, name: "Expected remaining household energy", desc: "Learned household energy expected for the remaining planning window.", type: "number", role: "value.energy", unit: "Wh" },
		{ id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.totalSamples, name: "Household learning samples", desc: "Number of observations retained by the household load model.", type: "number", role: "value" },
		{ id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.confidence, name: "Household learning confidence", desc: "Learning maturity of the current household load profile.", type: "string", role: "text" },
		{ id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.source, name: "Household load source", desc: "Measurement basis used for the current household load observation.", type: "string", role: "text" },
		{ id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.lastUpdate, name: "Household learning last update", desc: "Timestamp of the latest household learning publication.", type: "number", role: "value.time", unit: "ms" },
		{ id: STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.modelSnapshot, name: "Household learning model snapshot", desc: "Persistent compact JSON snapshot of the learned household load model.", type: "string", role: "json" },
	];

	for (const definition of definitions) {
		await adapter.extendObjectAsync(definition.id, {
			type: "state",
			common: {
				name: definition.name,
				desc: definition.desc,
				type: definition.type,
				role: definition.role,
				read: true,
				write: false,
				...(definition.unit === undefined ? {} : { unit: definition.unit }),
			},
			native: {},
		});
	}
}

export async function publishStrategyHouseholdLearning(
	adapter: StrategyHouseholdLearningIoBrokerAdapter,
	publication: StrategyHouseholdLearningPublication,
): Promise<void> {
	await Promise.all([
		adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.currentPowerW, { val: publication.currentPowerW, ack: true }),
		adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedPowerW, { val: publication.expectedPowerW, ack: true }),
		adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedRemainingEnergyWh, { val: publication.expectedRemainingEnergyWh, ack: true }),
		adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.totalSamples, { val: publication.totalSamples, ack: true }),
		adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.confidence, { val: publication.confidence, ack: true }),
		adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.source, { val: publication.source, ack: true }),
		adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.lastUpdate, { val: publication.lastUpdate, ack: true }),
		adapter.setStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.modelSnapshot, { val: publication.modelSnapshot, ack: true }),
	]);
}
