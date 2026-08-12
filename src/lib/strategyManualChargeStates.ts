import type {
	StrategyManualChargeControl,
	StrategyManualChargeControlInput,
} from "./strategyManualChargeControl";

export const STRATEGY_MANUAL_CHARGE_STATE_IDS = Object.freeze({
	enabled: "strategy.manualCharge.enabled",
	requestedChargePowerW: "strategy.manualCharge.requestedChargePowerW",
	operatingMode: "strategy.status.operatingMode",
	automaticStrategyAllowed: "strategy.status.automaticStrategyAllowed",
	targetChargePowerW: "strategy.status.targetChargePowerW",
	decisionReason: "strategy.status.decisionReason",
});

export interface StrategyManualChargeIoBrokerAdapter {
	extendObjectAsync(
		stateId: string,
		object: ioBroker.PartialObject,
	): Promise<unknown>;

	getStateAsync(
		stateId: string,
	): Promise<ioBroker.State | null | undefined>;

	setStateAsync(
		stateId: string,
		state: ioBroker.SettableState,
	): Promise<unknown>;
}

interface StrategyManualChargeStateDefinition {
	readonly id: string;
	readonly type: "boolean" | "number" | "string";
	readonly role: string;
	readonly name: string;
	readonly description: string;
	readonly read: true;
	readonly write: boolean;
	readonly unit?: "W";
	readonly def?: boolean | number;
	readonly states?: Readonly<Record<string, string>>;
}

export const STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS: readonly StrategyManualChargeStateDefinition[] = Object.freeze([
	Object.freeze({
		id: STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled,
		type: "boolean" as const,
		role: "switch.enable",
		name: "Manual charging enabled",
		description: "Enables manual charging and suspends automatic strategy control.",
		read: true as const,
		write: true,
		def: false,
	}),
	Object.freeze({
		id: STRATEGY_MANUAL_CHARGE_STATE_IDS.requestedChargePowerW,
		type: "number" as const,
		role: "level.power",
		unit: "W" as const,
		name: "Requested manual charge power",
		description: "Requested charge power while manual charging is enabled.",
		read: true as const,
		write: true,
		def: 0,
	}),
	Object.freeze({
		id: STRATEGY_MANUAL_CHARGE_STATE_IDS.operatingMode,
		type: "string" as const,
		role: "text",
		name: "Strategy operating mode",
		description: "Currently selected automatic or manual charging mode.",
		read: true as const,
		write: false,
		states: Object.freeze({
			automatic: "Automatic",
			"manual-charge": "Manual charging",
		}),
	}),
	Object.freeze({
		id: STRATEGY_MANUAL_CHARGE_STATE_IDS.automaticStrategyAllowed,
		type: "boolean" as const,
		role: "indicator",
		name: "Automatic strategy allowed",
		description: "Whether automatic strategy decisions may control the battery.",
		read: true as const,
		write: false,
	}),
	Object.freeze({
		id: STRATEGY_MANUAL_CHARGE_STATE_IDS.targetChargePowerW,
		type: "number" as const,
		role: "value.power",
		unit: "W" as const,
		name: "Applied charge power target",
		description: "Safety-limited charge power target selected by the strategy.",
		read: true as const,
		write: false,
	}),
	Object.freeze({
		id: STRATEGY_MANUAL_CHARGE_STATE_IDS.decisionReason,
		type: "string" as const,
		role: "text",
		name: "Strategy decision reason",
		description: "Machine-readable reason for the current manual charge decision.",
		read: true as const,
		write: false,
	}),
]);

export async function ensureStrategyManualChargeIoBrokerStates(
	adapter: StrategyManualChargeIoBrokerAdapter,
): Promise<void> {
	await adapter.extendObjectAsync("strategy", {
		type: "channel",
		common: { name: "Battery strategy" },
		native: {},
	});
	await adapter.extendObjectAsync("strategy.manualCharge", {
		type: "channel",
		common: { name: "Manual charging" },
		native: {},
	});
	await adapter.extendObjectAsync("strategy.status", {
		type: "channel",
		common: { name: "Strategy status" },
		native: {},
	});

	for (const definition of STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS) {
		await adapter.extendObjectAsync(definition.id, {
			type: "state",
			common: {
				name: definition.name,
				desc: definition.description,
				type: definition.type,
				role: definition.role,
				read: definition.read,
				write: definition.write,
				...(definition.unit === undefined ? {} : { unit: definition.unit }),
				...(definition.def === undefined ? {} : { def: definition.def }),
				...(definition.states === undefined ? {} : { states: definition.states }),
			},
			native: {},
		});
	}
}

export async function readStrategyManualChargeInput(
	adapter: StrategyManualChargeIoBrokerAdapter,
): Promise<StrategyManualChargeControlInput | null> {
	const [enabledState, requestedPowerState] = await Promise.all([
		adapter.getStateAsync(STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled),
		adapter.getStateAsync(
			STRATEGY_MANUAL_CHARGE_STATE_IDS.requestedChargePowerW,
		),
	]);

	if (
		typeof enabledState?.val !== "boolean"
		|| typeof requestedPowerState?.val !== "number"
		|| !Number.isFinite(requestedPowerState.val)
		|| requestedPowerState.val < 0
	) {
		return null;
	}

	return Object.freeze({
		enabled: enabledState.val,
		requestedChargePowerW: requestedPowerState.val,
	});
}

export async function publishStrategyManualChargeStatus(
	adapter: StrategyManualChargeIoBrokerAdapter,
	control: StrategyManualChargeControl,
): Promise<void> {
	await Promise.all([
		adapter.setStateAsync(
			STRATEGY_MANUAL_CHARGE_STATE_IDS.operatingMode,
			{ val: control.operatingMode, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_MANUAL_CHARGE_STATE_IDS.automaticStrategyAllowed,
			{ val: control.automaticStrategyAllowed, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_MANUAL_CHARGE_STATE_IDS.targetChargePowerW,
			{ val: control.targetChargePowerW, ack: true },
		),
		adapter.setStateAsync(
			STRATEGY_MANUAL_CHARGE_STATE_IDS.decisionReason,
			{ val: control.reason, ack: true },
		),
	]);
}
