import {
	type StrategyConfiguration,
	type StrategyConfigurationField,
	type StrategyConfigurationInput,
	type StrategyConfigurationIssue,
	validateStrategyConfiguration,
} from "./strategyConfiguration";
import {
	type StrategyHouseholdLearningConfiguration,
	validateStrategyHouseholdLearningConfiguration,
} from "./strategyHouseholdLearningConfiguration";
import type { StrategyModes } from "./strategyModes";

export interface StrategyRuntimeConfigurationInput
	extends StrategyConfigurationInput {
	readonly enabled: unknown;
	readonly modbusInstance: unknown;
	readonly pvForecastInstance: unknown;
	readonly maximumForecastAgeMs: unknown;
	readonly requestedDischargePowerW: unknown;
	readonly intervalMs: unknown;
	readonly chargingControlEnabled: unknown;
	readonly dayAvailabilityEnabled: unknown;
	readonly nightDischargeEnabled: unknown;
	readonly householdLearningEnabled: unknown;
	readonly pvPowerSourceMode: unknown;
	readonly pvPowerStateId: unknown;
	readonly pvNominalPowerWp: unknown;
}

export type StrategyRuntimeConfiguration =
	| Readonly<{ enabled: false }>
	| Readonly<{
		enabled: true;
		configuration: StrategyConfiguration;
		modbusInstance: string;
		pvForecastInstance: string;
		maximumForecastAgeMs: number;
		requestedDischargePowerW: number;
		intervalMs: number;
		modes: StrategyModes;
		householdLearning: StrategyHouseholdLearningConfiguration;
	}>;

export type StrategyRuntimeConfigurationField =
	| "enabled"
	| "modbusInstance"
	| "pvForecastInstance"
	| StrategyConfigurationField
	| "maximumForecastAgeMs"
	| "requestedDischargePowerW"
	| "intervalMs"
	| "chargingControlEnabled"
	| "dayAvailabilityEnabled"
	| "nightDischargeEnabled"
	| "householdLearningEnabled"
	| "pvPowerSourceMode"
	| "pvPowerStateId"
	| "pvNominalPowerWp";

export interface StrategyRuntimeConfigurationIssue {
	readonly field: StrategyRuntimeConfigurationField;
	readonly reason: StrategyConfigurationIssue["reason"]
		| "invalid-boolean"
		| "invalid-instance"
		| "invalid-source"
		| "invalid-state-id"
		| "unsupported-mode"
		| "no-mode-enabled";
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
	const householdLearningValidation = validateStrategyHouseholdLearningConfiguration({
		enabled: input.householdLearningEnabled,
		pvPowerSourceMode: input.pvPowerSourceMode,
		pvPowerStateId: input.pvPowerStateId,
		pvNominalPowerWp: input.pvNominalPowerWp,
	});
	const issues: StrategyRuntimeConfigurationIssue[] = [
		...strategyValidation.issues,
		...householdLearningValidation.issues.map(issue => ({
			field: issue.field === "enabled" ? "householdLearningEnabled" as const : issue.field,
			reason: issue.reason,
		})),
	];

	if (
		typeof input.modbusInstance !== "string"
		|| !/^modbus\.\d+$/.test(input.modbusInstance)
	) {
		issues.push({ field: "modbusInstance", reason: "invalid-instance" });
	}
	if (
		typeof input.pvForecastInstance !== "string"
		|| !/^pvforecast\.\d+$/.test(input.pvForecastInstance)
	) {
		issues.push({
			field: "pvForecastInstance",
			reason: "invalid-instance",
		});
	}

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

	for (const field of [
		"chargingControlEnabled",
		"dayAvailabilityEnabled",
		"nightDischargeEnabled",
	] as const) {
		if (typeof input[field] !== "boolean") {
			issues.push({ field, reason: "invalid-boolean" });
		}
	}
	if (input.nightDischargeEnabled === true) {
		issues.push({ field: "nightDischargeEnabled", reason: "unsupported-mode" });
	}
	if (
		input.chargingControlEnabled === false
		&& input.dayAvailabilityEnabled === false
		&& input.nightDischargeEnabled === false
	) {
		issues.push({ field: "enabled", reason: "no-mode-enabled" });
	}

	if (
		!strategyValidation.valid
		|| !householdLearningValidation.valid
		|| issues.length > 0
	) return invalid(issues);

	return Object.freeze({
		valid: true as const,
		configuration: Object.freeze({
			enabled: true as const,
			configuration: strategyValidation.configuration,
			modbusInstance: input.modbusInstance as string,
			pvForecastInstance: input.pvForecastInstance as string,
			maximumForecastAgeMs: input.maximumForecastAgeMs as number,
			requestedDischargePowerW: input.requestedDischargePowerW as number,
			intervalMs: input.intervalMs as number,
			modes: Object.freeze({
				chargingControlEnabled: input.chargingControlEnabled as boolean,
				dayAvailabilityEnabled: input.dayAvailabilityEnabled as boolean,
				nightDischargeEnabled: false as const,
			}),
			householdLearning: householdLearningValidation.configuration,
		}),
		issues: Object.freeze([]) as readonly [],
	});
}
