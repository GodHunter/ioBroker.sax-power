import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	executeStrategyDayDischargeCommand,
	type StrategyCommandWriter,
	type StrategyDayDischargeCommandExecution,
} from "./strategyDayDischargeCommandExecutor";
import {
	prepareStrategyDayDischargeCycleWithDaylightWindow,
	type StrategyDaylightWindowCyclePreparation,
	type StrategyDaylightWindowProvider,
} from "./strategyDaylightWindowCyclePreparation";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type {
	StrategyStateReader,
	StrategyStateResolverOptions,
} from "./strategyStateResolver";

export interface StrategyDaylightWindowCycleExecution {
	readonly createdAt: number;
	readonly preparation: StrategyDaylightWindowCyclePreparation;
	readonly commandExecution: StrategyDayDischargeCommandExecution;
}

export async function executeStrategyDayDischargeCycleWithDaylightWindow(
	reader: StrategyStateReader,
	daylightWindowProvider: StrategyDaylightWindowProvider,
	writer: StrategyCommandWriter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): Promise<StrategyDaylightWindowCycleExecution | null> {
	const preparation =
		await prepareStrategyDayDischargeCycleWithDaylightWindow(
			reader,
			daylightWindowProvider,
			configuration,
			maximumForecastAgeMs,
			requestedDischargePowerW,
			contract,
			resolverOptions,
		);

	if (preparation === null) {
		return null;
	}

	const commandPlan = preparation.cyclePreparation.cyclePlan.commandPlan;
	const commandExecution = await executeStrategyDayDischargeCommand(
		writer,
		commandPlan,
		contract.modbus.dischargePowerCommand,
	);

	if (
		commandExecution === null
		|| commandExecution.commandPlan !== commandPlan
		|| commandExecution.commandPlan.createdAt !== preparation.createdAt
	) {
		return null;
	}

	return Object.freeze({
		createdAt: preparation.createdAt,
		preparation,
		commandExecution,
	});
}
