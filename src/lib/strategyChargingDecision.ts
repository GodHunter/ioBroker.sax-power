import { getBatteryModel } from "./batteryAnalysis";
import type { StrategyConfiguration } from "./strategyConfiguration";

export type StrategyChargingDecisionReason =
	| "target-soc-reached"
	| "forecast-insufficient"
	| "forecast-balanced"
	| "trajectory-recovery"
	| "invalid-input";

export interface StrategyChargingDecisionInput {
	readonly stateOfChargePercent: number;
	readonly forecastEnergyRemainingWh: number;
	readonly remainingDaylightMs: number;
	readonly elapsedDaylightMs?: number;
	readonly totalDaylightMs?: number;
	readonly householdEnergyRemainingWh?: number;
}

export interface StrategyChargingDecision {
	readonly valid: boolean;
	readonly reason: StrategyChargingDecisionReason;
	readonly currentSocPercent: number;
	readonly targetSocPercent: number;
	readonly plannedSocPercent: number;
	readonly plannedSocLowerPercent: number;
	readonly plannedSocUpperPercent: number;
	readonly socDeviationPercent: number;
	readonly usableCapacityWh: number;
	readonly energyRequiredWh: number;
	readonly forecastEnergyRemainingWh: number;
	readonly householdEnergyRemainingWh: number;
	readonly forecastReserveWh: number;
	readonly usableForecastEnergyWh: number;
	readonly forecastMarginWh: number;
	readonly remainingDaylightMs: number;
	readonly requiredAverageChargePowerW: number;
	readonly chargePowerLimitW: number;
	readonly maximumChargePowerW: number;
}

const CHARGE_POWER_HEADROOM_FACTOR = 1.25;
const TRAJECTORY_RECOVERY_HEADROOM_FACTOR = 1.15;
const TRAJECTORY_CORRIDOR_PERCENT = 3;
const TRAJECTORY_RECOVERY_WINDOW_MS = 2 * 60 * 60 * 1000;
const MINIMUM_DAYLIGHT_MS = 60_000;

function roundPower(value: number): number {
	return Math.max(0, Math.round(value));
}

function trajectory(
	configuration: StrategyConfiguration,
	input: StrategyChargingDecisionInput,
): Readonly<{
	plannedSocPercent: number;
	plannedSocLowerPercent: number;
	plannedSocUpperPercent: number;
	socDeviationPercent: number;
}> {
	const minimumSoc = configuration.minimumStateOfChargePercent;
	const targetSoc = configuration.maximumStateOfChargePercent;
	const totalDaylightMs = input.totalDaylightMs ?? 0;
	const elapsedDaylightMs = input.elapsedDaylightMs ?? 0;
	const progress = totalDaylightMs > 0
		? Math.max(0, Math.min(1, elapsedDaylightMs / totalDaylightMs))
		: 0;
	// Slightly front-loaded curve: creates useful SOC earlier while still preserving PV headroom.
	const shapedProgress = Math.pow(progress, 0.85);
	const plannedSocPercent = minimumSoc + (targetSoc - minimumSoc) * shapedProgress;
	const plannedSocLowerPercent = Math.max(minimumSoc, plannedSocPercent - TRAJECTORY_CORRIDOR_PERCENT);
	const plannedSocUpperPercent = Math.min(targetSoc, plannedSocPercent + TRAJECTORY_CORRIDOR_PERCENT);

	return Object.freeze({
		plannedSocPercent,
		plannedSocLowerPercent,
		plannedSocUpperPercent,
		socDeviationPercent: input.stateOfChargePercent - plannedSocPercent,
	});
}

function invalidDecision(
	configuration: StrategyConfiguration,
	input: StrategyChargingDecisionInput,
): StrategyChargingDecision {
	return Object.freeze({
		valid: false,
		reason: "invalid-input" as const,
		currentSocPercent: input.stateOfChargePercent,
		targetSocPercent: configuration.maximumStateOfChargePercent,
		plannedSocPercent: configuration.minimumStateOfChargePercent,
		plannedSocLowerPercent: configuration.minimumStateOfChargePercent,
		plannedSocUpperPercent: configuration.minimumStateOfChargePercent,
		socDeviationPercent: 0,
		usableCapacityWh: 0,
		energyRequiredWh: 0,
		forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
		householdEnergyRemainingWh: input.householdEnergyRemainingWh ?? 0,
		forecastReserveWh: configuration.pvForecastReserveWh,
		usableForecastEnergyWh: 0,
		forecastMarginWh: 0,
		remainingDaylightMs: input.remainingDaylightMs,
		requiredAverageChargePowerW: 0,
		chargePowerLimitW: 0,
		maximumChargePowerW: configuration.maximumChargePowerW,
	});
}

