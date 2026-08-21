import type { StrategyChargingShadowDecision } from "./strategyChargingShadow";

export const STRATEGY_CHARGING_SHADOW_STATE_IDS = Object.freeze({
	active: "strategy.shadowCharging.active",
	recommendedChargePowerW: "strategy.shadowCharging.recommendedChargePowerW",
	requiredAverageChargePowerW: "strategy.shadowCharging.requiredAverageChargePowerW",
	energyRequiredWh: "strategy.shadowCharging.energyRequiredWh",
	forecastEnergyRemainingWh: "strategy.shadowCharging.forecastEnergyRemainingWh",
	forecastMarginWh: "strategy.shadowCharging.forecastMarginWh",
	remainingDaylightMinutes: "strategy.shadowCharging.remainingDaylightMinutes",
	decisionReason: "strategy.shadowCharging.decisionReason",
	wouldWriteRegister44: "strategy.shadowCharging.wouldWriteRegister44",
	lastUpdate: "strategy.shadowCharging.lastUpdate",
});

export interface StrategyChargingShadowIoBrokerAdapter {
	extendObjectAsync(
		stateId: string,
		object: ioBroker.PartialObject,
	): Promise<unknown>;

	setStateAsync(
		stateId: string,
		state: ioBroker.SettableState,
	): Promise<unknown>;
}

interface StrategyChargingShadowStateDefinition {
	readonly id: string;
	readonly type: "boolean" | "number" | "string";
	readonly role: string;
	readonly name: string;
	readonly description: string;
	readonly unit?: "W" | "Wh" | "min";
}

const DEFINITIONS: readonly StrategyChargingShadowStateDefinition[] = Object.freeze([
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.active,
		type: "boolean",
		role: "indicator",
		name: "Shadow charging active",
		description: "Whether a valid automatic charging shadow decision is available.",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.recommendedChargePowerW,
		type: "number",
		role: "value.power",
		name: "Recommended charging power",
		description: "Charging power limit that the strategy would apply in active mode.",
		unit: "W",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.requiredAverageChargePowerW,
		type: "number",
		role: "value.power",
		name: "Required average charging power",
		description: "Average charging power required to reach the configured target SOC during the remaining daylight window.",
		unit: "W",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.energyRequiredWh,
		type: "number",
		role: "value.energy",
		name: "Energy required to target SOC",
		description: "Usable battery energy still required to reach the configured target SOC.",
		unit: "Wh",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastEnergyRemainingWh,
		type: "number",
		role: "value.energy",
		name: "Remaining PV forecast energy",
		description: "PVForecast energy remaining until the end of the day.",
		unit: "Wh",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastMarginWh,
		type: "number",
		role: "value.energy",
		name: "Forecast energy margin",
		description: "Remaining forecast energy after reserve minus battery energy still required.",
		unit: "Wh",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.remainingDaylightMinutes,
		type: "number",
		role: "value.interval",
		name: "Remaining daylight",
		description: "Minutes remaining in the current daylight window.",
		unit: "min",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.decisionReason,
		type: "string",
		role: "text",
		name: "Shadow charging decision reason",
		description: "Machine-readable reason for the current charging recommendation.",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.wouldWriteRegister44,
		type: "boolean",
		role: "indicator",
		name: "Register 44 write enabled",
		description: "Safety indicator. This remains false while shadow mode is active.",
	},
	{
		id: STRATEGY_CHARGING_SHADOW_STATE_IDS.lastUpdate,
		type: "number",
		role: "value.time",
		name: "Shadow charging last update",
		description: "Timestamp of the latest shadow charging decision.",
	},
]);

export async function ensureStrategyChargingShadowStates(
	adapter: StrategyChargingShadowIoBrokerAdapter,
): Promise<void> {
	await adapter.extendObjectAsync("strategy", {
		type: "channel",
		common: { name: "Battery strategy" },
		native: {},
	});
	await adapter.extendObjectAsync("strategy.shadowCharging", {
		type: "channel",
		common: { name: "Shadow charging" },
		native: {},
	});

	for (const definition of DEFINITIONS) {
		await adapter.extendObjectAsync(definition.id, {
			type: "state",
			common: {
				name: definition.name,
				desc: definition.description,
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

export async function publishStrategyChargingShadowDecision(
	adapter: StrategyChargingShadowIoBrokerAdapter,
	decision: StrategyChargingShadowDecision,
	createdAt: number,
): Promise<void> {
	await Promise.all([
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.active,
			{ val: decision.valid, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.recommendedChargePowerW,
			{ val: decision.shadowChargePowerLimitW, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.requiredAverageChargePowerW,
			{ val: decision.requiredAverageChargePowerW, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.energyRequiredWh,
			{ val: decision.energyRequiredWh, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastEnergyRemainingWh,
			{ val: decision.forecastEnergyRemainingWh, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.forecastMarginWh,
			{ val: decision.forecastMarginWh, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.remainingDaylightMinutes,
			{ val: Math.max(0, decision.remainingDaylightMs / 60_000), ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.decisionReason,
			{ val: decision.reason, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.wouldWriteRegister44,
			{ val: false, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.lastUpdate,
			{ val: createdAt, ack: true },
		),
	]);
}
