import { expect } from "chai";
import { createStrategyDayDischargeAvailability, type StrategyDayDischargeChargingContext } from "./strategyDayDischargeAvailabilityStates";
import type { StrategyDaylightWindowCyclePreparation } from "./strategyDaylightWindowCyclePreparation";

function preparation(createdAt: number = 1_000): StrategyDaylightWindowCyclePreparation {
	return {
		createdAt,
		daylightWindow: { startsAt: 0, endsAt: 10_000_000 },
		cyclePreparation: { cyclePlan: { evaluation: { windowGate: { targetDischargePowerW: 1_300, reason: "daylight-window-active", decision: { permission: { reason: "discharge-allowed" } } } } } },
	} as unknown as StrategyDaylightWindowCyclePreparation;
}

function context(overrides: Partial<StrategyDayDischargeChargingContext> = {}): StrategyDayDischargeChargingContext {
	return {
		reason: "forecast-balanced",
		currentSocPercent: 70,
		plannedSocPercent: 70,
		plannedSocLowerPercent: 67,
		plannedSocUpperPercent: 73,
		forecastMarginWh: 2_000,
		energyRequiredWh: 1_000,
		requiredAverageChargePowerW: 1_000,
		targetChargePowerW: 1_000,
		maximumChargePowerW: 3_500,
		requestedDischargePowerW: 1_300,
		recoveryLatchActive: false,
		previousAllowed: false,
		releaseCandidateSince: null,
		...overrides,
	};
}

describe("strategy day discharge qualified release", () => {
	it("immediately releases a clearly established SOC surplus above the upper corridor", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), context({ currentSocPercent: 80.6, plannedSocPercent: 70, plannedSocLowerPercent: 67, plannedSocUpperPercent: 73, forecastMarginWh: 4_224, energyRequiredWh: 1_000 }));
		expect(result.allowed).to.equal(true);
		expect(result.availablePowerW).to.equal(1_300);
		expect(result.reason).to.equal("trajectory-above-corridor");
		expect(result.releaseCandidateSince).to.equal(null);
	});

	it("immediately releases the observed five-percent SOC surplus above the upper corridor", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), context({ currentSocPercent: 75.23, plannedSocPercent: 70, plannedSocLowerPercent: 67, plannedSocUpperPercent: 73, forecastMarginWh: 4_805, energyRequiredWh: 1_000 }));
		expect(result.allowed).to.equal(true);
		expect(result.reason).to.equal("trajectory-above-corridor");
	});

	it("blocks the observed near-plan short release despite a positive forecast margin", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), context({ currentSocPercent: 69, plannedSocPercent: 69.04, plannedSocLowerPercent: 66.04, plannedSocUpperPercent: 72.04, forecastMarginWh: 1_870, energyRequiredWh: 800 }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("release-surplus-insufficient");
		expect(result.releaseCandidateSince).to.equal(null);
	});

	it("blocks the observed late near-plan release with only 127 Wh margin", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), context({ currentSocPercent: 87, plannedSocPercent: 87.05, plannedSocLowerPercent: 84.05, plannedSocUpperPercent: 90.05, forecastMarginWh: 127, energyRequiredWh: 910 }));
		expect(result.allowed).to.equal(false);
		expect(result.availablePowerW).to.equal(0);
		expect(result.reason).to.equal("release-surplus-insufficient");
	});

	it("requires a marginal but meaningful surplus to remain stable for five minutes", () => {
		const first = createStrategyDayDischargeAvailability(preparation(1_000), context({ currentSocPercent: 72, plannedSocPercent: 70, forecastMarginWh: 2_000, energyRequiredWh: 1_000 }));
		expect(first.allowed).to.equal(false);
		expect(first.reason).to.equal("release-stability-pending");
		expect(first.releaseCandidateSince).to.equal(1_000);
		const stable = createStrategyDayDischargeAvailability(preparation(301_000), context({ currentSocPercent: 72, plannedSocPercent: 70, forecastMarginWh: 2_000, energyRequiredWh: 1_000, releaseCandidateSince: first.releaseCandidateSince }));
		expect(stable.allowed).to.equal(true);
		expect(stable.reason).to.equal("trajectory-above-plan-throttled");
		expect(stable.releaseCandidateSince).to.equal(null);
	});

	it("does not delay an immediate safety stop for an already active discharge", () => {
		const result = createStrategyDayDischargeAvailability(preparation(), context({ previousAllowed: true, reason: "below-minimum-soc", currentSocPercent: 80, plannedSocPercent: 70, plannedSocUpperPercent: 73, forecastMarginWh: 4_000 }));
		expect(result.allowed).to.equal(false);
		expect(result.reason).to.equal("charging-below-minimum-soc");
	});
});
