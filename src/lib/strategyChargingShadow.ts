import { getBatteryModel } from "./batteryAnalysis";
import type { StrategyConfiguration } from "./strategyConfiguration";

export type StrategyChargingShadowReason =
	| "target-soc-reached"
	| "forecast-insufficient"
	| "forecast-balanced"
	| "invalid-input";

export interface StrategyChargingShadowInput {
	readonly stateOfChargePercent: number;
	readonly forecastEnergyRemainingWh: number;
	readonly remainingDaylightMs: number;
}

export interface StrategyChargingShadowDecision {
	readonly valid: boolean;
	readonly reason: StrategyChargingShadowReason;
	readonly currentSocPercent: number;
	readonly targetSocPercent: number;
	readonly usableCapacityWh: number;
	readonly energyRequiredWh: number;
	readonly forecastEnergyRemainingWh: number;
	readonly forecastReserveWh: number;
	readonly usableForecastEnergyWh: number;
	readonly forecastMarginWh: number;
	readonly remainingDaylightMs: number;
	readonly requiredAverageChargePowerW: number;
	readonly shadowChargePowerLimitW: number;
	readonly maximumChargePowerW: number;
	readonly wouldWriteRegister44: false;
}

const CHARGE_POWER_HEADROOM_FACTOR = 1.25;
const MINIMUM_DAYLIGHT_MS = 60_000;

function invalidDecision(
	configuration: StrategyConfiguration,
	input: StrategyChargingShadowInput,
): StrategyChargingShadowDecision {
	return Object.freeze({
		valid: false,
		reason: "invalid-input" as const,
		currentSocPercent: input.stateOfChargePercent,
		targetSocPercent: configuration.maximumStateOfChargePercent,
		usableCapacityWh: 0,
		energyRequiredWh: 0,
		forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
		forecastReserveWh: configuration.pvForecastReserveWh,
		usableForecastEnergyWh: 0,
		forecastMarginWh: 0,
		remainingDaylightMs: input.remainingDaylightMs,
		requiredAverageChargePowerW: 0,
		shadowChargePowerLimitW: 0,
		maximumChargePowerW: configuration.maximumChargePowerW,
		wouldWriteRegister44: false as const,
	});
}

function roundPower(value: number): number {
	return Math.max(0, Math.round(value));
}

export function createStrategyChargingShadowDecision(
	configuration: StrategyConfiguration,
	input: StrategyChargingShadowInput,
): StrategyChargingShadowDecision {
	const model = getBatteryModel(configuration.batteryModelId);

	if (
		model === null
		|| !Number.isFinite(input.stateOfChargePercent)
		|| input.stateOfChargePercent < 0
		|| input.stateOfChargePercent > 100
		|| !Number.isFinite(input.forecastEnergyRemainingWh)
		|| input.forecastEnergyRemainingWh < 0
		|| !Number.isFinite(input.remainingDaylightMs)
		|| input.remainingDaylightMs < 0
	) {
		return invalidDecision(configuration, input);
	}

	const usableCapacityWh = model.usableCapacityKwh * 1_000;
	const targetSocPercent = configuration.maximumStateOfChargePercent;
	const socGapPercent = Math.max(
		0,
		targetSocPercent - input.stateOfChargePercent,
	);
	const energyRequiredWh = usableCapacityWh * socGapPercent / 100;
	const usableForecastEnergyWh = Math.max(
		0,
		input.forecastEnergyRemainingWh - configuration.pvForecastReserveWh,
	);
	const forecastMarginWh = usableForecastEnergyWh - energyRequiredWh;
	const effectiveDaylightMs = Math.max(
		MINIMUM_DAYLIGHT_MS,
		input.remainingDaylightMs,
	);
	const remainingHours = effectiveDaylightMs / 3_600_000;
	const requiredAverageChargePowerW = energyRequiredWh / remainingHours;

	if (energyRequiredWh <= 0) {
		return Object.freeze({
			valid: true,
			reason: "target-soc-reached" as const,
			currentSocPercent: input.stateOfChargePercent,
			targetSocPercent,
			usableCapacityWh,
			energyRequiredWh,
			forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
			forecastReserveWh: configuration.pvForecastReserveWh,
			usableForecastEnergyWh,
			forecastMarginWh,
			remainingDaylightMs: input.remainingDaylightMs,
			requiredAverageChargePowerW: 0,
			shadowChargePowerLimitW: 0,
			maximumChargePowerW: configuration.maximumChargePowerW,
			wouldWriteRegister44: false as const,
		});
	}

	const forecastInsufficient = usableForecastEnergyWh < energyRequiredWh;
	const desiredPowerW = forecastInsufficient
		? configuration.maximumChargePowerW
		: requiredAverageChargePowerW * CHARGE_POWER_HEADROOM_FACTOR;
	const shadowChargePowerLimitW = roundPower(Math.min(
		configuration.maximumChargePowerW,
		desiredPowerW,
	));

	return Object.freeze({
		valid: true,
		reason: forecastInsufficient
			? "forecast-insufficient" as const
			: "forecast-balanced" as const,
		currentSocPercent: input.stateOfChargePercent,
		targetSocPercent,
		usableCapacityWh,
		energyRequiredWh,
		forecastEnergyRemainingWh: input.forecastEnergyRemainingWh,
		forecastReserveWh: configuration.pvForecastReserveWh,
		usableForecastEnergyWh,
		forecastMarginWh,
		remainingDaylightMs: input.remainingDaylightMs,
		requiredAverageChargePowerW: roundPower(requiredAverageChargePowerW),
		shadowChargePowerLimitW,
		maximumChargePowerW: configuration.maximumChargePowerW,
		wouldWriteRegister44: false as const,
	});
}
