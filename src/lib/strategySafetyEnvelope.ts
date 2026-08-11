import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";

export interface StrategySafetyEnvelope {
	readonly createdAt: number;
	readonly stateOfChargePercent: number;
	readonly storedEnergyWh: number;
	readonly minimumStoredEnergyWh: number;
	readonly maximumStoredEnergyWh: number;
	readonly availableChargeEnergyWh: number;
	readonly availableDischargeEnergyWh: number;
	readonly maximumChargePowerW: number;
	readonly maximumDischargePowerW: number;
}

function energyAtStateOfCharge(
	batteryCapacityWh: number,
	stateOfChargePercent: number,
): number {
	return batteryCapacityWh * stateOfChargePercent / 100;
}

export function createStrategySafetyEnvelope(
	snapshot: StrategyInputSnapshot,
	configuration: StrategyConfiguration,
): StrategySafetyEnvelope | null {
	const stateOfChargePercent = snapshot.modbus.stateOfChargePercent;

	if (
		!Number.isFinite(snapshot.createdAt)
		|| !Number.isFinite(stateOfChargePercent)
		|| stateOfChargePercent < 0
		|| stateOfChargePercent > 100
	) {
		return null;
	}

	const storedEnergyWh = energyAtStateOfCharge(
		configuration.batteryCapacityWh,
		stateOfChargePercent,
	);
	const minimumStoredEnergyWh = energyAtStateOfCharge(
		configuration.batteryCapacityWh,
		configuration.minimumStateOfChargePercent,
	);
	const maximumStoredEnergyWh = energyAtStateOfCharge(
		configuration.batteryCapacityWh,
		configuration.maximumStateOfChargePercent,
	);
	const availableChargeEnergyWh = Math.max(
		0,
		maximumStoredEnergyWh - storedEnergyWh,
	);
	const availableDischargeEnergyWh = Math.max(
		0,
		storedEnergyWh - minimumStoredEnergyWh,
	);

	return Object.freeze({
		createdAt: snapshot.createdAt,
		stateOfChargePercent,
		storedEnergyWh,
		minimumStoredEnergyWh,
		maximumStoredEnergyWh,
		availableChargeEnergyWh,
		availableDischargeEnergyWh,
		maximumChargePowerW:
			availableChargeEnergyWh > 0
				? configuration.maximumChargePowerW
				: 0,
		maximumDischargePowerW:
			availableDischargeEnergyWh > 0
				? configuration.maximumDischargePowerW
				: 0,
	});
}
