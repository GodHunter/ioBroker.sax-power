import {
	StrategyPvForecastErrorModel,
	type StrategyPvForecastErrorModelSnapshot,
} from "./strategyPvForecastErrorLearning";
import {
	STRATEGY_PV_FORECAST_ERROR_STATE_IDS,
	publishStrategyPvForecastError,
	type StrategyPvForecastErrorIoBrokerAdapter,
} from "./strategyPvForecastErrorStates";

const MAXIMUM_PV_INPUT_AGE_MS = 120_000;

export interface StrategyIoBrokerPvForecastErrorAdapter extends StrategyPvForecastErrorIoBrokerAdapter {
	getForeignStateAsync(stateId: string): Promise<ioBroker.State | null | undefined>;
	getStateAsync(stateId: string): Promise<ioBroker.State | null | undefined>;
}

export interface StrategyIoBrokerPvForecastErrorConfiguration {
	readonly enabled: boolean;
	readonly pvPowerStateId: string | null;
	readonly forecastTodayStateId: string;
}

export interface StrategyIoBrokerPvForecastErrorCycle {
	readonly runOnce: (nowMs: number, daylightStartsAt: number, daylightEndsAt: number) => Promise<void>;
}

function numericFreshValue(state: ioBroker.State | null | undefined, nowMs: number): number | null {
	if (state == null || typeof state.val !== "number" || !Number.isFinite(state.val)) return null;
	if (state.q !== undefined && state.q !== 0) return null;
	if (state.ack !== true) return null;
	if (!Number.isFinite(state.ts) || nowMs - state.ts > MAXIMUM_PV_INPUT_AGE_MS) return null;
	return state.val;
}

function numericValue(state: ioBroker.State | null | undefined): number | null {
	if (state == null || typeof state.val !== "number" || !Number.isFinite(state.val)) return null;
	if (state.q !== undefined && state.q !== 0) return null;
	if (state.ack !== true) return null;
	return state.val;
}

function parseSnapshot(value: unknown): StrategyPvForecastErrorModelSnapshot | null {
	if (typeof value !== "string" || value.trim().length === 0) return null;
	try {
		const parsed = JSON.parse(value) as Partial<StrategyPvForecastErrorModelSnapshot>;
		if (parsed.version !== 1 || !Array.isArray(parsed.samples)) return null;
		return parsed as StrategyPvForecastErrorModelSnapshot;
	} catch {
		return null;
	}
}

export function createStrategyIoBrokerPvForecastErrorCycle(
	adapter: StrategyIoBrokerPvForecastErrorAdapter,
	configuration: StrategyIoBrokerPvForecastErrorConfiguration,
): StrategyIoBrokerPvForecastErrorCycle {
	let model: StrategyPvForecastErrorModel | null = null;

	async function loadModel(): Promise<StrategyPvForecastErrorModel> {
		if (model !== null) return model;
		const state = await adapter.getStateAsync(STRATEGY_PV_FORECAST_ERROR_STATE_IDS.modelSnapshot);
		model = new StrategyPvForecastErrorModel(parseSnapshot(state?.val));
		return model;
	}

	return Object.freeze({
		runOnce: async (nowMs: number, daylightStartsAt: number, daylightEndsAt: number): Promise<void> => {
			if (!configuration.enabled || configuration.pvPowerStateId === null) return;
			const activeModel = await loadModel();
			const [pvState, forecastState] = await Promise.all([
				adapter.getForeignStateAsync(configuration.pvPowerStateId),
				adapter.getForeignStateAsync(configuration.forecastTodayStateId),
			]);
			const pvPowerW = numericFreshValue(pvState, nowMs);
			const forecastTodayWh = numericValue(forecastState);
			if (pvPowerW !== null && forecastTodayWh !== null) {
				activeModel.observe({
					nowMs,
					pvPowerW,
					forecastTodayWh,
					daylightStartsAt,
					daylightEndsAt,
				});
			}
			activeModel.finalizeIfPastDaylight(nowMs);
			const status = activeModel.status();
			await publishStrategyPvForecastError(adapter, {
				...status,
				lastUpdate: nowMs,
				modelSnapshot: JSON.stringify(activeModel.snapshot()),
			});
		},
	});
}
