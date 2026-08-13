import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	resolveStrategyStates,
	type StrategyStateFailureReason,
	type StrategyStateReader,
} from "./strategyStateResolver";
import {
	DEFAULT_STRATEGY_MODES,
	type StrategyModes,
} from "./strategyModes";

export interface StrategyUnavailableInput {
	readonly stateId: string;
	readonly reason: StrategyStateFailureReason;
}

export interface StrategyIoBrokerReadiness {
	readonly ready: boolean;
	readonly unavailableInputs: readonly StrategyUnavailableInput[];
}

export async function assessStrategyIoBrokerReadiness(
	reader: StrategyStateReader,
	maximumForecastAgeMs: number,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	modes: StrategyModes = DEFAULT_STRATEGY_MODES,
): Promise<StrategyIoBrokerReadiness> {
	const resolution = await resolveStrategyStates(
		reader,
		contract,
		{ maximumTimestampAgeMs: maximumForecastAgeMs },
	);
	const resolvedStates = [
		...(modes.chargingControlEnabled
			? [resolution.modbus.chargePowerCommand]
			: []),
		resolution.modbus.operatingState,
		resolution.modbus.stateOfCharge,
		resolution.modbus.batteryPower,
		resolution.modbus.smartMeterPower,
		...(modes.dayAvailabilityEnabled
			? Object.values(resolution.pvForecast)
			: []),
	];
	const unavailableInputs = resolvedStates
		.filter((state) => !state.available && state.reason !== null)
		.map((state) => Object.freeze({
			stateId: state.stateId,
			reason: state.reason as StrategyStateFailureReason,
		}));

	return Object.freeze({
		ready: unavailableInputs.length === 0,
		unavailableInputs: Object.freeze(unavailableInputs),
	});
}

export function formatStrategyUnavailableInputs(
	inputs: readonly StrategyUnavailableInput[],
): string {
	return inputs
		.map(({ stateId, reason }) => `${stateId}:${reason}`)
		.join(", ");
}
