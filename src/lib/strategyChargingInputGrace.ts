export interface StrategyChargingInputGraceSnapshot {
	readonly recordedAt: number;
	readonly targetChargePowerW: number;
}

export const STRATEGY_CHARGING_INPUT_GRACE_MS = 60_000;

export function selectStrategyChargingInputGraceTarget(
	snapshot: StrategyChargingInputGraceSnapshot | null,
	nowMs: number,
	maximumChargePowerW: number,
): number | null {
	if (snapshot === null) return null;
	if (!Number.isFinite(nowMs) || !Number.isFinite(maximumChargePowerW) || maximumChargePowerW <= 0) return null;
	if (!Number.isFinite(snapshot.recordedAt) || !Number.isFinite(snapshot.targetChargePowerW)) return null;
	const ageMs = nowMs - snapshot.recordedAt;
	if (ageMs < 0 || ageMs > STRATEGY_CHARGING_INPUT_GRACE_MS) return null;
	return Math.max(0, Math.min(maximumChargePowerW, Math.round(snapshot.targetChargePowerW)));
}
