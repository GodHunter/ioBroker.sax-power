import {
	getBatteryModel,
	type SaxPowerBatteryModelId,
} from "./batteryAnalysis";
import { resolveStrategyBatteryTechnicalLimits } from "./strategyBatteryChargeCapability";

export interface StrategyConfigurationInput {
	readonly batteryModelId: unknown;
	readonly minimumStateOfChargePercent: unknown;
	readonly maximumStateOfChargePercent: unknown;
	readonly maximumChargePowerW: unknown;
	readonly maximumDischargePowerW: unknown;
	readonly pvForecastReserveWh: unknown;
}

export interface StrategyConfiguration {
	readonly batteryModelId: SaxPowerBatteryModelId;
	readonly minimumStateOfChargePercent: number;
	readonly maximumStateOfChargePercent: number;
	readonly maximumChargePowerW: number;
	readonly maximumDischargePowerW: number;
	readonly pvForecastReserveWh: number;
}

export type StrategyConfigurationField = keyof StrategyConfiguration;

export interface StrategyConfigurationIssue {
	readonly field: StrategyConfigurationField;
	readonly reason:
		| "invalid-model"
		| "invalid-number"
		| "out-of-range"
		| "exceeds-model-limit"
		| "invalid-order";
}

export type StrategyConfigurationValidation =
	| {
		readonly valid: true;
		readonly configuration: StrategyConfiguration;
		readonly issues: readonly [];
	}
	| {
		readonly valid: false;
		readonly configuration: null;
		readonly issues: readonly StrategyConfigurationIssue[];
	};

interface NumericConstraint {
	readonly minimum: number;
	readonly maximum?: number;
}

type StrategyNumericConfigurationField = Exclude<
	StrategyConfigurationField,
	"batteryModelId"
>;

const NUMERIC_CONSTRAINTS: Readonly<
	Record<StrategyNumericConfigurationField, NumericConstraint>
> = {
	minimumStateOfChargePercent: { minimum: 0, maximum: 100 },
	maximumStateOfChargePercent: { minimum: 0, maximum: 100 },
	maximumChargePowerW: { minimum: 0 },
	maximumDischargePowerW: { minimum: 0 },
	pvForecastReserveWh: { minimum: 0 },
};

function validateNumber(
	field: StrategyNumericConfigurationField,
	value: unknown,
): StrategyConfigurationIssue | null {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return { field, reason: "invalid-number" };
	}

	const constraint = NUMERIC_CONSTRAINTS[field];

	if (
		value < constraint.minimum
		|| (
			constraint.maximum !== undefined
			&& value > constraint.maximum
		)
	) {
		return { field, reason: "out-of-range" };
	}

	return null;
}

export function validateStrategyConfiguration(
	input: StrategyConfigurationInput,
): StrategyConfigurationValidation {
	const fields = Object.keys(NUMERIC_CONSTRAINTS) as StrategyNumericConfigurationField[];
	const issues: StrategyConfigurationIssue[] = fields
		.map(field => validateNumber(field, input[field]))
		.filter((issue): issue is StrategyConfigurationIssue => issue !== null);

	if (
		input.batteryModelId !== "home-5.8"
		&& input.batteryModelId !== "home-plus-7.7"
	) {
		issues.unshift({ field: "batteryModelId", reason: "invalid-model" });
	}

	const batteryModel = typeof input.batteryModelId === "string"
		? getBatteryModel(input.batteryModelId)
		: null;
	const technicalLimits = batteryModel === null
		? null
		: resolveStrategyBatteryTechnicalLimits(batteryModel);

	if (technicalLimits !== null) {
		if (
			typeof input.maximumChargePowerW === "number"
			&& Number.isFinite(input.maximumChargePowerW)
			&& input.maximumChargePowerW > technicalLimits.maximumChargePowerW
		) {
			issues.push({
				field: "maximumChargePowerW",
				reason: "exceeds-model-limit",
			});
		}
		if (
			typeof input.maximumDischargePowerW === "number"
			&& Number.isFinite(input.maximumDischargePowerW)
			&& input.maximumDischargePowerW
				> technicalLimits.maximumDischargePowerW
		) {
			issues.push({
				field: "maximumDischargePowerW",
				reason: "exceeds-model-limit",
			});
		}
	}

	if (
		issues.length === 0
		&& (input.minimumStateOfChargePercent as number)
			>= (input.maximumStateOfChargePercent as number)
	) {
		issues.push({
			field: "maximumStateOfChargePercent",
			reason: "invalid-order",
		});
	}

	if (issues.length > 0) {
		return Object.freeze({
			valid: false,
			configuration: null,
			issues: Object.freeze(issues),
		});
	}

	return Object.freeze({
		valid: true,
		configuration: Object.freeze({
			batteryModelId: input.batteryModelId as SaxPowerBatteryModelId,
			minimumStateOfChargePercent:
				input.minimumStateOfChargePercent as number,
			maximumStateOfChargePercent:
				input.maximumStateOfChargePercent as number,
			maximumChargePowerW: input.maximumChargePowerW as number,
			maximumDischargePowerW: input.maximumDischargePowerW as number,
			pvForecastReserveWh: input.pvForecastReserveWh as number,
		}),
		issues: Object.freeze([]) as readonly [],
	});
}
