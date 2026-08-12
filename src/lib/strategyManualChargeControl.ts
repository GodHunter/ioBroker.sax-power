import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import {
	createStrategySafetyEnvelope,
	type StrategySafetyEnvelope,
} from "./strategySafetyEnvelope";

export interface StrategyManualChargeControlInput {
	readonly enabled: boolean;
	readonly requestedChargePowerW: number;
}

export type StrategyOperatingMode = "automatic" | "manual-charge";

export type StrategyManualChargeControlReason =
	| "manual-mode-disabled"
	| "apply-manual-charge-target"
	| "limit-manual-charge-target"
	| "requested-charge-power-zero"
	| "maximum-state-of-charge-reached";

export interface StrategyManualChargeControl {
	readonly createdAt: number;
	readonly operatingMode: StrategyOperatingMode;
	readonly automaticStrategyAllowed: boolean;
	readonly requestedChargePowerW: number;
	readonly targetChargePowerW: number;
	readonly reason: StrategyManualChargeControlReason;
	readonly safetyEnvelope: StrategySafetyEnvelope;
}

export function createStrategyManualChargeControl(
	snapshot: StrategyInputSnapshot,
	configuration: StrategyConfiguration,
	input: StrategyManualChargeControlInput,
): StrategyManualChargeControl | null {
	if (
		typeof input.enabled !== "boolean"
		|| !Number.isFinite(input.requestedChargePowerW)
		|| input.requestedChargePowerW < 0
	) {
		return null;
	}

	const safetyEnvelope = createStrategySafetyEnvelope(
		snapshot,
		configuration,
	);
	if (safetyEnvelope === null) {
		return null;
	}

	if (!input.enabled) {
		return Object.freeze({
			createdAt: snapshot.createdAt,
			operatingMode: "automatic" as const,
			automaticStrategyAllowed: true,
			requestedChargePowerW: input.requestedChargePowerW,
			targetChargePowerW: 0,
			reason: "manual-mode-disabled" as const,
			safetyEnvelope,
		});
	}

	const targetChargePowerW = Math.min(
		input.requestedChargePowerW,
		safetyEnvelope.maximumChargePowerW,
	);
	let reason: StrategyManualChargeControlReason;

	if (safetyEnvelope.availableChargeEnergyWh === 0) {
		reason = "maximum-state-of-charge-reached";
	} else if (input.requestedChargePowerW === 0) {
		reason = "requested-charge-power-zero";
	} else if (targetChargePowerW < input.requestedChargePowerW) {
		reason = "limit-manual-charge-target";
	} else {
		reason = "apply-manual-charge-target";
	}

	return Object.freeze({
		createdAt: snapshot.createdAt,
		operatingMode: "manual-charge" as const,
		automaticStrategyAllowed: false,
		requestedChargePowerW: input.requestedChargePowerW,
		targetChargePowerW,
		reason,
		safetyEnvelope,
	});
}
