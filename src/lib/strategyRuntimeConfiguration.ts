import {
	type StrategyConfiguration,
	type StrategyConfigurationField,
	type StrategyConfigurationInput,
	type StrategyConfigurationIssue,
	validateStrategyConfiguration,
} from "./strategyConfiguration";

export interface StrategyRuntimeConfigurationInput
	extends StrategyConfigurationInput {
	readonly enabled: unknown;
	readonly maximumForecastAgeMs: unknown;
	readonly requestedDischargePowerW: unknown;
	readonly intervalMs: unknown;
}

export type StrategyRuntimeConfiguration =
	| Readonly<{ enabled: false }>
	| Readonly<{
		enabled: true;
		configuration: StrategyConfiguration;
		maximumForecastAgeMs: number;
		requestedDischargePowerW: number;
		intervalMs: number;
	}>;

export type StrategyRuntimeConfigurationField =
	| "enabled"
	| StrategyConfigurationField
	| "maximumForecastAgeMs"
	| "requestedDischargePowerW"
	| "intervalMs";

export interface StrategyRuntimeConfigurationIssue {
	readonly field: StrategyRuntimeConfigurationField;
	readonly reason: StrategyConfigurationIssue["reason"] | "invalid-boolean";
}

export type StrategyRuntimeConfigurationValidation =
	| Readonly<{
		valid: true;
		configuration: StrategyRuntimeConfiguration;
		issues: readonly [];
	}>
	| Readonly<{
		valid: false;
		configuration: null;
		issues: readonly StrategyRuntimeConfigurationIssue[];
	}>;

function invalid(
	issues: readonly StrategyRuntimeConfigurationIssue[],
): StrategyRuntimeConfigurationValidation {
	return Object.freeze({
		valid: false as const,
		configuration: null,
		issues: Object.freeze([...issues]),
	});
}

export function validateStrategyRuntimeConfiguration(
	input: StrategyRuntimeConfigurationInput,
): StrategyRuntimeConfigurationValidation {
	if (typeof input.enabled !== "boolean") {
		return invalid([{ field: "enabled", reason: "invalid-boolean" }]);
	}

	if (!input.enabled) {
		return Object.freeze({
			valid: true as const,
			configuration: Object.freeze({ enabled: false as const }),
			issues: Object.freeze([]) as readonly [],
		});
	}

	const strategyValidation = validateStrategyConfiguration(input);
	const issues: StrategyRuntimeConfigurationIssue[] = [
		...strategyValidation.issues,
	];

	for (const field of [
		"maximumForecastAgeMs",
		"requestedDischargePowerW",
		"intervalMs",
	] as const) {
		const value = input[field];
		if (typeof value !== "number" || !Number.isFinite(value)) {
			issues.push({ field, reason: "invalid-number" });
		} else if (
			value < 0
			|| (field === "intervalMs" && value === 0)
		) {
			issues.push({ field, reason: "out-of-range" });
		}
	}

	if (!strategyValidation.valid || issues.length > 0) return invalid(issues);

	return Object.freeze({
		valid: true as const,
		configuration: Object.freeze({
			enabled: true as const,
			configuration: strategyValidation.configuration,
			maximumForecastAgeMs: input.maximumForecastAgeMs as number,
			requestedDischargePowerW: input.requestedDischargePowerW as number,
			intervalMs: input.intervalMs as number,
		}),
		issues: Object.freeze([]) as readonly [],
	});
}
