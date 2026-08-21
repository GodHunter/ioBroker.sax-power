import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyChargingShadowDecision,
	type StrategyChargingShadowDecision,
} from "./strategyChargingShadow";
import {
	publishStrategyChargingShadowDecision,
	type StrategyChargingShadowIoBrokerAdapter,
} from "./strategyChargingShadowStates";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	createStrategyIoBrokerDaylightWindowProvider,
	type StrategyIoBrokerAstroAdapter,
} from "./strategyIoBrokerDaylightWindow";
import {
	createStrategyIoBrokerRuntime,
	type StrategyIoBrokerRuntimeAdapter,
} from "./strategyIoBrokerRuntime";
import {
	resolveStrategyStates,
	type StrategyStateResolverOptions,
} from "./strategyStateResolver";

export interface StrategyIoBrokerChargingShadowAdapter
	extends StrategyIoBrokerRuntimeAdapter,
	StrategyIoBrokerAstroAdapter,
	StrategyChargingShadowIoBrokerAdapter {}

export interface StrategyIoBrokerChargingShadowCycle {
	readonly createdAt: number;
	readonly decision: StrategyChargingShadowDecision;
}

export async function executeStrategyIoBrokerChargingShadowCycle(
	adapter: StrategyIoBrokerChargingShadowAdapter,
	configuration: StrategyConfiguration,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): Promise<StrategyIoBrokerChargingShadowCycle | null> {
	const createdAt = resolverOptions.now ?? Date.now();

	if (!Number.isFinite(createdAt)) return null;

	const runtime = createStrategyIoBrokerRuntime(adapter);
	const resolution = await resolveStrategyStates(
		runtime.reader,
		contract,
		{
			...resolverOptions,
			now: createdAt,
		},
	);

	if (!resolution.strategyInputsReady) return null;

	const stateOfChargePercent = resolution.modbus.stateOfCharge.value;
	const forecastEnergyRemainingWh =
		resolution.pvForecast.energyNowUntilEndOfDay.value;

	if (
		stateOfChargePercent === null
		|| forecastEnergyRemainingWh === null
	) {
		return null;
	}

	const daylightWindowProvider =
		createStrategyIoBrokerDaylightWindowProvider(adapter);
	const daylightWindow = await daylightWindowProvider.getDaylightWindow(
		createdAt,
	);

	if (
		daylightWindow == null
		|| createdAt < daylightWindow.startsAt
		|| createdAt >= daylightWindow.endsAt
	) {
		return null;
	}

	const decision = createStrategyChargingShadowDecision(
		configuration,
		{
			stateOfChargePercent,
			forecastEnergyRemainingWh,
			remainingDaylightMs: daylightWindow.endsAt - createdAt,
		},
	);

	if (!decision.valid) return null;

	await publishStrategyChargingShadowDecision(
		adapter,
		decision,
		createdAt,
	);

	return Object.freeze({
		createdAt,
		decision,
	});
}
