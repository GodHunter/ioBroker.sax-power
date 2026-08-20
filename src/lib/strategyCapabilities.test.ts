import { expect } from "chai";
import { discoverStrategyCapabilities } from "./strategyCapabilities";

function registerObject(read: boolean, write: boolean): ioBroker.StateObject {
	return {
		_id: "test",
		type: "state",
		common: { name: "test", type: "number", role: "value", read, write },
		native: {},
	};
}

describe("strategy capabilities", () => {
	it("allows charging and daytime availability without register 43", () => {
		const objects = Object.fromEntries([
			[44, registerObject(false, true)],
			[45, registerObject(true, true)],
			[46, registerObject(true, false)],
			[47, registerObject(true, false)],
			[48, registerObject(true, false)],
		].map(([register, object]) => [
			`modbus.1.holdingRegisters.${register}_SAX`, object,
		]));
		const result = discoverStrategyCapabilities("modbus.1", objects);

		expect(result?.modes).to.deep.include({
			id: "chargingControl",
			hardwareSupported: true,
			implemented: true,
			selectable: true,
			missingRegisters: [],
			reason: "available",
		});
		expect(result?.modes).to.deep.include({
			id: "dayAvailability",
			hardwareSupported: true,
			implemented: true,
			selectable: true,
			missingRegisters: [],
			reason: "available",
		});
		expect(result?.modes.find(mode => mode.id === "nightDischarge"))
			.to.deep.include({
				hardwareSupported: false,
				selectable: false,
				missingRegisters: [43],
				reason: "missing-registers",
			});
	});

	it("keeps night discharge unavailable until its separate logic exists", () => {
		const objects = Object.fromEntries([43, 44, 45, 46, 47, 48].map(register => [
			`modbus.2.holdingRegisters.${register}_SAX`,
			registerObject(true, register <= 45),
		]));
		const night = discoverStrategyCapabilities("modbus.2", objects)
			?.modes.find(mode => mode.id === "nightDischarge");

		expect(night).to.deep.include({
			hardwareSupported: true,
			implemented: false,
			selectable: false,
			reason: "not-implemented",
		});
	});

	it("rejects invalid instances and ignores similarly named states", () => {
		expect(discoverStrategyCapabilities("modbus.one", {})).to.equal(null);
		const result = discoverStrategyCapabilities("modbus.1", {
			"modbus.10.holdingRegisters.44_SAX": registerObject(false, true),
		});
		expect(result?.registers.find(item => item.register === 44)?.stateId)
			.to.equal(null);
	});

	it("prefers the candidate with the documented register access", () => {
		const result = discoverStrategyCapabilities("modbus.1", {
			"modbus.1.holdingRegisters.44_read_only": registerObject(true, false),
			"modbus.1.holdingRegisters.44_write_command": registerObject(false, true),
			"modbus.1.holdingRegisters.46_write_only": registerObject(false, true),
			"modbus.1.holdingRegisters.46_soc": registerObject(true, false),
		});

		expect(result?.registers.find(item => item.register === 44)?.stateId)
			.to.equal("modbus.1.holdingRegisters.44_write_command");
		expect(result?.registers.find(item => item.register === 46)?.stateId)
			.to.equal("modbus.1.holdingRegisters.46_soc");
	});
});
