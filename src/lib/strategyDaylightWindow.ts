export type StrategyDaylightWindowReason =
	| "before-daylight-window"
	| "within-daylight-window"
	| "after-daylight-window";

export interface StrategyDaylightWindow {
	readonly evaluatedAt: number;
	readonly startsAt: number;
	readonly endsAt: number;
	readonly active: boolean;
	readonly reason: StrategyDaylightWindowReason;
}

export function assessStrategyDaylightWindow(
	evaluatedAt: number,
	startsAt: number,
	endsAt: number,
): StrategyDaylightWindow | null {
	if (
		!Number.isFinite(evaluatedAt)
		|| !Number.isFinite(startsAt)
		|| !Number.isFinite(endsAt)
		|| startsAt >= endsAt
	) {
		return null;
	}

	if (evaluatedAt < startsAt) {
		return Object.freeze({
			evaluatedAt,
			startsAt,
			endsAt,
			active: false,
			reason: "before-daylight-window",
		});
	}

	if (evaluatedAt >= endsAt) {
		return Object.freeze({
			evaluatedAt,
			startsAt,
			endsAt,
			active: false,
			reason: "after-daylight-window",
		});
	}

	return Object.freeze({
		evaluatedAt,
		startsAt,
		endsAt,
		active: true,
		reason: "within-daylight-window",
	});
}
