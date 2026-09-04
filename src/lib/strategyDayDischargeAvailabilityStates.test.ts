import { expect } from "chai";

import {
	createStrategyDayDischargeAvailability,
	type StrategyDayDischargeChargingContext,
} from "./strategyDayDischargeAvailabilityStates";
import type { StrategyDaylightWindowCyclePreparation } from "./strategyDaylightWindowCyclePreparation";

function preparation(availablePowerW: number = 2_000): StrategyDaylightWindowCyclePreparation {
	return {
		createdAt: 1_000,
		daylightWindow: {
			startsAt: 0,
			endsAt: 10_000,
		},
		cyclePreparation: {
			cyclePlan: {
				evaluation: {
					windowGate: {
						targetDischargePowerW: availablePowerW,
						reason: "daylight-window-active",
						decision: {
							permission: {
								reason: "discharge-allowed",
							},
						},
					},
				},
			},
		},
	} as unknown as StrategyDaylightWindowCyclePreparation;
}

function chargingContext(
	overrides: Partial<StrategyDayDischargeChargingContext> = {},
): StrategyDayDischargeChargingContext {
	return {
		reason: "forecast-balanced",
		currentSocPercent: 75,
		plannedSocUpperPercent: 70,
		forecastMarginWh: 2_000,
		...overrides,
	};
}

describe("strategy day discharge availability states", () => {
	it("keeps the existing availability when SOC is above the charging corridor", () => {
		const result = createStrategyDayDischargeAvailability(
			preparation(),
			chargingContext(),
		);

		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(2_000);
		expect(result.reason).to.equal("discharge-allowed");
	});

	it("reserves battery energy while SOC is inside the charging corridor", () => {
		const result = createStrategyDayDischargeAvailability(
			preparation(),
			chargingContext({ currentSocPercent: 69 }),
		);

		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("soc-trajectory-reserve");
	});

	it("blocks external availability while the charging controller is recovering", () => {
		for (const reason of [
			"forecast-insufficient",
			"trajectory-recovery",
			"target-deadline-recovery",
		] as const) {
			const result = createStrategyDayDischargeAvailability(
				preparation(),
				chargingContext({ reason }),
			);

			expect(result.allowed).to.equal(false);
			expect(result.availablePowerW).to.equal(0);
			expect(result.reason).to.equal(`charging-${reason}`);
		}
	});

	it("blocks availability when no forecast margin remains", () => {
		const result = createStrategyDayDischargeAvailability(
			preparation(),
			chargingContext({ forecastMarginWh: 0 }),
		);

		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("no-forecast-margin");
	});

	it("allows the existing day budget at the configured target SOC", () => {
		const result = createStrategyDayDischargeAvailability(
			preparation(),
			chargingContext({
				reason: "target-soc-reached",
				currentSocPercent: 100,
				plannedSocUpperPercent: 100,
			}),
		);

		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(2_000);
	});
});
