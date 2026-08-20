export const MIN_POLL_INTERVAL_SECONDS = 60;
export const MAX_POLL_INTERVAL_SECONDS = Math.floor(2_147_483_647 / 1_000);

export function isValidPollIntervalSeconds(value: number): boolean {
	return Number.isFinite(value)
		&& value >= MIN_POLL_INTERVAL_SECONDS
		&& value <= MAX_POLL_INTERVAL_SECONDS;
}
