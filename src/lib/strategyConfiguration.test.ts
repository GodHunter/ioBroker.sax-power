import { expect } from "chai";

import {
	type StrategyConfigurationInput,
	validateStrategyConfiguration,
} from "./strategyConfiguration";

function validInput(): StrategyConfigurationInput {
	return {
		batteryCapacityWh: 15400,
		minimumStateOfChargePercent: 10,
		maximumStateOfChargePercent: 90,
		maximumChargePowerW: 4600,
		maximumDischargePowerW: 4600,
		pvForecastReserveWh: 1500,
	};
}

describe("strategy configuration", () => {
	it("accepts finite values within the safety boundaries", () => {
		const result = validateStrategyConfiguration(validInput());

		expect(result).to.deep.equal({
			valid: true,
			configuration: validInput(),
			issues: [],
		});
	});

	it("creates an immutable validated configuration", () => {
		const result = validateStrategyConfiguration(validInput());

		expect(Object.isFrozen(result)).to.equal(true);
		expect(Object.isFrozen(result.issues)).to.equal(true);
		expect(result.valid).to.equal(true);

		if (result.valid) {
			expect(Object.isFrozen(result.configuration)).to.equal(true);
		}
	});

	it("rejects missing, non-numeric and non-finite values", () => {
		const input = validInput();

		const result = validateStrategyConfiguration({
			...input,
			batteryCapacityWh: undefined,
			maximumChargePowerW: "4600",
			maximumDischargePowerW: Number.NaN,
		});

		expect(result).to.deep.equal({
			valid: false,
			configuration: null,
			issues: [
				{ field: "batteryCapacityWh", reason: "invalid-number" },
				{ field: "maximumChargePowerW", reason: "invalid-number" },
				{ field: "maximumDischargePowerW", reason: "invalid-number" },
			],
		});
	});

	it("rejects values outside their allowed ranges", () => {
		const result = validateStrategyConfiguration({
			...validInput(),
			batteryCapacityWh: 0,
			minimumStateOfChargePercent: -1,
			maximumStateOfChargePercent: 101,
			maximumChargePowerW: -1,
			maximumDischargePowerW: -1,
			pvForecastReserveWh: -1,
		});

		expect(result.valid).to.equal(false);
		expect(result.issues).to.have.length(6);
		expect(result.issues.every(issue => issue.reason === "out-of-range"))
			.to.equal(true);
	});

	it("requires the maximum state of charge to exceed the minimum", () => {
		const result = validateStrategyConfiguration({
			...validInput(),
			minimumStateOfChargePercent: 50,
			maximumStateOfChargePercent: 50,
		});

		expect(result).to.deep.equal({
			valid: false,
			configuration: null,
			issues: [{
				field: "maximumStateOfChargePercent",
				reason: "invalid-order",
			}],
		});
	});

	it("does not mutate the supplied input", () => {
		const input = validInput();
		const before = { ...input };

		validateStrategyConfiguration(input);

		expect(input).to.deep.equal(before);
		expect(Object.isFrozen(input)).to.equal(false);
	});
});
