import type {
	StrategyRuntimeConfigurationInput,
} from "./strategyRuntimeConfiguration";

export interface StrategyNativeConfiguration {
	readonly strategyEnabled?: unknown;
	readonly strategyModbusInstance?: unknown;
	readonly strategyBatteryModelId?: unknown;
	readonly strategyMinimumStateOfChargePercent?: unknown;
	readonly strategyMaximumStateOfChargePercent?: unknown;
	readonly strategyMaximumChargePowerW?: unknown;
	readonly strategyMaximumDischargePowerW?: unknown;
	readonly strategyPvForecastReserveWh?: unknown;
	readonly strategyMaximumForecastAgeMs?: unknown;
	readonly strategyRequestedDischargePowerW?: unknown;
	readonly strategyIntervalMs?: unknown;
}

export function strategyRuntimeConfigurationFromNative(
	native: StrategyNativeConfiguration,
): StrategyRuntimeConfigurationInput {
	return Object.freeze({
		enabled: native.strategyEnabled ?? false,
		modbusInstance: native.strategyModbusInstance,
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
	});
}
