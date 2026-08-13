export interface StrategyModes {
	readonly chargingControlEnabled: boolean;
	readonly dayAvailabilityEnabled: boolean;
	readonly nightDischargeEnabled: false;
}

export const DEFAULT_STRATEGY_MODES: StrategyModes = Object.freeze({
	chargingControlEnabled: true,
	dayAvailabilityEnabled: true,
	nightDischargeEnabled: false,
});
