import type { StrategyInputSnapshot } from "./strategyInputSnapshot";

export interface StrategyPvForecastFreshness {
	readonly createdAt: number;
	readonly lastUpdatedTimestamp: number;
	readonly ageMs: number;
	readonly maximumAgeMs: number;
	readonly fresh: boolean;
}

export function assessStrategyPvForecastFreshness(
	snapshot: StrategyInputSnapshot,
	maximumAgeMs: number,
): StrategyPvForecastFreshness | null {
	const { createdAt } = snapshot;
	const { lastUpdatedTimestamp } = snapshot.pvForecast;

	if (
		!Number.isFinite(createdAt)
		|| !Number.isFinite(lastUpdatedTimestamp)
		|| lastUpdatedTimestamp > createdAt
		|| !Number.isFinite(maximumAgeMs)
		|| maximumAgeMs < 0
	) {
		return null;
	}

	const ageMs = createdAt - lastUpdatedTimestamp;

	return Object.freeze({
		createdAt,
		lastUpdatedTimestamp,
		ageMs,
		maximumAgeMs,
		fresh: ageMs <= maximumAgeMs,
	});
}