export function createStrategyChargingDecision(
	configuration: StrategyConfiguration,
	input: StrategyChargingDecisionInput,
): StrategyChargingDecision {
	const model = getBatteryModel(configuration.batteryModelId);
	const householdEnergyRemainingWh = input.householdEnergyRemainingWh ?? 0;
	const elapsedDaylightMs = input.elapsedDaylightMs ?? 0;
	const totalDaylightMs = input.totalDaylightMs ?? 0;

	if (
		model === null
		|| !Number.isFinite(input.stateOfChargePercent)
		|| input.stateOfChargePercent < 0
		|| input.stateOfChargePercent > 100
		|| !Number.isFinite(input.forecastEnergyRemainingWh)
		|| input.forecastEnergyRemainingWh < 0
		|| !Number.isFinite(input.remainingDaylightMs)
		|| input.remainingDaylightMs < 0
		|| !Number.isFinite(householdEnergyRemainingWh)
		|| householdEnergyRemainingWh < 0
		|| !Number.isFinite(elapsedDaylightMs)
		|| elapsedDaylightMs < 0
		|| !Number.isFinite(totalDaylightMs)
		|| totalDaylightMs < 0
	) {
		return invalidDecision(configuration, input);
	}

	const trajectoryState = trajectory(configuration, input);
	const usableCapacityWh = model.usableCapacityKwh * 1_000;
	const targetSocPercent = configuration.maximumStateOfChargePercent;
	const socGapPercent = Math.max(0, targetSocPercent - input.stateOfChargePercent);
	const energyRequiredWh = usableCapacityWh * socGapPercent / 100;
	const usableForecastEnergyWh = Math.max(
		0,
		input.forecastEnergyRemainingWh
			- householdEnergyRemainingWh
			- configuration.pvForecastReserveWh,
	);
	const forecastMarginWh = usableForecastEnergyWh - energyRequiredWh;
	const effectiveDaylightMs = Math.max(MINIMUM_DAYLIGHT_MS, input.remainingDaylightMs);
	const remainingHours = effectiveDaylightMs / 3_600_000;
	const requiredAverageChargePowerW = energyRequiredWh / remainingHours;

	if (energyRequiredWh <= 0) {
		return Object.freeze({
			valid: true,
			reason: "target-soc-reached" as const,
			currentSocPercent: input.stateOfChargePercent,
			targetSocPercent,
			...trajectoryState,
			usableCapacityWh,
			energyRequiredWh,
			forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
			householdEnergyRemainingWh,
			forecastReserveWh: configuration.pvForecastReserveWh,
			usableForecastEnergyWh,
			forecastMarginWh,
			remainingDaylightMs: input.remainingDaylightMs,
			requiredAverageChargePowerW: 0,
			chargePowerLimitW: 0,
			maximumChargePowerW: configuration.maximumChargePowerW,
		});
	}

	const forecastInsufficient = usableForecastEnergyWh < energyRequiredWh;
	let desiredPowerW = forecastInsufficient
		? configuration.maximumChargePowerW
		: requiredAverageChargePowerW * CHARGE_POWER_HEADROOM_FACTOR;
	let reason: StrategyChargingDecisionReason = forecastInsufficient
		? "forecast-insufficient"
		: "forecast-balanced";

	if (!forecastInsufficient && input.stateOfChargePercent < trajectoryState.plannedSocLowerPercent) {
		const deficitPercent = trajectoryState.plannedSocPercent - input.stateOfChargePercent;
		const deficitEnergyWh = usableCapacityWh * Math.max(0, deficitPercent) / 100;
		const recoveryWindowMs = Math.max(
			MINIMUM_DAYLIGHT_MS,
			Math.min(TRAJECTORY_RECOVERY_WINDOW_MS, effectiveDaylightMs),
		);
		const recoveryPowerW = deficitEnergyWh / (recoveryWindowMs / 3_600_000);
		desiredPowerW = Math.max(
			desiredPowerW,
			recoveryPowerW * TRAJECTORY_RECOVERY_HEADROOM_FACTOR,
		);
		reason = "trajectory-recovery";
	}

	const chargePowerLimitW = roundPower(Math.min(
		configuration.maximumChargePowerW,
		desiredPowerW,
	));

	return Object.freeze({
		valid: true,
		reason,
		currentSocPercent: input.stateOfChargePercent,
		targetSocPercent,
		...trajectoryState,
		usableCapacityWh,
		energyRequiredWh,
		forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
		householdEnergyRemainingWh,
		forecastReserveWh: configuration.pvForecastReserveWh,
		usableForecastEnergyWh,
		forecastMarginWh,
		remainingDaylightMs: input.remainingDaylightMs,
		requiredAverageChargePowerW: roundPower(requiredAverageChargePowerW),
		chargePowerLimitW,
		maximumChargePowerW: configuration.maximumChargePowerW,
	});
}
