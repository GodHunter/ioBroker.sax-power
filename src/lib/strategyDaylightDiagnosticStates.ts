export const STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS = Object.freeze({
	sunrise: "strategy.daylight.sunrise",
	sunset: "strategy.daylight.sunset",
	isDaylight: "strategy.daylight.isDaylight",
	source: "strategy.daylight.source",
	lastUpdate: "strategy.daylight.lastUpdate",
});

export interface StrategyDaylightDiagnosticAdapter {
	extendObjectAsync(
		stateId: string,
		object: ioBroker.PartialObject,
	): Promise<unknown>;
	setStateAsync(
		stateId: string,
		state: ioBroker.SettableState,
	): Promise<unknown>;
}

export async function ensureStrategyDaylightDiagnosticStates(
	adapter: StrategyDaylightDiagnosticAdapter,
): Promise<void> {
	await adapter.extendObjectAsync("strategy", {
		type: "channel",
		common: { name: "Battery strategy" },
		native: {},
	});
	await adapter.extendObjectAsync("strategy.daylight", {
		type: "channel",
		common: { name: "Daylight diagnostics" },
		native: {},
	});

	const definitions: readonly [string, ioBroker.PartialObject][] = [
		[STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.sunrise, {
			type: "state",
			common: { name: "Sunrise", type: "number", role: "value.time", read: true, write: false },
			native: {},
		}],
		[STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.sunset, {
			type: "state",
			common: { name: "Sunset", type: "number", role: "value.time", read: true, write: false },
			native: {},
		}],
		[STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.isDaylight, {
			type: "state",
			common: { name: "Is daylight", type: "boolean", role: "indicator", read: true, write: false },
			native: {},
		}],
		[STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.source, {
			type: "state",
			common: { name: "Daylight source", type: "string", role: "text", read: true, write: false },
			native: {},
		}],
		[STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.lastUpdate, {
			type: "state",
			common: { name: "Daylight last update", type: "number", role: "value.time", read: true, write: false },
			native: {},
		}],
	];

	for (const [id, object] of definitions) {
		await adapter.extendObjectAsync(id, object);
	}
}

export async function publishStrategyDaylightDiagnostics(
	adapter: StrategyDaylightDiagnosticAdapter,
	createdAt: number,
	window: { readonly startsAt: number; readonly endsAt: number } | null,
): Promise<void> {
	const valid = window !== null;
	const isDaylight = valid
		&& createdAt >= window.startsAt
		&& createdAt < window.endsAt;

	await Promise.all([
		adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.sunrise, {
			val: window?.startsAt ?? 0,
			ack: true,
		}),
		adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.sunset, {
			val: window?.endsAt ?? 0,
			ack: true,
		}),
		adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.isDaylight, {
			val: isDaylight,
			ack: true,
		}),
		adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.source, {
			val: "suncalc-system-config",
			ack: true,
		}),
		adapter.setStateAsync(STRATEGY_DAYLIGHT_DIAGNOSTIC_STATE_IDS.lastUpdate, {
			val: createdAt,
			ack: true,
		}),
	]);
}
