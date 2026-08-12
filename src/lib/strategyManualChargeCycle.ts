import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyCommandWriter } from "./strategyDayDischargeCommandExecutor";
import {
	executeStrategyManualChargeCommand,
	type StrategyManualChargeCommandExecution,
} from "./strategyManualChargeCommandExecutor";
import {
	createStrategyManualChargeCommandPlan,
	type StrategyManualChargeCommandPlan,
} from "./strategyManualChargeCommandPlan";
import {
	createStrategyManualChargeControl,
	type StrategyManualChargeControl,
	type StrategyManualChargeSnapshot,
} from "./strategyManualChargeControl";
import {
	publishStrategyManualChargeStatus,
	readStrategyManualChargeInput,
	type StrategyManualChargeIoBrokerAdapter,
} from "./strategyManualChargeStates";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyStateContract,
} from "./strategyIntegrationContract";

export interface StrategyManualChargeCycle {
	readonly createdAt: number;
	readonly control: StrategyManualChargeControl;
	readonly commandPlan: StrategyManualChargeCommandPlan | null;
	readonly commandExecution: StrategyManualChargeCommandExecution | null;
}

export async function executeStrategyManualChargeCycle(
	adapter: StrategyManualChargeIoBrokerAdapter,
	writer: StrategyCommandWriter,
	snapshot: StrategyManualChargeSnapshot,
	configuration: StrategyConfiguration,
	commandContract: StrategyStateContract =
	STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand,
): Promise<StrategyManualChargeCycle | null> {
	const input = await readStrategyManualChargeInput(adapter);

	if (input === null) {
		return null;
	}

	const control = createStrategyManualChargeControl(
		snapshot,
		configuration,
		input,
	);

	if (control === null || control.createdAt !== snapshot.createdAt) {
		return null;
	}

	await publishStrategyManualChargeStatus(adapter, control);

	if (control.operatingMode === "automatic") {
		return Object.freeze({
			createdAt: control.createdAt,
			control,
			commandPlan: null,
			commandExecution: null,
		});
	}

	const commandPlan = createStrategyManualChargeCommandPlan(
		control,
		commandContract,
	);

	if (commandPlan === null || commandPlan.control !== control) {
		return null;
	}

	const commandExecution = await executeStrategyManualChargeCommand(
		writer,
		commandPlan,
		commandContract,
	);

	if (
		commandExecution === null
		|| commandExecution.commandPlan !== commandPlan
	) {
		return null;
	}

	return Object.freeze({
		createdAt: control.createdAt,
		control,
		commandPlan,
		commandExecution,
	});
}
