import type { StrategyConfiguration } from "./strategyConfiguration";
import { STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS } from "./strategyDayDischargeAvailabilityStates";
import type { StrategyDaylightWindowCycleExecution } from "./strategyDaylightWindowCycleExecution";
import { executeStrategyIoBrokerDaylightCycle, type StrategyIoBrokerDaylightCycleAdapter } from "./strategyIoBrokerDaylightCycle";
import { executeStrategyIoBrokerManualChargeCycle, type StrategyIoBrokerManualChargeAdapter } from "./strategyIoBrokerManualChargeCycle";
import { executeStrategyIoBrokerAutomaticChargingCycle, type StrategyIoBrokerAutomaticChargingAdapter, type StrategyIoBrokerAutomaticChargingCycle } from "./strategyIoBrokerAutomaticChargingCycle";
import type { StrategyManualChargeCycle } from "./strategyManualChargeCycle";
import { readStrategyManualChargeInput, STRATEGY_MANUAL_CHARGE_STATE_IDS } from "./strategyManualChargeStates";
import { STRATEGY_INTEGRATION_CONTRACT, type StrategyIntegrationContract } from "./strategyIntegrationContract";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";
import { DEFAULT_STRATEGY_MODES, type StrategyModes } from "./strategyModes";

export interface StrategyIoBrokerStrategyCycleAdapter extends StrategyIoBrokerDaylightCycleAdapter, StrategyIoBrokerManualChargeAdapter, StrategyIoBrokerAutomaticChargingAdapter {}

export interface StrategyIoBrokerStrategyCycle {
	readonly createdAt: number;
	readonly manualCharge: StrategyManualChargeCycle | null;
	readonly chargingShadow: StrategyIoBrokerAutomaticChargingCycle | null;
	readonly automatic: StrategyDaylightWindowCycleExecution | null;
}

interface DayDischargeReleaseState {
	readonly recoveryLatchActive: boolean;
	readonly previousAllowed: boolean;
	readonly releaseCandidateSince: number | null;
}

async function readDayDischargeReleaseState(adapter: StrategyIoBrokerStrategyCycleAdapter): Promise<DayDischargeReleaseState> {
	try {
		const [latch, allowed, candidate] = await Promise.all([
			adapter.getStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.corridorRecoveryLatched),
			adapter.getStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.allowed),
			adapter.getStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.releaseCandidateSince),
		]);
		const candidateValue = typeof candidate?.val === "number" && Number.isFinite(candidate.val) && candidate.val > 0 ? candidate.val : null;
		return Object.freeze({ recoveryLatchActive: latch?.val === true, previousAllowed: allowed?.val === true, releaseCandidateSince: candidateValue });
	} catch {
		return Object.freeze({ recoveryLatchActive: false, previousAllowed: false, releaseCandidateSince: null });
	}
}

export async function executeStrategyIoBrokerStrategyCycle(adapter: StrategyIoBrokerStrategyCycleAdapter, configuration: StrategyConfiguration, maximumForecastAgeMs: number, requestedDischargePowerW: number, contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT, resolverOptions: StrategyStateResolverOptions = {}, modes: StrategyModes = DEFAULT_STRATEGY_MODES): Promise<StrategyIoBrokerStrategyCycle | null> {
	const manualInput = modes.chargingControlEnabled ? await readStrategyManualChargeInput(adapter) : null;
	if (modes.chargingControlEnabled && manualInput === null) return null;
	const manualCharge = modes.chargingControlEnabled ? await executeStrategyIoBrokerManualChargeCycle(adapter, configuration, contract, resolverOptions) : null;
	if (manualInput?.enabled === true) {
		if (manualCharge === null) return null;
		return Object.freeze({ createdAt: manualCharge.createdAt, manualCharge, chargingShadow: null, automatic: null });
	}
	if (modes.chargingControlEnabled && manualCharge === null) {
		await Promise.all([
			adapter.setStateAsync(STRATEGY_MANUAL_CHARGE_STATE_IDS.operatingMode, { val: "automatic", ack: true }),
			adapter.setStateAsync(STRATEGY_MANUAL_CHARGE_STATE_IDS.automaticStrategyAllowed, { val: true, ack: true }),
		]);
	}
	const chargingControl = modes.chargingControlEnabled ? await executeStrategyIoBrokerAutomaticChargingCycle(adapter, configuration, contract, resolverOptions) : null;
	if (!modes.dayAvailabilityEnabled) return Object.freeze({ createdAt: manualCharge?.createdAt ?? resolverOptions.now ?? Date.now(), manualCharge, chargingShadow: chargingControl, automatic: null });
	const releaseState = await readDayDischargeReleaseState(adapter);
	const automatic = await executeStrategyIoBrokerDaylightCycle(
		adapter,
		configuration,
		maximumForecastAgeMs,
		requestedDischargePowerW,
		contract,
		resolverOptions,
		chargingControl === null ? null : {
			reason: chargingControl.reason,
			currentSocPercent: chargingControl.currentSocPercent,
			plannedSocPercent: chargingControl.plannedSocPercent,
			plannedSocLowerPercent: chargingControl.plannedSocLowerPercent,
			plannedSocUpperPercent: chargingControl.plannedSocUpperPercent,
			forecastMarginWh: chargingControl.forecastMarginWh,
			energyRequiredWh: chargingControl.energyRequiredWh,
			requiredAverageChargePowerW: chargingControl.requiredAverageChargePowerW,
			targetChargePowerW: chargingControl.targetChargePowerW,
			maximumChargePowerW: chargingControl.maximumChargePowerW,
			requestedDischargePowerW,
			recoveryLatchActive: releaseState.recoveryLatchActive,
			previousAllowed: releaseState.previousAllowed,
			releaseCandidateSince: releaseState.releaseCandidateSince,
		},
	);
	if (automatic === null || (manualCharge !== null && automatic.createdAt !== manualCharge.createdAt)) return null;
	return Object.freeze({ createdAt: automatic.createdAt, manualCharge, chargingShadow: chargingControl, automatic });
}
