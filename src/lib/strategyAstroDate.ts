import SunCalc from "suncalc";

import type {
	StrategyIoBrokerAstroEvent,
} from "./strategyIoBrokerDaylightWindow";

function invalidDate(): Date {
	return new Date(Number.NaN);
}

export function resolveStrategyAstroDate(
	event: StrategyIoBrokerAstroEvent,
	date: Date,
	latitude: unknown,
	longitude: unknown,
	offsetMinutes = 0,
): Date {
	if (
		!Number.isFinite(date.getTime())
		|| typeof latitude !== "number"
		|| !Number.isFinite(latitude)
		|| latitude < -90
		|| latitude > 90
		|| typeof longitude !== "number"
		|| !Number.isFinite(longitude)
		|| longitude < -180
		|| longitude > 180
		|| !Number.isFinite(offsetMinutes)
	) {
		return invalidDate();
	}

	const times = SunCalc.getTimes(date, latitude, longitude);
	const result = times[event];
	if (result === null) return invalidDate();
	const timestamp = result.getTime() + offsetMinutes * 60_000;

	return Number.isFinite(timestamp) ? new Date(timestamp) : invalidDate();
}
