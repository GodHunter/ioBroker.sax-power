import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
	type StrategyStateContract,
} from "./strategyIntegrationContract";

export interface StrategyStateReader {
    getForeignObjectAsync(
        id: string,
    ): Promise<ioBroker.Object | null | undefined>;

    getForeignStateAsync(
        id: string,
    ): Promise<ioBroker.State | null | undefined>;
}

export type StrategyStateFailureReason =
    | "object-missing"
    | "state-missing"
    | "value-missing"
    | "invalid-number"
    | "invalid-timestamp"
    | "bad-quality"
    | "not-acknowledged"
    | "stale";

export interface StrategyResolvedState {
    readonly stateId: string;
    readonly contract: StrategyStateContract;
    readonly available: boolean;
    readonly value: number | null;
    readonly reason: StrategyStateFailureReason | null;
}

export interface StrategyStateResolution {
    readonly modbus: {
		readonly dischargePowerCommand: StrategyResolvedState;
        readonly chargePowerCommand: StrategyResolvedState;
        readonly operatingState: StrategyResolvedState;
        readonly stateOfCharge: StrategyResolvedState;
        readonly batteryPower: StrategyResolvedState;
        readonly smartMeterPower: StrategyResolvedState;
    };
    readonly pvForecast: {
        readonly energyNowUntilEndOfDay: StrategyResolvedState;
        readonly energyToday: StrategyResolvedState;
        readonly energyTomorrow: StrategyResolvedState;
        readonly lastUpdated: StrategyResolvedState;
    };
    readonly modbusReady: boolean;
    readonly pvForecastReady: boolean;
    readonly strategyInputsReady: boolean;
    readonly unavailableStateIds: readonly string[];
}

export interface StrategyStateResolverOptions {
    readonly now?: number;
    readonly maximumStateAgeMs?: number;
    readonly maximumTimestampAgeMs?: number;
}

const DEFAULT_MAXIMUM_STATE_AGE_MS = 15 * 60 * 1000;
const DEFAULT_MAXIMUM_TIMESTAMP_AGE_MS = 60 * 60 * 1000;

function unavailable(
	contract: StrategyStateContract,
	reason: StrategyStateFailureReason,
): StrategyResolvedState {
	return {
		stateId: contract.stateId,
		contract,
		available: false,
		value: null,
		reason,
	};
}

function available(
	contract: StrategyStateContract,
	value: number | null,
): StrategyResolvedState {
	return {
		stateId: contract.stateId,
		contract,
		available: true,
		value,
		reason: null,
	};
}

function parseTimestamp(value: ioBroker.StateValue): number | null {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value !== "string" || value.trim() === "") {
		return null;
	}

	const numericValue = Number(value);

	if (Number.isFinite(numericValue)) {
		return numericValue;
	}

	const parsedValue = Date.parse(value);

	return Number.isFinite(parsedValue) ? parsedValue : null;
}

function isStale(
	timestamp: number | undefined,
	now: number,
	maximumAgeMs: number,
): boolean {
	return (
		typeof timestamp !== "number"
        || !Number.isFinite(timestamp)
        || timestamp > now
        || now - timestamp > maximumAgeMs
	);
}

async function resolveState(
	reader: StrategyStateReader,
	contract: StrategyStateContract,
	now: number,
	maximumStateAgeMs: number,
	maximumTimestampAgeMs: number,
): Promise<StrategyResolvedState> {
	const object = await reader.getForeignObjectAsync(contract.stateId);

	if (!object) {
		return unavailable(contract, "object-missing");
	}

	if (contract.access === "command") {
		return available(contract, null);
	}

	const state = await reader.getForeignStateAsync(contract.stateId);

	if (!state) {
		return unavailable(contract, "state-missing");
	}

	if (state.val === null || state.val === undefined) {
		return unavailable(contract, "value-missing");
	}

	if (state.q !== undefined && state.q !== 0) {
		return unavailable(contract, "bad-quality");
	}

	if (state.ack !== true) {
		return unavailable(contract, "not-acknowledged");
	}

	if (isStale(state.ts, now, maximumStateAgeMs)) {
		return unavailable(contract, "stale");
	}

	if (contract.unit === "timestamp") {
		const timestamp = parseTimestamp(state.val);

		if (timestamp === null) {
			return unavailable(contract, "invalid-timestamp");
		}

		if (isStale(timestamp, now, maximumTimestampAgeMs)) {
			return unavailable(contract, "stale");
		}

		return available(contract, timestamp);
	}

	if (typeof state.val !== "number" || !Number.isFinite(state.val)) {
		return unavailable(contract, "invalid-number");
	}

	return available(contract, state.val);
}

export async function resolveStrategyStates(
	reader: StrategyStateReader,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	options: StrategyStateResolverOptions = {},
): Promise<StrategyStateResolution> {
	const now = options.now ?? Date.now();
	const maximumStateAgeMs =
        options.maximumStateAgeMs ?? DEFAULT_MAXIMUM_STATE_AGE_MS;
	const maximumTimestampAgeMs =
        options.maximumTimestampAgeMs ?? DEFAULT_MAXIMUM_TIMESTAMP_AGE_MS;

	const resolve = (
		stateContract: StrategyStateContract,
	): Promise<StrategyResolvedState> =>
		resolveState(
			reader,
			stateContract,
			now,
			maximumStateAgeMs,
			maximumTimestampAgeMs,
		);

	const [
		dischargePowerCommand,
		chargePowerCommand,
		operatingState,
		stateOfCharge,
		batteryPower,
		smartMeterPower,
		energyNowUntilEndOfDay,
		energyToday,
		energyTomorrow,
		lastUpdated,
	] = await Promise.all([
		resolve(contract.modbus.dischargePowerCommand),
		resolve(contract.modbus.chargePowerCommand),
		resolve(contract.modbus.operatingState),
		resolve(contract.modbus.stateOfCharge),
		resolve(contract.modbus.batteryPower),
		resolve(contract.modbus.smartMeterPower),
		resolve(contract.pvForecast.energyNowUntilEndOfDay),
		resolve(contract.pvForecast.energyToday),
		resolve(contract.pvForecast.energyTomorrow),
		resolve(contract.pvForecast.lastUpdated),
	]);

	const modbus = {
		dischargePowerCommand,
		chargePowerCommand,
		operatingState,
		stateOfCharge,
		batteryPower,
		smartMeterPower,
	};

	const pvForecast = {
		energyNowUntilEndOfDay,
		energyToday,
		energyTomorrow,
		lastUpdated,
	};

	const requiredStates = [
		...Object.values(modbus),
		...Object.values(pvForecast),
	];

	const modbusReady = Object.values(modbus).every(
		({ available: stateAvailable }) => stateAvailable,
	);
	const pvForecastReady = Object.values(pvForecast).every(
		({ available: stateAvailable }) => stateAvailable,
	);

	return {
		modbus,
		pvForecast,
		modbusReady,
		pvForecastReady,
		strategyInputsReady: modbusReady && pvForecastReady,
		unavailableStateIds: requiredStates
			.filter(({ available: stateAvailable }) => !stateAvailable)
			.map(({ stateId }) => stateId),
	};
}
