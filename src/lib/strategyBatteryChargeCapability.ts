import type {
	SaxPowerBatteryModel,
	SaxPowerBatteryModelId,
} from "./batteryAnalysis";

export type StrategyBatterySpecificationSource =
	| "manufacturer-specification"
	| "provisional-influx-estimate";

export interface StrategyBatteryTechnicalLimits {
	readonly batteryModelId: SaxPowerBatteryModelId;
	readonly usableCapacityWh: number;
	readonly maximumChargePowerW: number;
	readonly maximumDischargePowerW: number;
	readonly source: "manufacturer-specification";
}

export interface StrategyChargePowerSegment {
	readonly minimumStateOfChargePercent: number;
	readonly maximumStateOfChargePercent: number;
	readonly estimatedMaximumChargePowerW: number;
	readonly source: StrategyBatterySpecificationSource;
}

export interface StrategyChargeDurationSegment {
	readonly minimumStateOfChargePercent: number;
	readonly maximumStateOfChargePercent: number;
	readonly energyWh: number;
	readonly effectiveChargePowerW: number;
	readonly durationSeconds: number;
	readonly powerSource: StrategyBatterySpecificationSource;
}

export interface StrategyChargeDurationEstimate {
	readonly batteryModelId: SaxPowerBatteryModelId;
	readonly requiredChargeEnergyWh: number;
	readonly estimatedDurationSeconds: number;
	readonly segments: readonly StrategyChargeDurationSegment[];
	readonly provisional: boolean;
}

const TECHNICAL_LIMITS: Readonly<
	Record<
		SaxPowerBatteryModelId,
		Omit<StrategyBatteryTechnicalLimits, "batteryModelId" | "usableCapacityWh">
	>
> = Object.freeze({
	"home-5.8": Object.freeze({
		maximumChargePowerW: 2_500,
		maximumDischargePowerW: 4_600,
		source: "manufacturer-specification",
	}),
	"home-plus-7.7": Object.freeze({
		maximumChargePowerW: 3_500,
		maximumDischargePowerW: 4_600,
		source: "manufacturer-specification",
	}),
});

/*
 * Provisional SAX charge taper derived from the ioBroker/Influx observations
 * made between 7 and 12 August 2026. It is intentionally kept separate from
 * manufacturer specifications and must be replaced or refined when the
 * explicitly logged charge-limit data provides a qualified measurement set.
 */
export const PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS: readonly StrategyChargePowerSegment[] =
	Object.freeze([
		Object.freeze({
			minimumStateOfChargePercent: 0,
			maximumStateOfChargePercent: 93,
			estimatedMaximumChargePowerW: Number.POSITIVE_INFINITY,
			source: "manufacturer-specification" as const,
		}),
		Object.freeze({
			minimumStateOfChargePercent: 93,
			maximumStateOfChargePercent: 94,
			estimatedMaximumChargePowerW: 1_800,
			source: "provisional-influx-estimate" as const,
		}),
		Object.freeze({
			minimumStateOfChargePercent: 94,
			maximumStateOfChargePercent: 95,
			estimatedMaximumChargePowerW: 1_500,
			source: "provisional-influx-estimate" as const,
		}),
		Object.freeze({
			minimumStateOfChargePercent: 95,
			maximumStateOfChargePercent: 96,
			estimatedMaximumChargePowerW: 1_200,
			source: "provisional-influx-estimate" as const,
		}),
		Object.freeze({
			minimumStateOfChargePercent: 96,
			maximumStateOfChargePercent: 97,
			estimatedMaximumChargePowerW: 900,
			source: "provisional-influx-estimate" as const,
		}),
		Object.freeze({
			minimumStateOfChargePercent: 97,
			maximumStateOfChargePercent: 98,
			estimatedMaximumChargePowerW: 550,
			source: "provisional-influx-estimate" as const,
		}),
		Object.freeze({
			minimumStateOfChargePercent: 98,
			maximumStateOfChargePercent: 99,
			estimatedMaximumChargePowerW: 250,
			source: "provisional-influx-estimate" as const,
		}),
		Object.freeze({
			minimumStateOfChargePercent: 99,
			maximumStateOfChargePercent: 100,
			estimatedMaximumChargePowerW: 150,
			source: "provisional-influx-estimate" as const,
		}),
	]);

export function resolveStrategyBatteryTechnicalLimits(
	model: SaxPowerBatteryModel,
): StrategyBatteryTechnicalLimits | null {
	const limits = TECHNICAL_LIMITS[model.id];
	const usableCapacityWh = model.usableCapacityKwh * 1_000;

	if (
		!limits
		|| !Number.isFinite(usableCapacityWh)
		|| usableCapacityWh <= 0
	) {
		return null;
	}

	return Object.freeze({
		batteryModelId: model.id,
		usableCapacityWh,
		...limits,
	});
}

export function estimateStrategyChargeDuration(
	model: SaxPowerBatteryModel,
	currentStateOfChargePercent: number,
	targetStateOfChargePercent: number,
	configuredMaximumChargePowerW: number,
): StrategyChargeDurationEstimate | null {
	const limits = resolveStrategyBatteryTechnicalLimits(model);

	if (
		limits === null
		|| !Number.isFinite(currentStateOfChargePercent)
		|| !Number.isFinite(targetStateOfChargePercent)
		|| !Number.isFinite(configuredMaximumChargePowerW)
		|| currentStateOfChargePercent < 0
		|| currentStateOfChargePercent > 100
		|| targetStateOfChargePercent < currentStateOfChargePercent
		|| targetStateOfChargePercent > 100
		|| configuredMaximumChargePowerW <= 0
	) {
		return null;
	}

	const configuredAndTechnicalPowerW = Math.min(
		configuredMaximumChargePowerW,
		limits.maximumChargePowerW,
	);
	const segments = PROVISIONAL_SAX_CHARGE_POWER_SEGMENTS
		.map(segment => {
			const minimumStateOfChargePercent = Math.max(
				currentStateOfChargePercent,
				segment.minimumStateOfChargePercent,
			);
			const maximumStateOfChargePercent = Math.min(
				targetStateOfChargePercent,
				segment.maximumStateOfChargePercent,
			);

			if (maximumStateOfChargePercent <= minimumStateOfChargePercent) {
				return null;
			}

			const energyWh = limits.usableCapacityWh
				* (maximumStateOfChargePercent - minimumStateOfChargePercent)
				/ 100;
			const effectiveChargePowerW = Math.min(
				configuredAndTechnicalPowerW,
				segment.estimatedMaximumChargePowerW,
			);
			const durationSeconds = energyWh / effectiveChargePowerW * 3_600;

			return Object.freeze({
				minimumStateOfChargePercent,
				maximumStateOfChargePercent,
				energyWh,
				effectiveChargePowerW,
				durationSeconds,
				powerSource: segment.source,
			});
		})
		.filter((segment): segment is StrategyChargeDurationSegment =>
			segment !== null,
		);
	const requiredChargeEnergyWh = limits.usableCapacityWh
		* (targetStateOfChargePercent - currentStateOfChargePercent)
		/ 100;
	const estimatedDurationSeconds = segments.reduce(
		(sum, segment) => sum + segment.durationSeconds,
		0,
	);

	return Object.freeze({
		batteryModelId: model.id,
		requiredChargeEnergyWh,
		estimatedDurationSeconds,
		segments: Object.freeze(segments),
		provisional: segments.some(segment =>
			segment.powerSource === "provisional-influx-estimate",
		),
	});
}
