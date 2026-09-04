import type {
	StrategyRuntimeConfigurationInput,
} from "./strategyRuntimeConfiguration";

export interface StrategyNativeConfiguration {
	readonly strategyEnabled?: unknown;
	readonly strategyModbusInstance?: unknown;
	readonly strategyPvForecastInstance?: unknown;
	readonly strategyBatteryModelId?: unknown;
	readonly strategyMinimumStateOfChargePercent?: unknown;
	readonly strategyMaximumStateOfChargePercent?: unknown;
	readonly strategyMaximumChargePowerW?: unknown;
	readonly strategyMaximumDischargePowerW?: unknown;
	readonly strategyPvForecastReserveWh?: unknown;
	readonly strategyMaximumForecastAgeMs?: unknown;
	readonly strategyRequestedDischargePowerW?: unknown;
	readonly strategyIntervalMs?: unknown;
	readonly strategyChargingControlEnabled?: unknown;
	readonly strategyDayAvailabilityEnabled?: unknown;
	readonly strategyNightDischargeEnabled?: unknown;
	readonly strategyHouseholdLearningEnabled?: unknown;
	readonly strategyPvPowerSourceMode?: unknown;
	readonly strategyPvPowerStateId?: unknown;
	readonly strategyPvNominalPowerWp?: unknown;
}

export function strategyRuntimeConfigurationFromNative(
	native: StrategyNativeConfiguration,
): StrategyRuntimeConfigurationInput {
	return Object.freeze({
		enabled: native.strategyEnabled ?? false,
		modbusInstance: native.strategyModbusInstance,
		pvForecastInstance: native.strategyPvForecastInstance,
		batteryModelId: native.strategyBatteryModelId,
		minimumStateOfChargePercent:
			native.strategyMinimumStateOfChargePercent,
		maximumStateOfChargePercent:
			native.strategyMaximumStateOfChargePercent,
		maximumChargePowerW: native.strategyMaximumChargePowerW,
		maximumDischargePowerW: native.strategyMaximumDischargePowerW,
		pvForecastReserveWh: native.strategyPvForecastReserveWh,
		maximumForecastAgeMs: native.strategyMaximumForecastAgeMs,
		requestedDischargePowerW: native.strategyRequestedDischargePowerW,
		intervalMs: native.strategyIntervalMs,
		chargingControlEnabled: native.strategyChargingControlEnabled ?? true,
		dayAvailabilityEnabled: native.strategyDayAvailabilityEnabled ?? true,
		nightDischargeEnabled: native.strategyNightDischargeEnabled ?? false,
		householdLearningEnabled: native.strategyHouseholdLearningEnabled ?? true,
		pvPowerSourceMode: native.strategyPvPowerSourceMode ?? "none",
		pvPowerStateId: native.strategyPvPowerStateId,
		pvNominalPowerWp: native.strategyPvNominalPowerWp,
	});
}
