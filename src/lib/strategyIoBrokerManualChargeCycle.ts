import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import { createStrategyIoBrokerRuntime } from "./strategyIoBrokerRuntime";
import type { StrategyIoBrokerRuntimeAdapter } from "./strategyIoBrokerRuntime";
import {
	executeStrategyManualChargeCycle,
	type StrategyManualChargeCycle,
} from "./strategyManualChargeCycle";
import {
	prepareStrategyManualChargeSnapshot,
} from "./strategyManualChargeSnapshot";
import type { StrategyManualChargeIoBrokerAdapter } from "./strategyManualChargeStates";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";

export interface StrategyIoBrokerManualChargeAdapter
	extends StrategyIoBrokerRuntimeAdapter,
	StrategyManualChargeIoBrokerAdapter {}

export async function executeStrategyIoBrokerManualChargeCycle(
	adapter: StrategyIoBrokerManualChargeAdapter,
	configuration: StrategyConfiguration,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): Promise<StrategyManualChargeCycle | null> {
	const runtime = createStrategyIoBrokerRuntime(adapter);
	const preparation = await prepareStrategyManualChargeSnapshot(
		runtime.reader,
		contract,
		resolverOptions,
	);

	if (preparation === null) return null;

	return executeStrategyManualChargeCycle(
		adapter,
		runtime.writer,
		preparation.snapshot,
		configuration,
		contract.modbus.chargePowerCommand,
	);
}
