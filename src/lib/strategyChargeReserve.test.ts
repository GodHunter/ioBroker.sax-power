import { expect } from "chai";
import { createStrategyChargeReserve } from "./strategyChargeReserve";

describe("strategy charge reserve", () => {
	it("limits a high strategy request to established acceptance plus ten percent", () => {
		const result = createStrategyChargeReserve(3_500, 3_500, 94, 1_518);
		expect(result.strategyRequestedChargePowerW).to.equal(3_500);
		expect(result.effectiveChargeReserveW).to.equal(1_670);
		expect(result.reason).to.equal("learned-acceptance");
	});

	it("never raises a lower strategy request", () => {
		const result = createStrategyChargeReserve(700, 3_500, 94, 1_518);
		expect(result.effectiveChargeReserveW).to.equal(700);
		expect(result.reason).to.equal("strategy-target-with-learned-headroom");
	});

	it("falls back to the strategy request without a trusted learned value", () => {
		const result = createStrategyChargeReserve(3_500, 3_500, 94, null);
		expect(result.effectiveChargeReserveW).to.equal(3_500);
		expect(result.reason).to.equal("strategy-target-fallback");
	});

	it("keeps the explicit full-SOC release at zero", () => {
		const result = createStrategyChargeReserve(3_500, 3_500, 100, 150);
		expect(result.effectiveChargeReserveW).to.equal(0);
		expect(result.reason).to.equal("full-soc");
	});
});
