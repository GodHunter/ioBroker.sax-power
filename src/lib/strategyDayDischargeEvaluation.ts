import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	createStrategyDayDischargeDecision,
	type StrategyDayDischargeDecision,
} from "./strategyDayDischargeDecision";
import {
	applyStrategyDayDischargeWindowGate,
	type StrategyDayDischargeWindowGate,
} from "./strategyDayDischargeWindowGate";
import {
	assessStrategyDaylightWindow,
	type StrategyDaylightWindow,
} from "./strategyDaylightWindow";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";

export interface StrategyDayDischargeEvaluation {
	readonly createdAt: number;
	readonly decision: StrategyDayDischargeDecision;
	readonly daylightWindow: StrategyDaylightWindow;
	readonly windowGate: StrategyDayDischargeWindowGate;
}

export function createStrategyDayDischargeEvaluation(
	snapshot: StrategyInputSnapshot,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	daylightWindowStartsAt: number,
	daylightWindowEndsAt: number,
): StrategyDayDischargeEvaluation | null {
	const decision = createStrategyDayDischargeDecision(
		snapshot,
		configuration,
		maximumForecastAgeMs,
		requestedDischargePowerW,
	);
	if (decision === null) {
		return null;
	}

	const daylightWindow = assessStrategyDaylightWindow(
		snapshot.createdAt,
		daylightWindowStartsAt,
		daylightWindowEndsAt,
	);
	if (daylightWindow === null) {
		return null;
	}

	const windowGate = applyStrategyDayDischargeWindowGate(
		decision,
		daylightWindow,
	);
	if (windowGate === null) {
		return null;
	}

	return Object.freeze({
		createdAt: snapshot.createdAt,
		decision,
		daylightWindow,
		windowGate,
	});
}
