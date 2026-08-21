import { expect } from "chai";

import { discoverModbusInstances } from "./modbusDiscovery";

describe("Modbus discovery", () => {
	it("lists configured Modbus adapter instances for the admin dropdown", () => {
		const options = discoverModbusInstances({
			"system.adapter.modbus.10": {
				type: "instance",
				common: {
					name: { de: "SAX Nebenspeicher" },
					enabled: true,
				},
			},
			"system.adapter.modbus.2": {
				type: "instance",
				common: {
					name: "SAX Hauptspeicher",
					enabled: true,
				},
			},
			"system.adapter.javascript.0": {
				type: "instance",
				common: {
					name: "Ignored",
					enabled: true,
				},
			},
		});

		expect(options).to.deep.equal([
			{
				value: "modbus.2",
				label: "SAX Hauptspeicher — modbus.2",
				enabled: true,
			},
			{
				value: "modbus.10",
				label: "SAX Nebenspeicher — modbus.10",
				enabled: true,
			},
		]);
	});

	it("supports real ioBroker instance metadata and marks disabled instances", () => {
		const options = discoverModbusInstances({
			"system.adapter.modbus.1": {
				type: "instance",
				common: {
					name: "modbus",
					titleLang: "Sax Speicher",
					enabled: true,
				},
			},
			"system.adapter.modbus.2": {
				type: "instance",
				common: {
					name: "modbus",
					enabled: false,
				},
			},
		});

		expect(options).to.deep.equal([
			{
				value: "modbus.1",
				label: "Sax Speicher — modbus.1",
				enabled: true,
			},
			{
				value: "modbus.2",
				label: "modbus — modbus.2 · disabled",
				enabled: false,
			},
		]);
	});

	it("ignores non-instance objects even when their id resembles Modbus", () => {
		const options = discoverModbusInstances({
			"system.adapter.modbus.1": {
				type: "state",
				common: {
					name: "Not an instance",
					enabled: true,
				},
			},
		});

		expect(options).to.deep.equal([]);
	});
});
