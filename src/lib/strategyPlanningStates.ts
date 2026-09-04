import type { StrategyPlanningDiagnostics } from "./strategyPlanning";

export const STRATEGY_PLANNING_STATE_IDS = Object.freeze({
	householdEnergyRemainingWh: "strategy.planning.householdEnergyRemainingWh",
	forecastEnergyRemainingWh: "strategy.planning.forecastEnergyRemainingWh",
	batteryAvailableEnergyWh: "strategy.planning.batteryAvailableEnergyWh",
	householdLearningApplied: "strategy.planning.householdLearningApplied",
	householdLearningConfidence: "strategy.planning.householdLearningConfidence",
	lastUpdate: "strategy.planning.lastUpdate",
});

export interface StrategyPlanningPublication extends StrategyPlanningDiagnostics {
	readonly lastUpdate: number;
}

export interface StrategyPlanningIoBrokerAdapter {
	extendObjectAsync(stateId: string, object: ioBroker.PartialObject): Promise<unknown>;
	setStateAsync(stateId: string, state: ioBroker.SettableState): Promise<unknown>;
}

export async function ensureStrategyPlanningStates(
	adapter: StrategyPlanningIoBrokerAdapter,
): Promise<void> {
	await adapter.extendObjectAsync("strategy.planning", {
		type: "channel",
		common: { name: "Strategy planning" },
		native: {},
	});

	const definitions: readonly Readonly<{
		id: string;
		name: string;
		desc: string;
		type: "boolean" | "number" | "string";
		role: string;
		unit?: "Wh" | "ms";
	}>[] = [
		{ id: STRATEGY_PLANNING_STATE_IDS.householdEnergyRemainingWh, name: "Expected remaining household energy", desc: "Learned household energy expected for the remaining planning window.", type: "number", role: "value.energy", unit: "Wh" },
		{ id: STRATEGY_PLANNING_STATE_IDS.forecastEnergyRemainingWh, name: "Remaining PV forecast energy", desc: "Raw PVForecast energy remaining until the end of the day used by the planning diagnostics.", type: "number", role: "value.energy", unit: "Wh" },
		{ id: STRATEGY_PLANNING_STATE_IDS.batteryAvailableEnergyWh, name: "Battery-available forecast energy", desc: "Diagnostic net PV energy after learned household consumption and the configured forecast reserve. This value does not control register 44 yet.", type: "number", role: "value.energy", unit: "Wh" },
		{ id: STRATEGY_PLANNING_STATE_IDS.householdLearningApplied, name: "Household learning applied", desc: "Whether learned household consumption currently affects the automatic charging command.", type: "boolean", role: "indicator" },
		{ id: STRATEGY_PLANNING_STATE_IDS.householdLearningConfidence, name: "Household learning confidence", desc: "Learning maturity associated with the current planning diagnostics.", type: "string", role: "text" },
		{ id: STRATEGY_PLANNING_STATE_IDS.lastUpdate, name: "Planning diagnostics last update", desc: "Timestamp of the latest planning diagnostic publication.", type: "number", role: "value.time", unit: "ms" },
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

export async function publishStrategyPlanning(
	adapter: StrategyPlanningIoBrokerAdapter,
	publication: StrategyPlanningPublication,
): Promise<void> {
	await Promise.all([
		adapter.setStateAsync(STRATEGY_PLANNING_STATE_IDS.householdEnergyRemainingWh, { val: publication.householdEnergyRemainingWh, ack: true }),
		adapter.setStateAsync(STRATEGY_PLANNING_STATE_IDS.forecastEnergyRemainingWh, { val: publication.forecastEnergyRemainingWh, ack: true }),
		adapter.setStateAsync(STRATEGY_PLANNING_STATE_IDS.batteryAvailableEnergyWh, { val: publication.batteryAvailableEnergyWh, ack: true }),
		adapter.setStateAsync(STRATEGY_PLANNING_STATE_IDS.householdLearningApplied, { val: publication.householdLearningApplied, ack: true }),
		adapter.setStateAsync(STRATEGY_PLANNING_STATE_IDS.householdLearningConfidence, { val: publication.householdLearningConfidence, ack: true }),
		adapter.setStateAsync(STRATEGY_PLANNING_STATE_IDS.lastUpdate, { val: publication.lastUpdate, ack: true }),
	]);
}
