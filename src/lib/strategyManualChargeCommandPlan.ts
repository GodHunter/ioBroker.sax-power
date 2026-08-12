import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyStateContract,
} from "./strategyIntegrationContract";
import type { StrategyManualChargeControl } from "./strategyManualChargeControl";

export type StrategyManualChargeCommandReason =
	| "apply-manual-charge-target"
	| "apply-manual-charge-stop";

export interface StrategyManualChargeCommandPlan {
	readonly createdAt: number;
	readonly stateId: string;
	readonly register: number;
	readonly valueW: number;
	readonly unit: "W";
	readonly confirmation: "transient-command";
	readonly reason: StrategyManualChargeCommandReason;
	readonly control: StrategyManualChargeControl;
}

function isConsistentManualControl(
	control: StrategyManualChargeControl,
): boolean {
	if (
		control.operatingMode !== "manual-charge"
		|| control.automaticStrategyAllowed
		|| !Number.isFinite(control.createdAt)
		|| control.safetyEnvelope.createdAt !== control.createdAt
		|| !Number.isFinite(control.requestedChargePowerW)
		|| control.requestedChargePowerW < 0
		|| !Number.isFinite(control.targetChargePowerW)
		|| control.targetChargePowerW < 0
		|| control.targetChargePowerW
			> control.safetyEnvelope.maximumChargePowerW
	) {
		return false;
	}

	switch (control.reason) {
		case "apply-manual-charge-target":
			return control.targetChargePowerW > 0
				&& control.targetChargePowerW === control.requestedChargePowerW;
		case "limit-manual-charge-target":
			return control.targetChargePowerW > 0
				&& control.targetChargePowerW < control.requestedChargePowerW;
		case "requested-charge-power-zero":
			return control.requestedChargePowerW === 0
				&& control.targetChargePowerW === 0;
		case "maximum-state-of-charge-reached":
			return control.safetyEnvelope.availableChargeEnergyWh === 0
				&& control.targetChargePowerW === 0;
		default:
			return false;
	}
}

export function createStrategyManualChargeCommandPlan(
	control: StrategyManualChargeControl,
	commandContract: StrategyStateContract =
	STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand,
): StrategyManualChargeCommandPlan | null {
	if (
		!isConsistentManualControl(control)
		|| commandContract.stateId.trim() === ""
		|| !Number.isInteger(commandContract.register)
		|| (commandContract.register as number) < 0
		|| commandContract.unit !== "W"
		|| commandContract.access !== "command"
		|| commandContract.confirmation !== "transient-command"
	) {
		return null;
	}

	return Object.freeze({
		createdAt: control.createdAt,
		stateId: commandContract.stateId,
		register: commandContract.register as number,
		valueW: control.targetChargePowerW,
		unit: "W" as const,
		confirmation: "transient-command" as const,
		reason: control.targetChargePowerW === 0
			? "apply-manual-charge-stop" as const
			: "apply-manual-charge-target" as const,
		control,
	});
}
