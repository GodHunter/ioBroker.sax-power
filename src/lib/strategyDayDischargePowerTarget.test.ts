import { expect } from "chai";

import type {
	StrategyDayDischargePermission,
} from "./strategyDayDischargePermission";
import {
	createStrategyDayDischargePowerTarget,
} from "./strategyDayDischargePowerTarget";

const CREATED_AT = 1_786_464_123_000;

function permission(
	overrides: Partial<StrategyDayDischargePermission> = {},
): StrategyDayDischargePermission {
	return {
		createdAt: CREATED_AT,
		allowed: true,
		reason: "discharge-allowed",
		permittedDischargeEnergyWh: 2_500,
		maximumDischargePowerW: 3_000,
		...overrides,
	};
}

describe("strategy day discharge power target", () => {
	it("uses the requested power within the permitted limit", () => {
		const result = createStrategyDayDischargePowerTarget(
			permission(),
			2_000,
		);

		expect(result).to.deep.equal({
			createdAt: CREATED_AT,
			requestedDischargePowerW: 2_000,
			targetDischargePowerW: 2_000,
			limited: false,
		});
		expect(Object.isFrozen(result)).to.equal(true);
	});

	it("caps the target at the permitted maximum power", () => {
		const result = createStrategyDayDischargePowerTarget(
			permission(),
			4_000,
		);

		expect(result).to.include({
			targetDischargePowerW: 3_000,
			limited: true,
		});
	});

	it("keeps an explicit zero-power request", () => {
		const result = createStrategyDayDischargePowerTarget(
			permission(),
			0,
		);

		expect(result).to.include({
			targetDischargePowerW: 0,
			limited: false,
		});
	});

	it("returns zero when day discharge is denied", () => {
		const result = createStrategyDayDischargePowerTarget(
			permission({
				allowed: false,
				reason: "forecast-stale",
				permittedDischargeEnergyWh: 0,
				maximumDischargePowerW: 0,
			}),
			2_000,
		);

		expect(result).to.include({
			targetDischargePowerW: 0,
			limited: true,
		});
	});

	it("fails closed for an invalid requested power", () => {
		expect(createStrategyDayDischargePowerTarget(
			permission(),
			-1,
		)).to.equal(null);

		expect(createStrategyDayDischargePowerTarget(
			permission(),
			Number.NaN,
		)).to.equal(null);
	});

	it("fails closed for inconsistent allowed permissions", () => {
		expect(createStrategyDayDischargePowerTarget(
			permission({ maximumDischargePowerW: 0 }),
			2_000,
		)).to.equal(null);

		expect(createStrategyDayDischargePowerTarget(
			permission({ permittedDischargeEnergyWh: 0 }),
			2_000,
		)).to.equal(null);
	});

	it("fails closed for inconsistent denied permissions", () => {
		expect(createStrategyDayDischargePowerTarget(
			permission({
				allowed: false,
				reason: "insufficient-pv-energy",
				maximumDischargePowerW: 0,
			}),
			2_000,
		)).to.equal(null);
	});
});
