import { expect } from "chai";
import {
	createStrategyIoBrokerDaylightWindowProvider,
	type StrategyIoBrokerDaylightAdapter,
} from "./strategyIoBrokerDaylightWindow";

const CYCLE_TIMESTAMP = Date.UTC(2026, 8, 2, 6, 54);

function systemConfig(
	latitude: unknown = "49.07323120",
	longitude: unknown = "9.10645780",
): ioBroker.Object {
	return {
		_id: "system.config",
		type: "config",
		common: {
			name: "System configuration",
			latitude,
			longitude,
		} as ioBroker.SystemConfigCommon,
		native: {},
	} as ioBroker.ConfigObject;
}

function adapter(
	config: ioBroker.Object | null = systemConfig(),
): StrategyIoBrokerDaylightAdapter {
	return {
		async getForeignObjectAsync(id) {
			expect(id).to.equal("system.config");
			return config;
		},
	};
}

describe("strategy ioBroker daylight window provider", () => {
	it("derives sunrise and sunset from ioBroker system coordinates", async () => {
		const provider = createStrategyIoBrokerDaylightWindowProvider(adapter());
		const window = await provider.getDaylightWindow(CYCLE_TIMESTAMP);

		expect(window).to.not.equal(null);
		expect(window!.startsAt).to.be.lessThan(CYCLE_TIMESTAMP);
		expect(window!.endsAt).to.be.greaterThan(CYCLE_TIMESTAMP);
		expect(new Date(window!.startsAt).getUTCDate()).to.equal(2);
		expect(new Date(window!.endsAt).getUTCDate()).to.equal(2);
		expect(Object.isFrozen(window)).to.equal(true);
	});

	it("fails closed before reading system configuration for an invalid timestamp", async () => {
		let calls = 0;
		const provider = createStrategyIoBrokerDaylightWindowProvider({
			async getForeignObjectAsync() {
				calls += 1;
				return systemConfig();
			},
		});

		expect(await provider.getDaylightWindow(Number.NaN)).to.equal(null);
		expect(calls).to.equal(0);
	});

	it("fails closed when system coordinates are missing", async () => {
		const provider = createStrategyIoBrokerDaylightWindowProvider(adapter(null));
		expect(await provider.getDaylightWindow(CYCLE_TIMESTAMP)).to.equal(null);
	});

	it("fails closed for invalid system coordinates", async () => {
		const provider = createStrategyIoBrokerDaylightWindowProvider(
			adapter(systemConfig(200, 9.1)),
		);
		expect(await provider.getDaylightWindow(CYCLE_TIMESTAMP)).to.equal(null);
	});

	it("accepts numeric and numeric-string coordinates", async () => {
		const numeric = createStrategyIoBrokerDaylightWindowProvider(
			adapter(systemConfig(49.0732312, 9.1064578)),
		);
		const strings = createStrategyIoBrokerDaylightWindowProvider(
			adapter(systemConfig("49.07323120", "9.10645780")),
		);

		expect(await numeric.getDaylightWindow(CYCLE_TIMESTAMP)).to.deep.equal(
			await strings.getDaylightWindow(CYCLE_TIMESTAMP),
		);
	});

	it("propagates system configuration read failures unchanged", async () => {
		const expectedError = new Error("system config read failed");
		const provider = createStrategyIoBrokerDaylightWindowProvider({
			async getForeignObjectAsync() {
				throw expectedError;
			},
		});
		let actualError: unknown;

		try {
			await provider.getDaylightWindow(CYCLE_TIMESTAMP);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});

	it("returns an immutable provider", () => {
		const provider = createStrategyIoBrokerDaylightWindowProvider(adapter());
		expect(Object.isFrozen(provider)).to.equal(true);
	});
});
