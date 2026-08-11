import type {
	StrategyResolvedState,
	StrategyStateResolution,
} from "./strategyStateResolver";

export interface StrategyModbusInputSnapshot {
	readonly operatingState: number;
	readonly stateOfChargePercent: number;
	readonly batteryPowerW: number;
	readonly smartMeterPowerW: number;
}

export interface StrategyPvForecastInputSnapshot {
	readonly energyNowUntilEndOfDayWh: number;
	readonly energyTodayWh: number;
	readonly energyTomorrowWh: number;
	readonly lastUpdatedTimestamp: number;
}

export interface StrategyInputSnapshot {
	readonly createdAt: number;
	readonly modbus: StrategyModbusInputSnapshot;
	readonly pvForecast: StrategyPvForecastInputSnapshot;
}

function resolvedNumber(state: StrategyResolvedState): number | null {
	if (
		!state.available
		|| state.reason !== null
		|| state.value === null
		|| !Number.isFinite(state.value)
	) {
		return null;
	}

	return state.value;
}

export function createStrategyInputSnapshot(
	resolution: StrategyStateResolution,
	createdAt: number = Date.now(),
): StrategyInputSnapshot | null {
	if (
		!Number.isFinite(createdAt)
		|| !resolution.modbusReady
		|| !resolution.pvForecastReady
		|| !resolution.strategyInputsReady
		|| resolution.unavailableStateIds.length > 0
		|| !resolution.modbus.dischargePowerCommand.available
		|| resolution.modbus.dischargePowerCommand.reason !== null
		|| !resolution.modbus.chargePowerCommand.available
		|| resolution.modbus.chargePowerCommand.reason !== null
	) {
		return null;
	}

	const operatingState = resolvedNumber(resolution.modbus.operatingState);
	const stateOfChargePercent = resolvedNumber(
		resolution.modbus.stateOfCharge,
	);
	const batteryPowerW = resolvedNumber(resolution.modbus.batteryPower);
	const smartMeterPowerW = resolvedNumber(resolution.modbus.smartMeterPower);
	const energyNowUntilEndOfDayWh = resolvedNumber(
		resolution.pvForecast.energyNowUntilEndOfDay,
	);
	const energyTodayWh = resolvedNumber(resolution.pvForecast.energyToday);
	const energyTomorrowWh = resolvedNumber(
		resolution.pvForecast.energyTomorrow,
	);
	const lastUpdatedTimestamp = resolvedNumber(
		resolution.pvForecast.lastUpdated,
	);

	if (
		operatingState === null
		|| stateOfChargePercent === null
		|| batteryPowerW === null
		|| smartMeterPowerW === null
		|| energyNowUntilEndOfDayWh === null
		|| energyTodayWh === null
		|| energyTomorrowWh === null
		|| lastUpdatedTimestamp === null
	) {
		return null;
	}

	const modbus = Object.freeze({
		operatingState,
		stateOfChargePercent,
		batteryPowerW,
		smartMeterPowerW,
	});
	const pvForecast = Object.freeze({
		energyNowUntilEndOfDayWh,
		energyTodayWh,
		energyTomorrowWh,
		lastUpdatedTimestamp,
	});

	return Object.freeze({ createdAt, modbus, pvForecast });
}
