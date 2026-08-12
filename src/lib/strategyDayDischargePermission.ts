import type { StrategyPvEnergyBudget } from "./strategyPvEnergyBudget";
import type { StrategyPvForecastFreshness } from "./strategyPvForecastFreshness";
import type { StrategySafetyEnvelope } from "./strategySafetyEnvelope";

export type StrategyDayDischargeReason =
	| "forecast-stale"
	| "minimum-state-of-charge-reached"
	| "insufficient-pv-energy"
	| "insufficient-charge-time"
	| "discharge-allowed";

export interface StrategyDayDischargePermission {
	readonly createdAt: number;
	readonly allowed: boolean;
	readonly reason: StrategyDayDischargeReason;
	readonly permittedDischargeEnergyWh: number;
	readonly maximumDischargePowerW: number;
}

export function createStrategyDayDischargePermission(
	safetyEnvelope: StrategySafetyEnvelope,
	pvEnergyBudget: StrategyPvEnergyBudget,
	pvForecastFreshness: StrategyPvForecastFreshness,
	chargeTime: Pick<StrategyDayDischargeChargeTime, "createdAt" | "sufficient">,
	chargeTimeRequired: boolean = true,
): StrategyDayDischargePermission | null {
	const { createdAt } = safetyEnvelope;

	if (
		!Number.isFinite(createdAt)
		|| pvEnergyBudget.createdAt !== createdAt
		|| pvForecastFreshness.createdAt !== createdAt
		|| chargeTime.createdAt !== createdAt
		|| typeof chargeTime.sufficient !== "boolean"
		|| typeof chargeTimeRequired !== "boolean"
		|| !Number.isFinite(safetyEnvelope.availableDischargeEnergyWh)
		|| safetyEnvelope.availableDischargeEnergyWh < 0
		|| !Number.isFinite(safetyEnvelope.maximumDischargePowerW)
		|| safetyEnvelope.maximumDischargePowerW < 0
		|| !Number.isFinite(pvEnergyBudget.permittedDayDischargeEnergyWh)
		|| pvEnergyBudget.permittedDayDischargeEnergyWh < 0
	) {
		return null;
	}

	let reason: StrategyDayDischargeReason = "discharge-allowed";

	if (!pvForecastFreshness.fresh) {
		reason = "forecast-stale";
	} else if (
		safetyEnvelope.availableDischargeEnergyWh === 0
		|| safetyEnvelope.maximumDischargePowerW === 0
	) {
		reason = "minimum-state-of-charge-reached";
	} else if (pvEnergyBudget.permittedDayDischargeEnergyWh === 0) {
		reason = "insufficient-pv-energy";
	} else if (chargeTimeRequired && !chargeTime.sufficient) {
		reason = "insufficient-charge-time";
	}

	const allowed = reason === "discharge-allowed";

	return Object.freeze({
		createdAt,
		allowed,
		reason,
		permittedDischargeEnergyWh: allowed
			? Math.min(
				pvEnergyBudget.permittedDayDischargeEnergyWh,
				safetyEnvelope.availableDischargeEnergyWh,
			)
			: 0,
		maximumDischargePowerW: allowed
			? safetyEnvelope.maximumDischargePowerW
			: 0,
	});
}
import type { StrategyDayDischargeChargeTime } from "./strategyDayDischargeChargeTime";
