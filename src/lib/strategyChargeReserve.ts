export const CHARGE_RESERVE_HEADROOM_FACTOR = 1.10;

export interface StrategyChargeReserve {
	readonly strategyRequestedChargePowerW: number;
	readonly effectiveChargeReserveW: number;
	readonly learnedAcceptancePowerW: number | null;
	readonly reason: "outside-daylight" | "full-soc" | "learned-acceptance" | "strategy-target-with-learned-headroom" | "strategy-target-fallback";
}

export function createStrategyChargeReserve(
	strategyRequestedChargePowerW: number,
	maximumChargePowerW: number,
	currentSocPercent: number | null,
	learnedAcceptancePowerW: number | null,
	reserveEnabled: boolean = true,
): StrategyChargeReserve {
	const requested = Number.isFinite(strategyRequestedChargePowerW)
		? Math.max(0, Math.min(maximumChargePowerW, Math.round(strategyRequestedChargePowerW)))
		: maximumChargePowerW;
	if (currentSocPercent !== null && Number.isFinite(currentSocPercent) && currentSocPercent >= 100) {
		return Object.freeze({ strategyRequestedChargePowerW: requested, effectiveChargeReserveW: 0, learnedAcceptancePowerW, reason: "full-soc" as const });
	}
	if (!reserveEnabled) {
		return Object.freeze({ strategyRequestedChargePowerW: requested, effectiveChargeReserveW: 0, learnedAcceptancePowerW: null, reason: "outside-daylight" as const });
	}
	const learned = learnedAcceptancePowerW !== null && Number.isFinite(learnedAcceptancePowerW) && learnedAcceptancePowerW > 0
		? learnedAcceptancePowerW
		: null;
	if (learned === null) {
		return Object.freeze({ strategyRequestedChargePowerW: requested, effectiveChargeReserveW: requested, learnedAcceptancePowerW: null, reason: "strategy-target-fallback" as const });
	}
	const learnedLimit = Math.min(maximumChargePowerW, Math.round(learned * CHARGE_RESERVE_HEADROOM_FACTOR));
	const effective = Math.min(requested, learnedLimit);
	return Object.freeze({
		strategyRequestedChargePowerW: requested,
		effectiveChargeReserveW: effective,
		learnedAcceptancePowerW: learned,
		reason: learnedLimit < requested ? "learned-acceptance" as const : "strategy-target-with-learned-headroom" as const,
	});
}
