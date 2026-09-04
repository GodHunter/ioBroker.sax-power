export interface StrategyHouseholdLoadObservationInput {
	readonly pvPowerW: number | null;
	readonly gridPowerW: number;
	readonly batteryPowerW: number;
}

export interface StrategyHouseholdLoadObservation {
	readonly available: boolean;
	readonly householdPowerW: number | null;
	readonly source: "pv-grid-battery" | "unavailable";
}

export function createStrategyHouseholdLoadObservation(
	input: StrategyHouseholdLoadObservationInput,
): StrategyHouseholdLoadObservation {
	if (
		!Number.isFinite(input.gridPowerW)
		|| !Number.isFinite(input.batteryPowerW)
		|| input.pvPowerW === null
		|| !Number.isFinite(input.pvPowerW)
		|| input.pvPowerW < 0
	) {
		return Object.freeze({
			available: false,
			householdPowerW: null,
			source: "unavailable" as const,
		});
	}

	// SAX register 47 convention in the current strategy contract:
	// negative batteryPowerW = charging, positive = discharging.
	// Smart-meter power is interpreted as positive import / negative export.
	// Energy balance: house = PV + grid + battery.
	const householdPowerW = Math.max(
		0,
		Math.round(input.pvPowerW + input.gridPowerW + input.batteryPowerW),
	);

	return Object.freeze({
		available: true,
		householdPowerW,
		source: "pv-grid-battery" as const,
	});
}
