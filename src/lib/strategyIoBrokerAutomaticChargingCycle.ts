import type { StrategyConfiguration } from "./strategyConfiguration";
import { createStrategyChargingDecision, type StrategyChargingDecisionReason } from "./strategyChargingDecision";
import { STRATEGY_CHARGING_STATE_IDS, publishStrategyCharging, strategyChargingPublicationFromDecision, type StrategyChargingIoBrokerAdapter, type StrategyChargingPublication, type StrategyChargingReason } from "./strategyChargingStates";
import { publishStrategyDaylightDiagnostics, type StrategyDaylightDiagnosticAdapter } from "./strategyDaylightDiagnosticStates";
import { STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS } from "./strategyHouseholdLearningStates";
import { STRATEGY_INTEGRATION_CONTRACT, type StrategyIntegrationContract } from "./strategyIntegrationContract";
import { createStrategyIoBrokerDaylightWindowProvider, type StrategyIoBrokerDaylightAdapter } from "./strategyIoBrokerDaylightWindow";
import { createStrategyIoBrokerRuntime, type StrategyIoBrokerRuntimeAdapter } from "./strategyIoBrokerRuntime";
import { resolveStrategyStates, type StrategyStateResolution, type StrategyStateResolverOptions } from "./strategyStateResolver";

const MAXIMUM_HOUSEHOLD_LEARNING_AGE_MS = 120_000;

export interface StrategyIoBrokerAutomaticChargingAdapter extends StrategyIoBrokerRuntimeAdapter, StrategyIoBrokerDaylightAdapter, StrategyChargingIoBrokerAdapter, StrategyDaylightDiagnosticAdapter {
	getStateAsync(stateId: string): Promise<ioBroker.State | null | undefined>;
}

export interface StrategyIoBrokerAutomaticChargingCycle {
	readonly createdAt: number;
	readonly targetChargePowerW: number;
	readonly reason: StrategyChargingReason;
	readonly currentSocPercent: number | null;
	readonly plannedSocUpperPercent: number | null;
	readonly forecastMarginWh: number | null;
	readonly requiredAverageChargePowerW: number | null;
	readonly maximumChargePowerW: number;
	readonly register44Written: true;
}

function fallbackPublication(configuration: StrategyConfiguration, createdAt: number, reason: StrategyChargingReason, remainingDaylightMinutes: number | null = null): StrategyChargingPublication {
	return Object.freeze({ active: true, targetChargePowerW: configuration.maximumChargePowerW, requiredAverageChargePowerW: null, energyRequiredWh: null, forecastEnergyRemainingWh: null, forecastMarginWh: null, remainingDaylightMinutes, targetDeadlineRemainingMinutes: null, plannedSocPercent: null, plannedSocLowerPercent: null, plannedSocUpperPercent: null, socDeviationPercent: null, decisionReason: reason, lastUpdate: createdAt, lastCommandAt: createdAt });
}

async function readLearnedHouseholdEnergyRemainingWh(adapter: StrategyIoBrokerAutomaticChargingAdapter, createdAt: number): Promise<number> {
	try {
		const [energyState, confidenceState, lastUpdateState] = await Promise.all([
			adapter.getStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.expectedRemainingEnergyWh),
			adapter.getStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.confidence),
			adapter.getStateAsync(STRATEGY_HOUSEHOLD_LEARNING_STATE_IDS.lastUpdate),
		]);
		const energy = energyState?.val;
		const confidence = confidenceState?.val;
		const lastUpdate = lastUpdateState?.val;
		if (typeof energy !== "number" || !Number.isFinite(energy) || energy < 0) return 0;
		if (confidence !== "learning" && confidence !== "established") return 0;
		if (typeof lastUpdate !== "number" || !Number.isFinite(lastUpdate)) return 0;
		const ageMs = createdAt - lastUpdate;
		if (ageMs < 0 || ageMs > MAXIMUM_HOUSEHOLD_LEARNING_AGE_MS) return 0;
		return energy;
	} catch { return 0; }
}

async function readPreviousDecisionReason(adapter: StrategyIoBrokerAutomaticChargingAdapter): Promise<StrategyChargingDecisionReason | null> {
	try {
		const value = (await adapter.getStateAsync(STRATEGY_CHARGING_STATE_IDS.decisionReason))?.val;
		if (value === "target-soc-reached" || value === "forecast-insufficient" || value === "forecast-balanced" || value === "trajectory-recovery" || value === "target-deadline-recovery" || value === "invalid-input") return value;
	} catch { /* Previous state is only used for hysteresis. */ }
	return null;
}

