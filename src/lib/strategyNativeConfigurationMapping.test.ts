import { expect } from "chai";

import {
	strategyRuntimeConfigurationFromNative,
} from "./strategyNativeConfiguration";

describe("strategy native configuration mapping", () => {
	it("normalizes a missing main switch to disabled without detail defaults", () => {
		const result = strategyRuntimeConfigurationFromNative({});

		expect(result).to.deep.equal({
			enabled: false,
			modbusInstance: undefined,
			batteryModelId: undefined,
			minimumStateOfChargePercent: undefined,
			maximumStateOfChargePercent: undefined,
			maximumChargePowerW: undefined,
			maximumDischargePowerW: undefined,
			pvForecastReserveWh: undefined,
			maximumForecastAgeMs: undefined,
			requestedDischargePowerW: undefined,
			intervalMs: undefined,
			chargingControlEnabled: true,
			dayAvailabilityEnabled: true,
			nightDischargeEnabled: false,
		});
	});

	it("maps native strategy fields without coercion", () => {
		const native = {
			strategyEnabled: true,
			strategyModbusInstance: "modbus.3",
			strategyBatteryModelId: "home-plus-7.7",
			strategyMinimumStateOfChargePercent: 20,
			strategyMaximumStateOfChargePercent: 90,
			strategyMaximumChargePowerW: 3_500,
			strategyMaximumDischargePowerW: 3_000,
			strategyPvForecastReserveWh: 500,
			strategyMaximumForecastAgeMs: 3_600_000,
			strategyRequestedDischargePowerW: 2_000,
			strategyIntervalMs: 30_000,
			strategyChargingControlEnabled: false,
			strategyDayAvailabilityEnabled: true,
			strategyNightDischargeEnabled: false,
		};

		const result = strategyRuntimeConfigurationFromNative(native);
		expect(result).to.deep.equal({
			enabled: true,
			modbusInstance: "modbus.3",
			batteryModelId: "home-plus-7.7",
			minimumStateOfChargePercent: 20,
			maximumStateOfChargePercent: 90,
			maximumChargePowerW: 3_500,
			maximumDischargePowerW: 3_000,
			pvForecastReserveWh: 500,
			maximumForecastAgeMs: 3_600_000,
			requestedDischargePowerW: 2_000,
			intervalMs: 30_000,
			chargingControlEnabled: false,
			dayAvailabilityEnabled: true,
			nightDischargeEnabled: false,
		});
		expect(Object.isFrozen(result)).to.equal(true);
	});

	it("does not mutate the native configuration", () => {
		const native = { strategyEnabled: false };
		strategyRuntimeConfigurationFromNative(native);
		expect(native).to.deep.equal({ strategyEnabled: false });
	});
});
