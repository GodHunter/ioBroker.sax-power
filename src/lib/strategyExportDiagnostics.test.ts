import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { diagnoseStrategyExportWindow } from "./strategyExportDiagnostics";

const now = 1_800_000;
const samples = Array.from({ length: 20 }, (_, index) => ({
	at: now - (19 - index) * 60_000,
	exportW: 700,
}));

describe("PV export window diagnostics", () => {
	it("qualifies sustained export without changing its arithmetic mean", () => {
		const result = diagnoseStrategyExportWindow(samples, now);
		assert.equal(result.reason, "qualified");
		assert.equal(result.sustainedExportPowerW, 700);
		assert.equal(result.sampleCount, 20);
		assert.equal(result.durationMinutes, 19);
	});
	it("reports insufficient samples", () => {
		assert.equal(diagnoseStrategyExportWindow(samples.slice(-5), now).reason, "insufficient-samples");
	});
	it("reports insufficient duration", () => {
		assert.equal(diagnoseStrategyExportWindow(samples.slice(-10), now).reason, "insufficient-duration");
	});
	it("reports sample gaps", () => {
		const gap = [samples[0]!, ...samples.slice(3)];
		assert.equal(diagnoseStrategyExportWindow(gap, now).reason, "sample-gap");
		assert.equal(diagnoseStrategyExportWindow(gap, now).sustainedExportPowerW, 0);
	});
	it("rejects invalid samples", () => {
		assert.equal(diagnoseStrategyExportWindow([{ at: now, exportW: -1 }], now).reason, "invalid-grid-reading");
	});
	it("ignores readings outside the 20 minute window", () => {
		const result = diagnoseStrategyExportWindow([{ at: now - 21 * 60_000, exportW: 999 }, ...samples], now);
		assert.equal(result.sampleCount, 20);
		assert.equal(result.sustainedExportPowerW, 700);
	});
});
