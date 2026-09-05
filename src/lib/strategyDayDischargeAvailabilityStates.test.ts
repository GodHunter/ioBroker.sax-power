import { expect } from "chai";
import { createStrategyDayDischargeAvailability, type StrategyDayDischargeChargingContext } from "./strategyDayDischargeAvailabilityStates";
import type { StrategyDaylightWindowCyclePreparation } from "./strategyDaylightWindowCyclePreparation";

function preparation(availablePowerW: number = 1_300): StrategyDaylightWindowCyclePreparation {
	return { createdAt: 1_000, daylightWindow: { startsAt: 0, endsAt: 10_000 }, cyclePreparation: { cyclePlan: { evaluation: { windowGate: { targetDischargePowerW: availablePowerW, reason: "daylight-window-active", decision: { permission: { reason: "discharge-allowed" } } } } } } } as unknown as StrategyDaylightWindowCyclePreparation;
}

function chargingContext(overrides: Partial<StrategyDayDischargeChargingContext> = {}): StrategyDayDischargeChargingContext {
	return { reason: "forecast-balanced", currentSocPercent: 75, plannedSocUpperPercent: 70, forecastMarginWh: 2_000, requiredAverageChargePowerW: 1_000, maximumChargePowerW: 3_500, ...overrides };
}

describe("strategy day discharge availability states", () => {
	it("allows the configured budget below 40 percent required charging power", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ requiredAverageChargePowerW: 1_400 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(1_300);
	});

	it("linearly throttles the budget between 40 and 50 percent", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ requiredAverageChargePowerW: 1_575 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(650);
		expect(result.reason).to.equal("charging-comfort-throttled");
	});

	it("blocks the budget at 50 percent required charging power", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ requiredAverageChargePowerW: 1_750 }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("charging-comfort-reserve");
	});

	it("does not hard-block trajectory recovery when charging remains comfortable", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ reason: "trajectory-recovery", currentSocPercent: 60, plannedSocUpperPercent: 70, requiredAverageChargePowerW: 1_000 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(1_300);
		expect(result.reason).to.equal("trajectory-budget-available");
	});

	it("keeps hard recovery and invalid states blocked", () => {
		for (const reason of ["forecast-insufficient", "target-deadline-recovery", "below-minimum-soc", "inputs-not-ready"] as const) {
			const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ reason }));
			expect(result.allowed).to.equal(false);
			expect(result.availablePowerW).to.equal(0);
			expect(result.reason).to.equal(`charging-${reason}`);
		}
	});

	it("blocks availability when no forecast margin remains", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ forecastMarginWh: 0 }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("no-forecast-margin");
	});

	it("allows the configured day budget at the target SOC", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ reason: "target-soc-reached", currentSocPercent: 100, plannedSocUpperPercent: 100, requiredAverageChargePowerW: 0 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(1_300);
	});
});
