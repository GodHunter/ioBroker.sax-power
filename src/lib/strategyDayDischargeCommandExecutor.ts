import {
	createStrategyDayDischargeCommandPlan,
	type StrategyDayDischargeCommandPlan,
} from "./strategyDayDischargeCommandPlan";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyStateContract,
} from "./strategyIntegrationContract";

export interface StrategyCommandWriter {
	setForeignState(
		stateId: string,
		value: number,
		acknowledged: false,
	): Promise<void>;
}

export interface StrategyDayDischargeCommandExecution {
	readonly stateId: string;
	readonly register: number;
	readonly valueW: number;
	readonly acknowledged: false;
	readonly reason: StrategyDayDischargeCommandPlan["reason"];
	readonly commandPlan: StrategyDayDischargeCommandPlan;
}

export async function executeStrategyDayDischargeCommand(
	writer: StrategyCommandWriter,
	commandPlan: StrategyDayDischargeCommandPlan,
	commandContract: StrategyStateContract =
	STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand,
): Promise<StrategyDayDischargeCommandExecution | null> {
	const validatedPlan = createStrategyDayDischargeCommandPlan(
		commandPlan.evaluation,
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
		|| commandPlan.evaluation !== validatedPlan.evaluation
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
