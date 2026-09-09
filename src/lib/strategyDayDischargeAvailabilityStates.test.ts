import { expect } from "chai";
import { createStrategyDayDischargeAvailability, type StrategyDayDischargeChargingContext } from "./strategyDayDischargeAvailabilityStates";
import type { StrategyDaylightWindowCyclePreparation } from "./strategyDaylightWindowCyclePreparation";

function preparation(availablePowerW: number = 1_300, reason: string = "daylight-window-active"): StrategyDaylightWindowCyclePreparation {
	return { createdAt: 1_000, daylightWindow: { startsAt: 0, endsAt: 10_000 }, cyclePreparation: { cyclePlan: { evaluation: { windowGate: { targetDischargePowerW: availablePowerW, reason, decision: { permission: { reason: "discharge-allowed" } } } } } } } as unknown as StrategyDaylightWindowCyclePreparation;
}

function chargingContext(overrides: Partial<StrategyDayDischargeChargingContext> = {}): StrategyDayDischargeChargingContext {
	return {
		reason: "forecast-balanced",
		currentSocPercent: 70,
		plannedSocPercent: 70,
		plannedSocLowerPercent: 67,
		plannedSocUpperPercent: 73,
		forecastMarginWh: 2_000,
		requiredAverageChargePowerW: 1_000,
		targetChargePowerW: 1_000,
		maximumChargePowerW: 3_500,
		requestedDischargePowerW: 1_300,
		recoveryLatchActive: false,
		...overrides,
	};
}

describe("strategy day discharge availability states", () => {
	it("blocks at and below the lower SOC corridor and latches recovery", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ currentSocPercent: 67 }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("trajectory-below-corridor");
		expect(result.corridorRecoveryLatched).to.equal(true);
	});

	it("keeps discharge blocked after lower corridor breach until planned SOC is reached", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ currentSocPercent: 69, recoveryLatchActive: true }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("trajectory-recovery-latched");
		expect(result.corridorRecoveryLatched).to.equal(true);
	});

	it("releases the latch at planned SOC with half the configured power", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ currentSocPercent: 70, recoveryLatchActive: true }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(650);
		expect(result.reason).to.equal("trajectory-plan-balanced");
		expect(result.corridorRecoveryLatched).to.equal(false);
	});

	it("linearly throttles between lower corridor and planned SOC", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ currentSocPercent: 68.5 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(325);
		expect(result.reason).to.equal("trajectory-below-plan-throttled");
	});

	it("linearly increases between planned SOC and upper corridor", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ currentSocPercent: 71.5 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(975);
		expect(result.reason).to.equal("trajectory-above-plan-throttled");
	});

	it("allows full configured power at and above upper corridor", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ currentSocPercent: 73 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(1_300);
		expect(result.reason).to.equal("trajectory-above-corridor");
	});

	it("reconsiders legacy insufficient-charge-time through the SOC corridor", () => {
		const result = createStrategyDayDischargeAvailability(preparation(0, "insufficient-charge-time"), chargingContext({ currentSocPercent: 71.5 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(975);
		expect(result.reason).to.equal("trajectory-above-plan-throttled");
	});

	it("does not use forecast-insufficient as a binary day-discharge block when corridor data is valid", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ reason: "forecast-insufficient", currentSocPercent: 73 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(1_300);
		expect(result.reason).to.equal("trajectory-above-corridor");
	});

	it("does not use target-deadline-recovery as a binary day-discharge block when corridor data is valid", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ reason: "target-deadline-recovery", currentSocPercent: 71.5 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(975);
		expect(result.reason).to.equal("trajectory-above-plan-throttled");
	});

	it("keeps genuine safety and input states blocked", () => {
		for (const reason of ["below-minimum-soc", "inputs-not-ready", "invalid-input", "daylight-unavailable", "outside-daylight"] as const) {
			const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ reason, currentSocPercent: 73 }));
			expect(result.allowed).to.equal(false);
			expect(result.availablePowerW).to.equal(0);
			expect(result.reason).to.equal(`charging-${reason}`);
		}
	});

	it("blocks availability once target SOC has been reached", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ reason: "target-soc-reached", currentSocPercent: 100, plannedSocPercent: 100, plannedSocLowerPercent: 97, plannedSocUpperPercent: 100, requiredAverageChargePowerW: 0, targetChargePowerW: 0 }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("charging-target-soc-reached");
		expect(result.corridorRecoveryLatched).to.equal(false);
	});

	it("blocks day discharge while target SOC is being maintained", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ reason: "target-soc-maintenance", currentSocPercent: 99, plannedSocPercent: 100, plannedSocLowerPercent: 97, plannedSocUpperPercent: 100, requiredAverageChargePowerW: 280, targetChargePowerW: 700 }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("charging-target-soc-maintenance");
	});

	it("blocks conservatively when the SOC corridor is unavailable", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), chargingContext({ plannedSocPercent: null }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("trajectory-unavailable");
	});
});