async function applyChargePowerTarget(adapter: StrategyIoBrokerAutomaticChargingAdapter, configuration: StrategyConfiguration, contract: StrategyIntegrationContract, publication: StrategyChargingPublication, currentSocPercent: number | null = null): Promise<StrategyIoBrokerAutomaticChargingCycle> {
	const runtime = createStrategyIoBrokerRuntime(adapter);
	const command = contract.modbus.chargePowerCommand;
	const targetChargePowerW = Math.max(0, Math.min(configuration.maximumChargePowerW, Math.round(publication.targetChargePowerW)));
	await runtime.writer.setForeignState(command.stateId, targetChargePowerW, false);
	await publishStrategyCharging(adapter, { ...publication, targetChargePowerW, lastCommandAt: publication.lastUpdate });
	return Object.freeze({
		createdAt: publication.lastUpdate,
		targetChargePowerW,
		reason: publication.decisionReason,
		currentSocPercent,
		plannedSocUpperPercent: publication.plannedSocUpperPercent,
		forecastMarginWh: publication.forecastMarginWh,
		requiredAverageChargePowerW: publication.requiredAverageChargePowerW,
		maximumChargePowerW: configuration.maximumChargePowerW,
		register44Written: true as const,
	});
}

export async function executeStrategyIoBrokerAutomaticChargingCycle(adapter: StrategyIoBrokerAutomaticChargingAdapter, configuration: StrategyConfiguration, contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT, resolverOptions: StrategyStateResolverOptions = {}): Promise<StrategyIoBrokerAutomaticChargingCycle | null> {
	const createdAt = resolverOptions.now ?? Date.now();
	if (!Number.isFinite(createdAt)) return null;
	const runtime = createStrategyIoBrokerRuntime(adapter);
	let resolution: StrategyStateResolution;
	try { resolution = await resolveStrategyStates(runtime.reader, contract, { ...resolverOptions, now: createdAt }); }
	catch { return applyChargePowerTarget(adapter, configuration, contract, fallbackPublication(configuration, createdAt, "inputs-not-ready")); }
	if (!resolution.modbus.chargePowerCommand.available) return null;
	let daylightWindow: Awaited<ReturnType<ReturnType<typeof createStrategyIoBrokerDaylightWindowProvider>["getDaylightWindow"]>>;
	try { daylightWindow = await createStrategyIoBrokerDaylightWindowProvider(adapter).getDaylightWindow(createdAt); }
	catch { return applyChargePowerTarget(adapter, configuration, contract, fallbackPublication(configuration, createdAt, "daylight-unavailable")); }
	await publishStrategyDaylightDiagnostics(adapter, createdAt, daylightWindow ?? null);
	const stateOfChargePercent = resolution.modbus.stateOfCharge.value;
	if (stateOfChargePercent !== null && stateOfChargePercent < configuration.minimumStateOfChargePercent) return applyChargePowerTarget(adapter, configuration, contract, fallbackPublication(configuration, createdAt, "below-minimum-soc"), stateOfChargePercent);
	if (!resolution.strategyInputsReady) return applyChargePowerTarget(adapter, configuration, contract, fallbackPublication(configuration, createdAt, "inputs-not-ready"), stateOfChargePercent);
	if (daylightWindow == null) return applyChargePowerTarget(adapter, configuration, contract, fallbackPublication(configuration, createdAt, "daylight-unavailable"), stateOfChargePercent);
	const remainingDaylightMinutes = Math.max(0, (daylightWindow.endsAt - createdAt) / 60_000);
	if (createdAt < daylightWindow.startsAt || createdAt >= daylightWindow.endsAt) return applyChargePowerTarget(adapter, configuration, contract, fallbackPublication(configuration, createdAt, "outside-daylight", remainingDaylightMinutes), stateOfChargePercent);
	const forecastEnergyRemainingWh = resolution.pvForecast.energyNowUntilEndOfDay.value;
	if (stateOfChargePercent === null || forecastEnergyRemainingWh === null) return applyChargePowerTarget(adapter, configuration, contract, fallbackPublication(configuration, createdAt, "inputs-not-ready", remainingDaylightMinutes), stateOfChargePercent);
	const [householdEnergyRemainingWh, previousDecisionReason] = await Promise.all([readLearnedHouseholdEnergyRemainingWh(adapter, createdAt), readPreviousDecisionReason(adapter)]);
	const totalDaylightMs = daylightWindow.endsAt - daylightWindow.startsAt;
	const decision = createStrategyChargingDecision(configuration, {
		stateOfChargePercent,
		forecastEnergyRemainingWh,
		householdEnergyRemainingWh,
		remainingDaylightMs: daylightWindow.endsAt - createdAt,
		elapsedDaylightMs: createdAt - daylightWindow.startsAt,
		totalDaylightMs,
		previousDecisionReason,
	});
	if (!decision.valid) return applyChargePowerTarget(adapter, configuration, contract, fallbackPublication(configuration, createdAt, "invalid-input", remainingDaylightMinutes), stateOfChargePercent);
	return applyChargePowerTarget(adapter, configuration, contract, strategyChargingPublicationFromDecision(decision, createdAt), stateOfChargePercent);
}
