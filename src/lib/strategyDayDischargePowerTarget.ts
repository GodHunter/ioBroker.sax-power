import type {
	StrategyDayDischargePermission,
} from "./strategyDayDischargePermission";

export interface StrategyDayDischargePowerTarget {
	readonly createdAt: number;
	readonly requestedDischargePowerW: number;
	readonly targetDischargePowerW: number;
	readonly limited: boolean;
}

export function createStrategyDayDischargePowerTarget(
	permission: StrategyDayDischargePermission,
	requestedDischargePowerW: number,
): StrategyDayDischargePowerTarget | null {
	if (
		!Number.isFinite(permission.createdAt)
		|| !Number.isFinite(requestedDischargePowerW)
		|| requestedDischargePowerW < 0
		|| !Number.isFinite(permission.permittedDischargeEnergyWh)
		|| permission.permittedDischargeEnergyWh < 0
		|| !Number.isFinite(permission.maximumDischargePowerW)
		|| permission.maximumDischargePowerW < 0
		|| (permission.allowed
			&& (permission.permittedDischargeEnergyWh === 0
				|| permission.maximumDischargePowerW === 0))
		|| (!permission.allowed
			&& (permission.permittedDischargeEnergyWh !== 0
				|| permission.maximumDischargePowerW !== 0))
	) {
		return null;
	}

	const targetDischargePowerW = permission.allowed
		? Math.min(requestedDischargePowerW, permission.maximumDischargePowerW)
		: 0;

	return Object.freeze({
		createdAt: permission.createdAt,
		requestedDischargePowerW,
		targetDischargePowerW,
		limited: targetDischargePowerW !== requestedDischargePowerW,
	});
}
