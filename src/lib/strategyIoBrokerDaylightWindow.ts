import type {
	StrategyDaylightWindowBoundaries,
	StrategyDaylightWindowProvider,
} from "./strategyDaylightWindowCyclePreparation";

export type StrategyIoBrokerAstroEvent = "sunrise" | "sunset";

export interface StrategyIoBrokerAstroAdapter {
	getAstroDate(
		pattern: StrategyIoBrokerAstroEvent,
		date?: Date,
		offsetMinutes?: number,
	): Date;
}

export function createStrategyIoBrokerDaylightWindowProvider(
	adapter: StrategyIoBrokerAstroAdapter,
): StrategyDaylightWindowProvider {
	return Object.freeze({
		async getDaylightWindow(
			cycleTimestamp: number,
		): Promise<StrategyDaylightWindowBoundaries | null> {
			if (!Number.isFinite(cycleTimestamp)) {
				return null;
			}

			const cycleDate = new Date(cycleTimestamp);
			cycleDate.setHours(12, 0, 0, 0);

			const sunrise = adapter.getAstroDate("sunrise", cycleDate);
			const sunset = adapter.getAstroDate("sunset", cycleDate);
			const startsAt = sunrise.getTime();
			const endsAt = sunset.getTime();

			if (
				!Number.isFinite(startsAt)
				|| !Number.isFinite(endsAt)
				|| startsAt >= endsAt
			) {
				return null;
			}

			return Object.freeze({ startsAt, endsAt });
		},
	});
}
