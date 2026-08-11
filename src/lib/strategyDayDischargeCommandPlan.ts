import type { StrategyDayDischargeEvaluation } from "./strategyDayDischargeEvaluation";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyStateContract,
} from "./strategyIntegrationContract";

export type StrategyDayDischargeCommandReason =
	| "apply-discharge-target"
	| "apply-safe-stop";

export interface StrategyDayDischargeCommandPlan {
	readonly createdAt: number;
	readonly stateId: string;
	readonly register: number;
	readonly valueW: number;
	readonly unit: "W";
	readonly confirmation: "transient-command";
	readonly reason: StrategyDayDischargeCommandReason;
	readonly evaluation: StrategyDayDischargeEvaluation;
}

export function createStrategyDayDischargeCommandPlan(
	evaluation: StrategyDayDischargeEvaluation,
	commandContract: StrategyStateContract =
	STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand,
): StrategyDayDischargeCommandPlan | null {
	const targetDischargePowerW =
		evaluation.windowGate.targetDischargePowerW;

	if (
		!Number.isFinite(evaluation.createdAt)
		|| evaluation.decision.createdAt !== evaluation.createdAt
		|| evaluation.daylightWindow.evaluatedAt !== evaluation.createdAt
		|| evaluation.windowGate.createdAt !== evaluation.createdAt
		|| evaluation.windowGate.decision !== evaluation.decision
		|| evaluation.windowGate.daylightWindow !== evaluation.daylightWindow
		|| !Number.isFinite(targetDischargePowerW)
		|| targetDischargePowerW < 0
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
		createdAt: evaluation.createdAt,
		stateId: commandContract.stateId,
		register: commandContract.register as number,
		valueW: targetDischargePowerW,
		unit: "W" as const,
		confirmation: "transient-command" as const,
		reason: targetDischargePowerW === 0
			? "apply-safe-stop" as const
			: "apply-discharge-target" as const,
		evaluation,
	});
}
