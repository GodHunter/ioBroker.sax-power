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
	readonly plannedSocPercent: number | null;
	readonly plannedSocLowerPercent: number | null;
	readonly plannedSocUpperPercent: number | null;
	readonly forecastMarginWh: number | null;
	readonly requiredAverageChargePowerW: number | null;
	readonly targetChargePowerW: number;
	readonly maximumChargePowerW: number;
	readonly requestedDischargePowerW: number;
	readonly recoveryLatchActive?: boolean;
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

function corridorAvailabilityFactor(context: StrategyDayDischargeChargingContext): number | null {
	const current = context.currentSocPercent;
	const planned = context.plannedSocPercent;
	const lower = context.plannedSocLowerPercent;
	const upper = context.plannedSocUpperPercent;
	if (
		current === null || planned === null || lower === null || upper === null
		|| !Number.isFinite(current) || !Number.isFinite(planned) || !Number.isFinite(lower) || !Number.isFinite(upper)
		|| lower > planned || planned > upper || lower === upper
	) return null;
	if (context.recoveryLatchActive === true && current < planned) return 0;
	if (current <= lower) return 0;
	if (current >= upper) return 1;
	if (current < planned) {
		if (planned === lower) return 0.5;
		return 0.5 * (current - lower) / (planned - lower);
	}
	if (upper === planned) return 1;
	return 0.5 + 0.5 * (current - planned) / (upper - planned);
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

	if (
		availablePowerW <= 0
		&& reason === "insufficient-charge-time"
		&& chargingContext !== null
		&& Number.isFinite(chargingContext.requestedDischargePowerW)
		&& chargingContext.requestedDischargePowerW > 0
	) {
		availablePowerW = Math.round(chargingContext.requestedDischargePowerW);
		reason = "trajectory-budget-reconsidered";
	}

	if (availablePowerW > 0 && chargingContext !== null) {
		const hardBlock = chargingContext.reason === "target-soc-reached"
			|| chargingContext.reason === "target-soc-maintenance"
			|| chargingContext.reason === "below-minimum-soc"
			|| chargingContext.reason === "inputs-not-ready"
			|| chargingContext.reason === "invalid-input"
			|| chargingContext.reason === "daylight-unavailable"
			|| chargingContext.reason === "outside-daylight";
		if (hardBlock) {
			availablePowerW = 0;
			reason = `charging-${chargingContext.reason}`;
		} else {
			const factor = corridorAvailabilityFactor(chargingContext);
			if (factor === null) {
				availablePowerW = 0;
				reason = "trajectory-unavailable";
			} else if (factor <= 0) {
				availablePowerW = 0;
				reason = chargingContext.recoveryLatchActive === true
					&& chargingContext.currentSocPercent !== null
					&& chargingContext.plannedSocPercent !== null
					&& chargingContext.currentSocPercent < chargingContext.plannedSocPercent
					? "trajectory-recovery-latched"
					: "trajectory-below-corridor";
			} else {
				availablePowerW = Math.round(availablePowerW * factor);
				if (factor >= 1) reason = "trajectory-above-corridor";
				else if (chargingContext.currentSocPercent !== null && chargingContext.plannedSocPercent !== null && chargingContext.currentSocPercent < chargingContext.plannedSocPercent) reason = "trajectory-below-plan-throttled";
				else if (chargingContext.currentSocPercent !== null && chargingContext.plannedSocPercent !== null && chargingContext.currentSocPercent === chargingContext.plannedSocPercent) reason = "trajectory-plan-balanced";
				else reason = "trajectory-above-plan-throttled";
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
