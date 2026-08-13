import { expect } from "chai";

import {
	strategyRuntimeConfigurationFromNative,
} from "./strategyNativeConfiguration";

describe("strategy native configuration mapping", () => {
	it("normalizes a missing main switch to disabled without detail defaults", () => {
		const result = strategyRuntimeConfigurationFromNative({});

		expect(result).to.deep.equal({
			enabled: false,
			batteryModelId: undefined,
			minimumStateOfChargePercent: undefined,
			maximumStateOfChargePercent: undefined,
			maximumChargePowerW: undefined,
			maximumDischargePowerW: undefined,
			pvForecastReserveWh: undefined,
			maximumForecastAgeMs: undefined,
			requestedDischargePowerW: undefined,
			intervalMs: undefined,
		});
	});

	it("maps native strategy fields without coercion", () => {
		const native = {
			strategyEnabled: true,
			strategyBatteryModelId: "home-plus-7.7",
			strategyMinimumStateOfChargePercent: 20,
			strategyMaximumStateOfChargePercent: 90,
			strategyMaximumChargePowerW: 3_500,
			strategyMaximumDischargePowerW: 3_000,
			strategyPvForecastReserveWh: 500,
			strategyMaximumForecastAgeMs: 3_600_000,
			strategyRequestedDischargePowerW: 2_000,
			strategyIntervalMs: 30_000,
		};

		const result = strategyRuntimeConfigurationFromNative(native);
		expect(result).to.deep.equal({
			enabled: true,
			batteryModelId: "home-plus-7.7",
			minimumStateOfChargePercent: 20,
			maximumStateOfChargePercent: 90,
			maximumChargePowerW: 3_500,
			maximumDischargePowerW: 3_000,
			pvForecastReserveWh: 500,
			maximumForecastAgeMs: 3_600_000,
			requestedDischargePowerW: 2_000,
			intervalMs: 30_000,
		});
		expect(Object.isFrozen(result)).to.equal(true);
	});

	it("does not mutate the native configuration", () => {
		const native = { strategyEnabled: false };
		strategyRuntimeConfigurationFromNative(native);
		expect(native).to.deep.equal({ strategyEnabled: false });
	});
});
