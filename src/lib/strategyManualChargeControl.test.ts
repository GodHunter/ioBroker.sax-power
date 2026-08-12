import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyInputSnapshot } from "./strategyInputSnapshot";
import { createStrategyManualChargeControl } from "./strategyManualChargeControl";

const configuration: StrategyConfiguration = Object.freeze({
	batteryModelId: "home-5.8",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 2_000,
	maximumDischargePowerW: 3500,
	pvForecastReserveWh: 500,
});

function createSnapshot(
	stateOfChargePercent: number = 50,
): StrategyInputSnapshot {
	return Object.freeze({
		createdAt: 1_786_550_400_000,
		modbus: Object.freeze({
			operatingState: 1,
			stateOfChargePercent,
			batteryPowerW: 0,
			smartMeterPowerW: 0,
		}),
		pvForecast: Object.freeze({
			energyNowUntilEndOfDayWh: 8_000,
			energyTodayWh: 12_000,
			energyTomorrowWh: 10_000,
			lastUpdatedTimestamp: 1_786_550_100_000,
		}),
	});
}

describe("strategy manual charge control", () => {
	it("leaves the automatic strategy in control while manual mode is disabled", () => {
		const control = createStrategyManualChargeControl(
			createSnapshot(),
			configuration,
			{ enabled: false, requestedChargePowerW: 1_800 },
		);

		expect(control).to.deep.include({
			operatingMode: "automatic",
			automaticStrategyAllowed: true,
			requestedChargePowerW: 1_800,
			targetChargePowerW: 0,
			reason: "manual-mode-disabled",
		});
	});

	it("takes priority over the automatic strategy and applies the manual target", () => {
		const control = createStrategyManualChargeControl(
			createSnapshot(),
			configuration,
			{ enabled: true, requestedChargePowerW: 1_800 },
		);

		expect(control).to.deep.include({
			operatingMode: "manual-charge",
			automaticStrategyAllowed: false,
			requestedChargePowerW: 1_800,
			targetChargePowerW: 1_800,
			reason: "apply-manual-charge-target",
		});
	});

	it("limits the manual target to the configured and model-safe charge power", () => {
		const control = createStrategyManualChargeControl(
			createSnapshot(),
			configuration,
			{ enabled: true, requestedChargePowerW: 5_000 },
		);

		expect(control).to.deep.include({
			requestedChargePowerW: 5_000,
			targetChargePowerW: 2_000,
			reason: "limit-manual-charge-target",
		});
	});

	it("keeps manual mode active but requests no charge at the maximum SOC", () => {
		const control = createStrategyManualChargeControl(
			createSnapshot(90),
			configuration,
			{ enabled: true, requestedChargePowerW: 1_800 },
		);

		expect(control).to.deep.include({
			operatingMode: "manual-charge",
			automaticStrategyAllowed: false,
			targetChargePowerW: 0,
			reason: "maximum-state-of-charge-reached",
		});
	});

	it("represents an enabled manual stop without returning to automatic mode", () => {
		const control = createStrategyManualChargeControl(
			createSnapshot(),
			configuration,
			{ enabled: true, requestedChargePowerW: 0 },
		);

		expect(control).to.deep.include({
			operatingMode: "manual-charge",
			automaticStrategyAllowed: false,
			targetChargePowerW: 0,
			reason: "requested-charge-power-zero",
		});
	});

	for (const requestedChargePowerW of [
		Number.NaN,
		Number.POSITIVE_INFINITY,
		-1,
	]) {
		it(`fails closed for an invalid requested power of ${requestedChargePowerW}`, () => {
			expect(createStrategyManualChargeControl(
				createSnapshot(),
				configuration,
				{ enabled: true, requestedChargePowerW },
			)).to.equal(null);
		});
	}
});
