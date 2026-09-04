import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyChargingDecision,
	type StrategyChargingDecision,
} from "./strategyChargingDecision";
import {
	publishStrategyChargingShadowDecision,
	publishStrategyChargingShadowUnavailable,
	type StrategyChargingShadowIoBrokerAdapter,
} from "./strategyChargingShadowStates";
import {
	publishStrategyDaylightDiagnostics,
	type StrategyDaylightDiagnosticAdapter,
} from "./strategyDaylightDiagnosticStates";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	createStrategyIoBrokerDaylightWindowProvider,
	type StrategyIoBrokerDaylightAdapter,
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
	StrategyIoBrokerDaylightAdapter,
	StrategyChargingShadowIoBrokerAdapter,
	StrategyDaylightDiagnosticAdapter {}

export interface StrategyIoBrokerChargingShadowCycle {
	readonly createdAt: number;
	readonly decision: StrategyChargingDecision;
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
	const resolution = await resolveStrategyStates(runtime.reader, contract, {
		...resolverOptions,
		now: createdAt,
	});

	if (!resolution.strategyInputsReady) {
		await publishStrategyChargingShadowUnavailable(adapter, "inputs-not-ready", createdAt);
		return null;
	}

	const stateOfChargePercent = resolution.modbus.stateOfCharge.value;
	const forecastEnergyRemainingWh = resolution.pvForecast.energyNowUntilEndOfDay.value;
	if (stateOfChargePercent === null || forecastEnergyRemainingWh === null) {
		await publishStrategyChargingShadowUnavailable(adapter, "inputs-not-ready", createdAt);
		return null;
	}

	const daylightWindowProvider = createStrategyIoBrokerDaylightWindowProvider(adapter);
	const daylightWindow = await daylightWindowProvider.getDaylightWindow(createdAt);
	await publishStrategyDaylightDiagnostics(adapter, createdAt, daylightWindow ?? null);

	if (daylightWindow == null || createdAt < daylightWindow.startsAt || createdAt >= daylightWindow.endsAt) {
		await publishStrategyChargingShadowUnavailable(adapter, "outside-daylight", createdAt);
		return null;
	}

	const decision = createStrategyChargingDecision(configuration, {
		stateOfChargePercent,
		forecastEnergyRemainingWh,
		remainingDaylightMs: daylightWindow.endsAt - createdAt,
		elapsedDaylightMs: createdAt - daylightWindow.startsAt,
		totalDaylightMs: daylightWindow.endsAt - daylightWindow.startsAt,
	});

	if (!decision.valid) {
		await publishStrategyChargingShadowUnavailable(adapter, "invalid-input", createdAt);
		return null;
	}

	await publishStrategyChargingShadowDecision(adapter, decision, createdAt);
	return Object.freeze({ createdAt, decision });
}
