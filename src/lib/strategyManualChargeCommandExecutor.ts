import type { StrategyCommandWriter } from "./strategyCommandWriter";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyStateContract,
} from "./strategyIntegrationContract";
import {
	createStrategyManualChargeCommandPlan,
	type StrategyManualChargeCommandPlan,
} from "./strategyManualChargeCommandPlan";

export interface StrategyManualChargeCommandExecution {
	readonly stateId: string;
	readonly register: number;
	readonly valueW: number;
	readonly acknowledged: false;
	readonly reason: StrategyManualChargeCommandPlan["reason"];
	readonly commandPlan: StrategyManualChargeCommandPlan;
}

export async function executeStrategyManualChargeCommand(
	writer: StrategyCommandWriter,
	commandPlan: StrategyManualChargeCommandPlan,
	commandContract: StrategyStateContract =
	STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand,
): Promise<StrategyManualChargeCommandExecution | null> {
	const validatedPlan = createStrategyManualChargeCommandPlan(
		commandPlan.control,
		commandContract,
	);

	if (
		validatedPlan === null
		|| commandPlan.createdAt !== validatedPlan.createdAt
		|| commandPlan.stateId !== validatedPlan.stateId
		|| commandPlan.register !== validatedPlan.register
		|| commandPlan.valueW !== validatedPlan.valueW
		|| commandPlan.unit !== validatedPlan.unit
		|| commandPlan.confirmation !== validatedPlan.confirmation
		|| commandPlan.reason !== validatedPlan.reason
		|| commandPlan.control !== validatedPlan.control
	) {
		return null;
	}

	await writer.setForeignState(
		validatedPlan.stateId,
		validatedPlan.valueW,
		false,
	);

	return Object.freeze({
		stateId: validatedPlan.stateId,
		register: validatedPlan.register,
		valueW: validatedPlan.valueW,
		acknowledged: false as const,
		reason: validatedPlan.reason,
		commandPlan,
	});
}
