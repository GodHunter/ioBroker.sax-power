import type { StrategyConfiguration } from "./strategyConfiguration";

export interface StrategySafetySnapshot {
	readonly createdAt: number;
	readonly modbus: {
		readonly stateOfChargePercent: number;
	};
}

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
	snapshot: StrategySafetySnapshot,
	configuration: StrategyConfiguration,
): StrategySafetyEnvelope | null {
	const stateOfChargePercent = snapshot.modbus.stateOfChargePercent;
	const batteryModel = getBatteryModel(configuration.batteryModelId);
	const technicalLimits = batteryModel === null
		? null
		: resolveStrategyBatteryTechnicalLimits(batteryModel);

	if (
		technicalLimits === null
		|| !Number.isFinite(snapshot.createdAt)
		|| !Number.isFinite(stateOfChargePercent)
		|| stateOfChargePercent < 0
		|| stateOfChargePercent > 100
		|| !Number.isFinite(configuration.maximumChargePowerW)
		|| configuration.maximumChargePowerW < 0
		|| configuration.maximumChargePowerW
			> technicalLimits.maximumChargePowerW
		|| !Number.isFinite(configuration.maximumDischargePowerW)
		|| configuration.maximumDischargePowerW < 0
		|| configuration.maximumDischargePowerW
			> technicalLimits.maximumDischargePowerW
	) {
		return null;
	}

	const storedEnergyWh = energyAtStateOfCharge(
		technicalLimits.usableCapacityWh,
		stateOfChargePercent,
	);
	const minimumStoredEnergyWh = energyAtStateOfCharge(
		technicalLimits.usableCapacityWh,
		configuration.minimumStateOfChargePercent,
	);
	const maximumStoredEnergyWh = energyAtStateOfCharge(
		technicalLimits.usableCapacityWh,
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
import { getBatteryModel } from "./batteryAnalysis";
import { resolveStrategyBatteryTechnicalLimits } from "./strategyBatteryChargeCapability";
