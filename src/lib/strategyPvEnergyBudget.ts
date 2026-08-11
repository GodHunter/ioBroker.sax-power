import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import type { StrategySafetyEnvelope } from "./strategySafetyEnvelope";

export interface StrategyPvEnergyBudget {
	readonly createdAt: number;
	readonly forecastEnergyWh: number;
	readonly reserveEnergyWh: number;
	readonly usableForecastEnergyWh: number;
	readonly requiredChargeEnergyWh: number;
	readonly forecastSurplusEnergyWh: number;
	readonly permittedDayDischargeEnergyWh: number;
}

export function createStrategyPvEnergyBudget(
	snapshot: StrategyInputSnapshot,
	configuration: StrategyConfiguration,
	safetyEnvelope: StrategySafetyEnvelope,
): StrategyPvEnergyBudget | null {
	const forecastEnergyWh =
		snapshot.pvForecast.energyNowUntilEndOfDayWh;
	const reserveEnergyWh = configuration.pvForecastReserveWh;
	const requiredChargeEnergyWh =
		safetyEnvelope.availableChargeEnergyWh;

	if (
		!Number.isFinite(snapshot.createdAt)
		|| snapshot.createdAt !== safetyEnvelope.createdAt
		|| !Number.isFinite(forecastEnergyWh)
		|| forecastEnergyWh < 0
		|| !Number.isFinite(reserveEnergyWh)
		|| reserveEnergyWh < 0
		|| !Number.isFinite(requiredChargeEnergyWh)
		|| requiredChargeEnergyWh < 0
		|| !Number.isFinite(safetyEnvelope.availableDischargeEnergyWh)
		|| safetyEnvelope.availableDischargeEnergyWh < 0
	) {
		return null;
	}

	const usableForecastEnergyWh = Math.max(
		0,
		forecastEnergyWh - reserveEnergyWh,
	);
	const forecastSurplusEnergyWh = Math.max(
		0,
		usableForecastEnergyWh - requiredChargeEnergyWh,
	);
	const permittedDayDischargeEnergyWh = Math.min(
		forecastSurplusEnergyWh,
		safetyEnvelope.availableDischargeEnergyWh,
	);

	return Object.freeze({
		createdAt: snapshot.createdAt,
		forecastEnergyWh,
		reserveEnergyWh,
		usableForecastEnergyWh,
		requiredChargeEnergyWh,
		forecastSurplusEnergyWh,
		permittedDayDischargeEnergyWh,
	});
}
