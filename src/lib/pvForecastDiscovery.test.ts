import { expect } from "chai";

import {
	discoverPvForecastInstances,
	inspectPvForecastCapabilities,
} from "./pvForecastDiscovery";

describe("PVForecast discovery", () => {
	it("discovers and sorts PVForecast instances", () => {
		const result = discoverPvForecastInstances({
			"system.adapter.pvforecast.10": {
				type: "instance",
				common: {
					name: "PV Forecast 10",
					enabled: false,
				},
			},
			"system.adapter.pvforecast.2": {
				type: "instance",
				common: {
					titleLang: { de: "PV Dach", en: "PV roof" },
					enabled: true,
				},
			},
			"system.adapter.modbus.1": {
				type: "instance",
				common: { enabled: true },
			},
		});

		expect(result).to.deep.equal([
			{
				value: "pvforecast.2",
				label: "PV Dach — pvforecast.2",
				enabled: true,
			},
			{
				value: "pvforecast.10",
				label: "PV Forecast 10 — pvforecast.10 · disabled",
				enabled: false,
			},
		]);
	});

	it("ignores malformed and unrelated objects", () => {
		const result = discoverPvForecastInstances({
			"system.adapter.pvforecast.0": {
				type: "adapter",
				common: { enabled: true },
			},
			"system.adapter.pvforecast.foo": {
				type: "instance",
				common: { enabled: true },
			},
			"pvforecast.1": null,
		});

		expect(result).to.deep.equal([]);
	});

	it("accepts direct instance IDs", () => {
		const result = discoverPvForecastInstances({
			"pvforecast.3": {
				type: "instance",
				common: {
					name: "Forecast",
					enabled: true,
				},
			},
		});

		expect(result[0]?.value).to.equal("pvforecast.3");
		expect(result[0]?.enabled).to.equal(true);
	});

	it("detects a complete forecast interface", () => {
		const objects = Object.fromEntries([
			"summary.energy.nowUntilEndOfDay",
			"summary.energy.today",
			"summary.energy.tomorrow",
			"summary.lastUpdated",
		].map(suffix => [`pvforecast.4.${suffix}`, { type: "state" }]));

		const result = inspectPvForecastCapabilities(
			"pvforecast.4",
			objects,
		);

		expect(result?.compatible).to.equal(true);
		expect(result?.missingStateIds).to.deep.equal([]);
	});

	it("reports missing required forecast states", () => {
		const result = inspectPvForecastCapabilities(
			"pvforecast.1",
			{
				"pvforecast.1.summary.energy.today": { type: "state" },
			},
		);

		expect(result?.compatible).to.equal(false);
		expect(result?.missingStateIds).to.include(
			"pvforecast.1.summary.energy.tomorrow",
		);
	});

	it("rejects invalid instance IDs", () => {
		expect(
			inspectPvForecastCapabilities("modbus.1", {}),
		).to.equal(null);
	});
});
