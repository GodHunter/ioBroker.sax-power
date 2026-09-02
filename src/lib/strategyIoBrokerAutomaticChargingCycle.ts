import type { StrategyConfiguration } from "./strategyConfiguration";
import { createStrategyChargingShadowDecision } from "./strategyChargingShadow";
import {
	publishStrategyCharging,
	strategyChargingPublicationFromDecision,
	type StrategyChargingIoBrokerAdapter,
	type StrategyChargingPublication,
	type StrategyChargingReason,
} from "./strategyChargingStates";
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

export interface StrategyIoBrokerAutomaticChargingAdapter
	extends StrategyIoBrokerRuntimeAdapter,
	StrategyIoBrokerDaylightAdapter,
	StrategyChargingIoBrokerAdapter,
	StrategyDaylightDiagnosticAdapter {}

export interface StrategyIoBrokerAutomaticChargingCycle {
	readonly createdAt: number;
	readonly targetChargePowerW: number;
	readonly reason: StrategyChargingReason;
	readonly register44Written: true;
}

function fallbackPublication(
	configuration: StrategyConfiguration,
	createdAt: number,
	reason: StrategyChargingReason,
	remainingDaylightMinutes: number | null = null,
): StrategyChargingPublication {
	return Object.freeze({
		active: true,
		targetChargePowerW: configuration.maximumChargePowerW,
		requiredAverageChargePowerW: null,
		energyRequiredWh: null,
		forecastEnergyRemainingWh: null,
		forecastMarginWh: null,
		remainingDaylightMinutes,
		decisionReason: reason,
		lastUpdate: createdAt,
		lastCommandAt: createdAt,
	});
}

async function applyChargePowerTarget(
	adapter: StrategyIoBrokerAutomaticChargingAdapter,
	configuration: StrategyConfiguration,
	contract: StrategyIntegrationContract,
	publication: StrategyChargingPublication,
): Promise<StrategyIoBrokerAutomaticChargingCycle> {
	const runtime = createStrategyIoBrokerRuntime(adapter);
	const command = contract.modbus.chargePowerCommand;
	const targetChargePowerW = Math.max(
		0,
		Math.min(configuration.maximumChargePowerW, Math.round(publication.targetChargePowerW)),
	);

	await runtime.writer.setForeignState(
		command.stateId,
		targetChargePowerW,
		false,
	);
	await publishStrategyCharging(adapter, {
		...publication,
		targetChargePowerW,
		lastCommandAt: publication.lastUpdate,
	});

	return Object.freeze({
		createdAt: publication.lastUpdate,
		targetChargePowerW,
		reason: publication.decisionReason,
		register44Written: true as const,
	});
}

export async function executeStrategyIoBrokerAutomaticChargingCycle(
	adapter: StrategyIoBrokerAutomaticChargingAdapter,
	configuration: StrategyConfiguration,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): Promise<StrategyIoBrokerAutomaticChargingCycle | null> {
	const createdAt = resolverOptions.now ?? Date.now();
	if (!Number.isFinite(createdAt)) return null;

	const runtime = createStrategyIoBrokerRuntime(adapter);
	const resolution = await resolveStrategyStates(
		runtime.reader,
		contract,
		{ ...resolverOptions, now: createdAt },
	);

	if (!resolution.modbus.chargePowerCommand.available) {
		return null;
	}

	const daylightWindowProvider = createStrategyIoBrokerDaylightWindowProvider(adapter);
	const daylightWindow = await daylightWindowProvider.getDaylightWindow(createdAt);
	await publishStrategyDaylightDiagnostics(adapter, createdAt, daylightWindow ?? null);

	const stateOfChargePercent = resolution.modbus.stateOfCharge.value;
	if (
		stateOfChargePercent !== null
		&& stateOfChargePercent < configuration.minimumStateOfChargePercent
	) {
		return applyChargePowerTarget(
			adapter,
			configuration,
			contract,
			fallbackPublication(configuration, createdAt, "below-minimum-soc"),
		);
	}

	if (!resolution.strategyInputsReady) {
		return applyChargePowerTarget(
			adapter,
			configuration,
			contract,
			fallbackPublication(configuration, createdAt, "inputs-not-ready"),
		);
	}

	if (daylightWindow === null) {
		return applyChargePowerTarget(
			adapter,
			configuration,
			contract,
			fallbackPublication(configuration, createdAt, "daylight-unavailable"),
		);
	}

	const remainingDaylightMinutes = Math.max(
		0,
		(daylightWindow.endsAt - createdAt) / 60_000,
	);
	if (
		createdAt < daylightWindow.startsAt
		|| createdAt >= daylightWindow.endsAt
	) {
		return applyChargePowerTarget(
			adapter,
			configuration,
			contract,
			fallbackPublication(
				configuration,
				createdAt,
				"outside-daylight",
				remainingDaylightMinutes,
			),
		);
	}

	const forecastEnergyRemainingWh = resolution.pvForecast.energyNowUntilEndOfDay.value;
	if (stateOfChargePercent === null || forecastEnergyRemainingWh === null) {
		return applyChargePowerTarget(
			adapter,
			configuration,
			contract,
			fallbackPublication(
				configuration,
				createdAt,
				"inputs-not-ready",
				remainingDaylightMinutes,
			),
		);
	}

	const decision = createStrategyChargingShadowDecision(configuration, {
		stateOfChargePercent,
		forecastEnergyRemainingWh,
		remainingDaylightMs: daylightWindow.endsAt - createdAt,
	});

	if (!decision.valid) {
		return applyChargePowerTarget(
			adapter,
			configuration,
			contract,
			fallbackPublication(
				configuration,
				createdAt,
				"invalid-input",
				remainingDaylightMinutes,
			),
		);
	}

	return applyChargePowerTarget(
		adapter,
		configuration,
		contract,
		strategyChargingPublicationFromDecision(decision, createdAt),
	);
}
