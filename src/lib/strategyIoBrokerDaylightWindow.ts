import * as SunCalc from "suncalc";

import type {
	StrategyDaylightWindowBoundaries,
	StrategyDaylightWindowProvider,
} from "./strategyDaylightWindowCyclePreparation";

export interface StrategyIoBrokerDaylightAdapter {
	getForeignObjectAsync(
		objectId: string,
	): Promise<ioBroker.Object | null | undefined>;
}

interface StrategyGeoCoordinates {
	readonly latitude: number;
	readonly longitude: number;
}

function parseCoordinate(value: unknown): number | null {
	const parsed = typeof value === "number"
		? value
		: typeof value === "string"
			? Number(value)
			: Number.NaN;

	return Number.isFinite(parsed) ? parsed : null;
}

async function resolveSystemCoordinates(
	adapter: StrategyIoBrokerDaylightAdapter,
): Promise<StrategyGeoCoordinates | null> {
	const systemConfig = await adapter.getForeignObjectAsync("system.config");
	if (systemConfig == null || systemConfig.type !== "config") return null;

	const common = systemConfig.common as unknown as Record<string, unknown>;
	const latitude = parseCoordinate(common.latitude);
	const longitude = parseCoordinate(common.longitude);

	if (
		latitude === null
		|| longitude === null
		|| latitude < -90
		|| latitude > 90
		|| longitude < -180
		|| longitude > 180
	) {
		return null;
	}

	return Object.freeze({ latitude, longitude });
}

export function createStrategyIoBrokerDaylightWindowProvider(
	adapter: StrategyIoBrokerDaylightAdapter,
): StrategyDaylightWindowProvider {
	return Object.freeze({
		async getDaylightWindow(
			cycleTimestamp: number,
		): Promise<StrategyDaylightWindowBoundaries | null> {
			if (!Number.isFinite(cycleTimestamp)) return null;

			const coordinates = await resolveSystemCoordinates(adapter);
			if (coordinates === null) return null;

			const cycleDate = new Date(cycleTimestamp);
			const times = SunCalc.getTimes(
				cycleDate,
				coordinates.latitude,
				coordinates.longitude,
			);
			const startsAt = times.sunrise.getTime();
			const endsAt = times.sunset.getTime();

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
