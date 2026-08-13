import { expect } from "chai";

import { discoverModbusInstances } from "./modbusDiscovery";

describe("Modbus discovery", () => {
	it("lists configured Modbus adapter instances for the admin dropdown", () => {
		const options = discoverModbusInstances({
			"system.adapter.modbus.10": {
				common: { name: { de: "SAX Nebenspeicher" } },
			},
			"system.adapter.modbus.2": {
				common: { name: "SAX Hauptspeicher" },
			},
			"system.adapter.javascript.0": {
				common: { name: "Ignored" },
			},
		});

		expect(options).to.deep.equal([
			{
				value: "modbus.2",
				label: "SAX Hauptspeicher — modbus.2",
			},
			{
				value: "modbus.10",
				label: "SAX Nebenspeicher — modbus.10",
			},
		]);
	});
});
