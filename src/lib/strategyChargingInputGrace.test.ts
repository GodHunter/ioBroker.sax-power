import { expect } from "chai";
import { selectStrategyChargingInputGraceTarget } from "./strategyChargingInputGrace";

describe("strategy charging input grace", () => {
	it("reuses a recent stable target for up to 60 seconds", () => {
		expect(selectStrategyChargingInputGraceTarget({ recordedAt: 1_000, targetChargePowerW: 1_450 }, 60_000, 3_500)).to.equal(1_450);
	});

	it("expires after 60 seconds", () => {
		expect(selectStrategyChargingInputGraceTarget({ recordedAt: 1_000, targetChargePowerW: 1_450 }, 61_001, 3_500)).to.equal(null);
	});

	it("clamps the cached target to the configured maximum", () => {
		expect(selectStrategyChargingInputGraceTarget({ recordedAt: 1_000, targetChargePowerW: 4_000 }, 2_000, 3_500)).to.equal(3_500);
	});
});
