import type { StrategyDaylightWindowCyclePreparation } from "./strategyDaylightWindowCyclePreparation";

export const STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS = Object.freeze({
	allowed: "strategy.dayDischarge.allowed",
	availablePowerW: "strategy.dayDischarge.availablePowerW",
	reason: "strategy.dayDischarge.reason",
	validUntil: "strategy.dayDischarge.validUntil",
});

export interface StrategyDayDischargeAvailabilityAdapter {
	extendObjectAsync(id: string, object: ioBroker.PartialObject): Promise<unknown>;
	setStateAsync(id: string, state: ioBroker.SettableState): Promise<unknown>;
}

export interface StrategyDayDischargeChargingContext {
	readonly reason: string;
	readonly currentSocPercent: number | null;
	readonly plannedSocUpperPercent: number | null;
	readonly forecastMarginWh: number | null;
	readonly requiredAverageChargePowerW: number | null;
	readonly maximumChargePowerW: number;
}

export interface StrategyDayDischargeAvailability {
	readonly createdAt: number;
	readonly allowed: boolean;
	readonly availablePowerW: number;
	readonly reason: string;
	readonly validUntil: number;
}

interface StrategyDayDischargeAvailabilityStateDefinition {
	readonly id: string;
	readonly type: ioBroker.CommonType;
	readonly role: string;
	readonly unit?: string;
	readonly name: string;
	readonly desc: string;
}

const DISCHARGE_OBSERVATION_FACTOR = 0.4;
const DISCHARGE_STOP_FACTOR = 0.5;

function chargingComfortFactor(context: StrategyDayDischargeChargingContext): number {
	const required = context.requiredAverageChargePowerW;
	const maximum = context.maximumChargePowerW;
	if (required === null || !Number.isFinite(required) || !Number.isFinite(maximum) || maximum <= 0) return 0;
	const observeAt = maximum * DISCHARGE_OBSERVATION_FACTOR;
	const stopAt = maximum * DISCHARGE_STOP_FACTOR;
	if (required <= observeAt) return 1;
	if (required >= stopAt) return 0;
	return Math.max(0, Math.min(1, (stopAt - required) / (stopAt - observeAt)));
}

export async function ensureStrategyDayDischargeAvailabilityStates(adapter: StrategyDayDischargeAvailabilityAdapter): Promise<void> {
	await adapter.extendObjectAsync("strategy.dayDischarge", { type: "channel", common: { name: "Day discharge availability" }, native: {} });
	const definitions: readonly StrategyDayDischargeAvailabilityStateDefinition[] = [
		{ id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.allowed, type: "boolean", role: "indicator", name: "Day discharge allowed", desc: "Whether external consumers may currently use battery energy." },
		{ id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.availablePowerW, type: "number", role: "value.power", unit: "W", name: "Available day discharge power", desc: "Maximum battery power currently available to external consumers." },
		{ id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.reason, type: "string", role: "text", name: "Day discharge decision reason", desc: "Machine-readable reason for the current availability decision." },
		{ id: STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.validUntil, type: "number", role: "value.time", unit: "ms", name: "Day discharge availability valid until", desc: "Timestamp at which the current daylight availability expires." },
	];
	for (const definition of definitions) {
		await adapter.extendObjectAsync(definition.id, { type: "state", common: { name: definition.name, desc: definition.desc, type: definition.type, role: definition.role, read: true, write: false, ...(definition.unit === undefined ? {} : { unit: definition.unit }) }, native: {} });
	}
}

export function createStrategyDayDischargeAvailability(preparation: StrategyDaylightWindowCyclePreparation, chargingContext: StrategyDayDischargeChargingContext | null = null): StrategyDayDischargeAvailability {
	const gate = preparation.cyclePreparation.cyclePlan.evaluation.windowGate;
	let availablePowerW = gate.targetDischargePowerW;
	let reason: string = gate.reason === "daylight-window-active" ? gate.decision.permission.reason : gate.reason;

	if (availablePowerW > 0 && chargingContext !== null) {
		const hardBlock = chargingContext.reason === "forecast-insufficient"
			|| chargingContext.reason === "target-deadline-recovery"
			|| chargingContext.reason === "below-minimum-soc"
			|| chargingContext.reason === "inputs-not-ready"
			|| chargingContext.reason === "invalid-input"
			|| chargingContext.reason === "daylight-unavailable"
			|| chargingContext.reason === "outside-daylight";
		if (hardBlock) {
			availablePowerW = 0;
			reason = `charging-${chargingContext.reason}`;
		} else if (chargingContext.forecastMarginWh !== null && chargingContext.forecastMarginWh <= 0) {
			availablePowerW = 0;
			reason = "no-forecast-margin";
		} else if (chargingContext.reason !== "target-soc-reached") {
			const comfortFactor = chargingComfortFactor(chargingContext);
			availablePowerW = Math.round(availablePowerW * comfortFactor);
			if (availablePowerW <= 0) {
				availablePowerW = 0;
				reason = "charging-comfort-reserve";
			} else if (comfortFactor < 1) {
				reason = "charging-comfort-throttled";
			} else if (
				chargingContext.currentSocPercent !== null
				&& chargingContext.plannedSocUpperPercent !== null
				&& chargingContext.currentSocPercent <= chargingContext.plannedSocUpperPercent
			) {
				reason = "trajectory-budget-available";
			}
		}
	}

	return Object.freeze({ createdAt: preparation.createdAt, allowed: availablePowerW > 0, availablePowerW, reason, validUntil: preparation.daylightWindow.endsAt });
}

export async function publishStrategyDayDischargeAvailability(adapter: StrategyDayDischargeAvailabilityAdapter, availability: StrategyDayDischargeAvailability): Promise<void> {
	await Promise.all([
		adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.allowed, { val: availability.allowed, ack: true }),
		adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.availablePowerW, { val: availability.availablePowerW, ack: true }),
		adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.reason, { val: availability.reason, ack: true }),
		adapter.setStateAsync(STRATEGY_DAY_DISCHARGE_AVAILABILITY_STATE_IDS.validUntil, { val: availability.validUntil, ack: true }),
	]);
}
