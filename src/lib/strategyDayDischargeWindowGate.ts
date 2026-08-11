import type {
	StrategyDayDischargeDecision,
} from "./strategyDayDischargeDecision";
import type { StrategyDaylightWindow } from "./strategyDaylightWindow";

export type StrategyDayDischargeWindowGateReason =
	| "daylight-window-active"
	| "before-daylight-window"
	| "after-daylight-window";

export interface StrategyDayDischargeWindowGate {
	readonly createdAt: number;
	readonly daylightWindow: StrategyDaylightWindow;
	readonly decision: StrategyDayDischargeDecision;
	readonly targetDischargePowerW: number;
	readonly limitedByDaylightWindow: boolean;
	readonly reason: StrategyDayDischargeWindowGateReason;
}

export function applyStrategyDayDischargeWindowGate(
	decision: StrategyDayDischargeDecision,
	daylightWindow: StrategyDaylightWindow,
): StrategyDayDischargeWindowGate | null {
	const decisionTargetW = decision.powerTarget.targetDischargePowerW;

	if (
		!Number.isFinite(decision.createdAt)
		|| !Number.isFinite(decisionTargetW)
		|| decisionTargetW < 0
		|| !Number.isFinite(daylightWindow.evaluatedAt)
		|| !Number.isFinite(daylightWindow.startsAt)
		|| !Number.isFinite(daylightWindow.endsAt)
		|| daylightWindow.startsAt >= daylightWindow.endsAt
		|| daylightWindow.evaluatedAt !== decision.createdAt
		|| daylightWindow.active !== (
			daylightWindow.evaluatedAt >= daylightWindow.startsAt
			&& daylightWindow.evaluatedAt < daylightWindow.endsAt
		)
		|| (daylightWindow.active
			&& daylightWindow.reason !== "within-daylight-window")
		|| (!daylightWindow.active
			&& daylightWindow.evaluatedAt < daylightWindow.startsAt
			&& daylightWindow.reason !== "before-daylight-window")
		|| (!daylightWindow.active
			&& daylightWindow.evaluatedAt >= daylightWindow.endsAt
			&& daylightWindow.reason !== "after-daylight-window")
	) {
		return null;
	}

	const targetDischargePowerW = daylightWindow.active
		? decisionTargetW
		: 0;
	const reason: StrategyDayDischargeWindowGateReason = daylightWindow.active
		? "daylight-window-active"
		: daylightWindow.evaluatedAt < daylightWindow.startsAt
			? "before-daylight-window"
			: "after-daylight-window";

	return Object.freeze({
		createdAt: decision.createdAt,
		daylightWindow,
		decision,
		targetDischargePowerW,
		limitedByDaylightWindow: targetDischargePowerW !== decisionTargetW,
		reason,
	});
}
