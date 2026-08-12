import { getBatteryModel } from "./batteryAnalysis";
import {
	estimateStrategyChargeDuration,
	resolveStrategyBatteryTechnicalLimits,
	type StrategyChargeDurationEstimate,
} from "./strategyBatteryChargeCapability";
import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyPvEnergyBudget } from "./strategyPvEnergyBudget";
import type { StrategySafetyEnvelope } from "./strategySafetyEnvelope";

export interface StrategyDayDischargeChargeTime {
	readonly createdAt: number;
	readonly daylightWindowEndsAt: number;
	readonly remainingDaylightSeconds: number;
	readonly projectedStateOfChargePercent: number;
	readonly chargeDurationEstimate: StrategyChargeDurationEstimate;
	readonly sufficient: boolean;
}

export function assessStrategyDayDischargeChargeTime(
	safetyEnvelope: StrategySafetyEnvelope,
	pvEnergyBudget: StrategyPvEnergyBudget,
	configuration: StrategyConfiguration,
	daylightWindowEndsAt: number,
): StrategyDayDischargeChargeTime | null {
	const { createdAt, stateOfChargePercent } = safetyEnvelope;
	const model = getBatteryModel(configuration.batteryModelId);
	const technicalLimits = model === null
		? null
		: resolveStrategyBatteryTechnicalLimits(model);

	if (
		model === null
		|| technicalLimits === null
		|| !Number.isFinite(createdAt)
		|| pvEnergyBudget.createdAt !== createdAt
		|| !Number.isFinite(daylightWindowEndsAt)
		|| !Number.isFinite(stateOfChargePercent)
		|| stateOfChargePercent < 0
		|| stateOfChargePercent > 100
		|| !Number.isFinite(pvEnergyBudget.permittedDayDischargeEnergyWh)
		|| pvEnergyBudget.permittedDayDischargeEnergyWh < 0
	) {
		return null;
	}

	const projectedDischargePercent =
		pvEnergyBudget.permittedDayDischargeEnergyWh
		/ technicalLimits.usableCapacityWh
		* 100;
	const projectedStateOfChargePercent = Math.max(
		configuration.minimumStateOfChargePercent,
		stateOfChargePercent - projectedDischargePercent,
	);
	const chargeDurationEstimate = estimateStrategyChargeDuration(
		model,
		projectedStateOfChargePercent,
		configuration.maximumStateOfChargePercent,
		configuration.maximumChargePowerW,
	);

	if (chargeDurationEstimate === null) {
		return null;
	}

	const remainingDaylightSeconds = Math.max(
		0,
		(daylightWindowEndsAt - createdAt) / 1_000,
	);

	return Object.freeze({
		createdAt,
		daylightWindowEndsAt,
		remainingDaylightSeconds,
		projectedStateOfChargePercent,
		chargeDurationEstimate,
		sufficient:
			chargeDurationEstimate.estimatedDurationSeconds
			<= remainingDaylightSeconds,
	});
}
