/** Read-only diagnostics for the sustained PV export qualification window. */
export type StrategyExportQualificationReason =
	| "invalid-grid-reading"
	| "insufficient-samples"
	| "insufficient-duration"
	| "sample-gap"
	| "qualified";

export interface StrategyExportSample {
	readonly at: number;
	readonly exportW: number;
}

export interface StrategyExportQualification {
	readonly reason: StrategyExportQualificationReason;
	readonly qualified: boolean;
	readonly sampleCount: number;
	readonly durationMinutes: number;
	readonly averageExportW: number;
	readonly sustainedExportPowerW: number;
}

export function diagnoseStrategyExportWindow(
	samples: readonly StrategyExportSample[],
	now: number,
): StrategyExportQualification {
	const valid = Number.isFinite(now) && samples.every(sample =>
		Number.isFinite(sample.at)
		&& Number.isFinite(sample.exportW)
		&& sample.exportW >= 0
		&& sample.at <= now
	);
	const window = valid
		? samples.filter(sample => now - sample.at <= 20 * 60_000)
		: [];
	const ordered = window.every((sample, index) =>
		index === 0 || sample.at >= window[index - 1]!.at
	);
	const durationMinutes = ordered && window.length > 0
		? (now - window[0]!.at) / 60_000
		: 0;
	const averageExportW = ordered && window.length > 0
		? window.reduce((sum, sample) => sum + sample.exportW, 0) / window.length
		: 0;
	const reason: StrategyExportQualificationReason = !valid || !ordered
		? "invalid-grid-reading"
		: window.length < 10
			? "insufficient-samples"
			: durationMinutes < 19
				? "insufficient-duration"
				: window.some((sample, index) => index > 0 && sample.at - window[index - 1]!.at > 120_000)
					? "sample-gap"
					: "qualified";
	return Object.freeze({
		reason,
		qualified: reason === "qualified",
		sampleCount: window.length,
		durationMinutes,
		averageExportW,
		sustainedExportPowerW: reason === "qualified" ? averageExportW : 0,
	});
}
