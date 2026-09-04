import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { strategyRuntimeConfigurationFromNative } from "./strategyNativeConfiguration";

const STRATEGY_DETAIL_FIELDS = [
	"strategyModbusInstance",
	"strategyBatteryModelId",
	"strategyMinimumStateOfChargePercent",
	"strategyMaximumStateOfChargePercent",
	"strategyMaximumChargePowerW",
	"strategyMaximumDischargePowerW",
	"strategyPvForecastReserveWh",
	"strategyMaximumForecastAgeMs",
	"strategyRequestedDischargePowerW",
	"strategyIntervalMs",
	"strategyChargingControlEnabled",
	"strategyDayAvailabilityEnabled",
	"strategyNightDischargeEnabled",
] as const;

describe("strategy native configuration", () => {
	it("keeps the strategy explicitly disabled by default", () => {
		const ioPackage = JSON.parse(
			readFileSync(join(process.cwd(), "io-package.json"), "utf8"),
		) as { native?: Record<string, unknown> };

		assert.equal(ioPackage.native?.strategyEnabled, false);
		assert.equal(typeof ioPackage.native?.strategyEnabled, "boolean");
	});

	it("keeps household learning explicitly opt-in by default", () => {
		const ioPackage = JSON.parse(
			readFileSync(join(process.cwd(), "io-package.json"), "utf8"),
		) as { native?: Record<string, unknown> };

		assert.equal(ioPackage.native?.strategyHouseholdLearningEnabled, false);
		assert.equal(ioPackage.native?.strategyPvPowerSourceMode, "none");

		const mapped = strategyRuntimeConfigurationFromNative({});
		assert.equal(mapped.householdLearningEnabled, false);
		assert.equal(mapped.pvPowerSourceMode, "none");
	});

	it("does not invent detail values while the strategy is disabled", () => {
		const ioPackage = JSON.parse(
			readFileSync(join(process.cwd(), "io-package.json"), "utf8"),
		) as { native?: Record<string, unknown> };

		for (const field of STRATEGY_DETAIL_FIELDS) {
			assert.equal(Object.hasOwn(ioPackage.native ?? {}, field), false);
		}
	});
});
