export type StrategyPvPowerSourceMode = "state" | "none";

export interface StrategyHouseholdLearningConfigurationInput {
	readonly enabled: unknown;
	readonly pvPowerSourceMode: unknown;
	readonly pvPowerStateId: unknown;
	readonly pvNominalPowerWp: unknown;
}

export interface StrategyHouseholdLearningConfiguration {
	readonly enabled: boolean;
	readonly pvPowerSourceMode: StrategyPvPowerSourceMode;
	readonly pvPowerStateId: string | null;
	readonly pvNominalPowerWp: number | null;
}

export interface StrategyHouseholdLearningConfigurationIssue {
	readonly field:
		| "enabled"
		| "pvPowerSourceMode"
		| "pvPowerStateId"
		| "pvNominalPowerWp";
	readonly reason: "invalid-boolean" | "invalid-source" | "invalid-state-id" | "invalid-number" | "out-of-range";
}

export type StrategyHouseholdLearningConfigurationValidation =
	| Readonly<{
		readonly valid: true;
		readonly configuration: StrategyHouseholdLearningConfiguration;
		readonly issues: readonly [];
	}>
	| Readonly<{
		readonly valid: false;
		readonly configuration: null;
		readonly issues: readonly StrategyHouseholdLearningConfigurationIssue[];
	}>;

export function validateStrategyHouseholdLearningConfiguration(
	input: StrategyHouseholdLearningConfigurationInput,
): StrategyHouseholdLearningConfigurationValidation {
	const issues: StrategyHouseholdLearningConfigurationIssue[] = [];

	if (typeof input.enabled !== "boolean") {
		issues.push({ field: "enabled", reason: "invalid-boolean" });
	}

	if (input.pvPowerSourceMode !== "state" && input.pvPowerSourceMode !== "none") {
		issues.push({ field: "pvPowerSourceMode", reason: "invalid-source" });
	}

	let pvPowerStateId: string | null = null;
	if (input.pvPowerSourceMode === "state") {
		if (typeof input.pvPowerStateId !== "string" || input.pvPowerStateId.trim().length === 0) {
			issues.push({ field: "pvPowerStateId", reason: "invalid-state-id" });
		} else {
			pvPowerStateId = input.pvPowerStateId.trim();
		}
	}

	let pvNominalPowerWp: number | null = null;
	if (input.pvNominalPowerWp !== undefined && input.pvNominalPowerWp !== null && input.pvNominalPowerWp !== "") {
		if (typeof input.pvNominalPowerWp !== "number" || !Number.isFinite(input.pvNominalPowerWp)) {
			issues.push({ field: "pvNominalPowerWp", reason: "invalid-number" });
		} else if (input.pvNominalPowerWp <= 0) {
			issues.push({ field: "pvNominalPowerWp", reason: "out-of-range" });
		} else {
			pvNominalPowerWp = input.pvNominalPowerWp;
		}
	}

	if (issues.length > 0) {
		return Object.freeze({
			valid: false as const,
			configuration: null,
			issues: Object.freeze(issues),
		});
	}

	return Object.freeze({
		valid: true as const,
		configuration: Object.freeze({
			enabled: input.enabled as boolean,
			pvPowerSourceMode: input.pvPowerSourceMode as StrategyPvPowerSourceMode,
			pvPowerStateId,
			pvNominalPowerWp,
		}),
		issues: Object.freeze([]) as readonly [],
	});
}
