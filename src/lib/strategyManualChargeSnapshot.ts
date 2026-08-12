import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type { StrategyManualChargeSnapshot } from "./strategyManualChargeControl";
import {
	resolveStrategyState,
	type StrategyResolvedState,
	type StrategyStateReader,
	type StrategyStateResolverOptions,
} from "./strategyStateResolver";

export interface StrategyManualChargeSnapshotResolution {
	readonly chargePowerCommand: StrategyResolvedState;
	readonly stateOfCharge: StrategyResolvedState;
}

export interface StrategyManualChargeSnapshotPreparation {
	readonly createdAt: number;
	readonly resolution: StrategyManualChargeSnapshotResolution;
	readonly snapshot: StrategyManualChargeSnapshot;
}

export async function prepareStrategyManualChargeSnapshot(
	reader: StrategyStateReader,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	options: StrategyStateResolverOptions = {},
): Promise<StrategyManualChargeSnapshotPreparation | null> {
	const createdAt = options.now ?? Date.now();

	if (!Number.isFinite(createdAt)) return null;

	const resolverOptions = { ...options, now: createdAt };
	const [chargePowerCommand, stateOfCharge] = await Promise.all([
		resolveStrategyState(
			reader,
			contract.modbus.chargePowerCommand,
			resolverOptions,
		),
		resolveStrategyState(
			reader,
			contract.modbus.stateOfCharge,
			resolverOptions,
		),
	]);

	if (
		!chargePowerCommand.available
		|| chargePowerCommand.reason !== null
		|| !stateOfCharge.available
		|| stateOfCharge.reason !== null
		|| stateOfCharge.value === null
		|| !Number.isFinite(stateOfCharge.value)
	) {
		return null;
	}

	const resolution = Object.freeze({ chargePowerCommand, stateOfCharge });
	const snapshot = Object.freeze({
		createdAt,
		modbus: Object.freeze({
			stateOfChargePercent: stateOfCharge.value,
		}),
	});

	return Object.freeze({ createdAt, resolution, snapshot });
}
