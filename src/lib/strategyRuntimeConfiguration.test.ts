import { expect } from "chai";
import {
	type StrategyRuntimeConfigurationInput,
	validateStrategyRuntimeConfiguration,
} from "./strategyRuntimeConfiguration";

function validInput(): StrategyRuntimeConfigurationInput {
	return {
		enabled: true,
		batteryModelId: "home-plus-7.7",
		minimumStateOfChargePercent: 20,
		maximumStateOfChargePercent: 90,
		maximumChargePowerW: 3_500,
		maximumDischargePowerW: 3_000,
		pvForecastReserveWh: 500,
		maximumForecastAgeMs: 60 * 60 * 1_000,
		requestedDischargePowerW: 2_000,
		intervalMs: 30_000,
	};
}

describe("strategy runtime configuration", () => {
	it("keeps the strategy disabled without requiring detail values", () => {
		const result = validateStrategyRuntimeConfiguration({
			enabled: false,
		} as StrategyRuntimeConfigurationInput);

		expect(result).to.deep.equal({
			valid: true,
			configuration: { enabled: false },
			issues: [],
		});
	});

	it("requires an explicit boolean main switch", () => {
		for (const enabled of [undefined, 0, "false"]) {
			const result = validateStrategyRuntimeConfiguration({
				...validInput(),
				enabled,
			});
			expect(result).to.deep.equal({
				valid: false,
				configuration: null,
				issues: [{ field: "enabled", reason: "invalid-boolean" }],
			});
		}
	});

	it("accepts and freezes a complete enabled configuration", () => {
		const result = validateStrategyRuntimeConfiguration(validInput());

		expect(result.valid).to.equal(true);
		if (!result.valid || !result.configuration.enabled) return;
		expect(result.configuration.maximumForecastAgeMs).to.equal(3_600_000);
		expect(result.configuration.requestedDischargePowerW).to.equal(2_000);
		expect(result.configuration.intervalMs).to.equal(30_000);
		expect(Object.isFrozen(result)).to.equal(true);
		expect(Object.isFrozen(result.configuration)).to.equal(true);
		expect(Object.isFrozen(result.configuration.configuration)).to.equal(true);
		expect(Object.isFrozen(result.issues)).to.equal(true);
	});

	it("includes core strategy configuration issues when enabled", () => {
		const result = validateStrategyRuntimeConfiguration({
			...validInput(),
			batteryModelId: "unknown",
			maximumStateOfChargePercent: 101,
		});

		expect(result.valid).to.equal(false);
		expect(result.issues).to.include.deep.members([
			{ field: "batteryModelId", reason: "invalid-model" },
			{ field: "maximumStateOfChargePercent", reason: "out-of-range" },
		]);
	});

	it("rejects missing and non-finite runtime values", () => {
		const result = validateStrategyRuntimeConfiguration({
			...validInput(),
			maximumForecastAgeMs: undefined,
			requestedDischargePowerW: Number.NaN,
			intervalMs: Number.POSITIVE_INFINITY,
		});

		expect(result.issues).to.deep.equal([
			{ field: "maximumForecastAgeMs", reason: "invalid-number" },
			{ field: "requestedDischargePowerW", reason: "invalid-number" },
			{ field: "intervalMs", reason: "invalid-number" },
		]);
	});

	it("allows a zero forecast age and zero requested discharge power", () => {
		const result = validateStrategyRuntimeConfiguration({
			...validInput(),
			maximumForecastAgeMs: 0,
			requestedDischargePowerW: 0,
		});

		expect(result.valid).to.equal(true);
	});

	it("rejects negative values and a zero scheduler interval", () => {
		const result = validateStrategyRuntimeConfiguration({
			...validInput(),
			maximumForecastAgeMs: -1,
			requestedDischargePowerW: -1,
			intervalMs: 0,
		});

		expect(result.issues).to.deep.equal([
			{ field: "maximumForecastAgeMs", reason: "out-of-range" },
			{ field: "requestedDischargePowerW", reason: "out-of-range" },
			{ field: "intervalMs", reason: "out-of-range" },
		]);
	});

	it("does not mutate the supplied input", () => {
		const input = validInput();
		const before = { ...input };
		validateStrategyRuntimeConfiguration(input);
		expect(input).to.deep.equal(before);
		expect(Object.isFrozen(input)).to.equal(false);
	});
});
