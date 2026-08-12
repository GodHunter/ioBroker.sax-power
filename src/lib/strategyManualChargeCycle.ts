import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyCommandWriter } from "./strategyDayDischargeCommandExecutor";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
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
} from "./strategyManualChargeControl";
import {
	publishStrategyManualChargeStatus,
	readStrategyManualChargeInput,
	type StrategyManualChargeIoBrokerAdapter,
} from "./strategyManualChargeStates";

export interface StrategyManualChargeCycle {
	readonly createdAt: number;
	readonly control: StrategyManualChargeControl;
	readonly commandPlan: StrategyManualChargeCommandPlan | null;
	readonly commandExecution: StrategyManualChargeCommandExecution | null;
}

export async function executeStrategyManualChargeCycle(
	adapter: StrategyManualChargeIoBrokerAdapter,
	writer: StrategyCommandWriter,
	snapshot: StrategyInputSnapshot,
	configuration: StrategyConfiguration,
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

	const commandPlan = createStrategyManualChargeCommandPlan(control);

	if (commandPlan === null || commandPlan.control !== control) {
		return null;
	}

	const commandExecution = await executeStrategyManualChargeCommand(
		writer,
		commandPlan,
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
