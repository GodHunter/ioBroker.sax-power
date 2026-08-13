import { expect } from "chai";

import {
	createStrategyIntegrationContract,
	inspectStrategyIntegrationAvailability,
	STRATEGY_INTEGRATION_CONTRACT,
} from "./strategyIntegrationContract";

function requiredObjects(): Record<string, unknown> {
	const contract = STRATEGY_INTEGRATION_CONTRACT;

	return Object.fromEntries(
		[...Object.values(contract.modbus), ...Object.values(contract.pvForecast)].map(({ stateId }) => [stateId, {}]),
	);
}

describe("strategy integration contract", () => {
	it("maps the verified SAX Modbus registers", () => {
		const modbus = STRATEGY_INTEGRATION_CONTRACT.modbus;

		expect(Object.values(modbus).map(({ register }) => register)).to.deep.equal([43, 44, 45, 46, 47, 48]);

		expect(modbus.stateOfCharge.unit).to.equal("%");
		expect(modbus.batteryPower.unit).to.equal("W");
		expect(modbus.smartMeterPower.unit).to.equal("W");
	});

	it("binds the verified register contract to a selected Modbus instance", () => {
		const contract = createStrategyIntegrationContract("modbus.7");

		expect(contract).not.to.equal(null);
		expect(Object.values(contract?.modbus ?? {}).map(({ stateId }) => stateId))
			.to.deep.equal([
				"modbus.7.holdingRegisters.43_Leistungsgrenzwert_für_Entladung",
				"modbus.7.holdingRegisters.44_Leistungsgrenzwert_für_Ladung",
				"modbus.7.holdingRegisters.45_Schaltzustand_Speicher",
				"modbus.7.holdingRegisters.46_SOC",
				"modbus.7.holdingRegisters.47_Leistung",
				"modbus.7.holdingRegisters.48_Leistung_Smartmeter",
			]);
		expect(Object.isFrozen(contract)).to.equal(true);
		expect(createStrategyIntegrationContract("javascript.0")).to.equal(null);
	});

	it("treats register 43 as a transient discharge command", () => {
		const command = STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand;

		expect(command).to.include({
			register: 43,
			unit: "W",
			access: "command",
			confirmation: "transient-command",
		});
	});

	it("treats register 44 as a transient command", () => {
		const command = STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand;

		expect(command).to.include({
			register: 44,
			unit: "W",
			access: "command",
			confirmation: "transient-command",
		});
	});

	it("defines the verified PVForecast inputs", () => {
		const pvForecast = STRATEGY_INTEGRATION_CONTRACT.pvForecast;

		expect(pvForecast.energyNowUntilEndOfDay.stateId).to.equal(
			"pvforecast.0.summary.energy.nowUntilEndOfDay",
		);
		expect(pvForecast.lastUpdated.unit).to.equal("timestamp");
	});

	it("accepts all required strategy inputs", () => {
		const availability = inspectStrategyIntegrationAvailability(requiredObjects());

		expect(availability).to.deep.equal({
			modbusAvailable: true,
			pvForecastAvailable: true,
			marketPriceAdapterAvailable: false,
			strategyInputsReady: true,
			missingRequiredStateIds: [],
		});
	});

	it("reports a missing required input", () => {
		const objects = requiredObjects();
		const missingStateId = STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;

		delete objects[missingStateId];

		const availability = inspectStrategyIntegrationAvailability(objects);

		expect(availability.modbusAvailable).to.equal(false);
		expect(availability.strategyInputsReady).to.equal(false);
		expect(availability.missingRequiredStateIds).to.deep.equal([missingStateId]);
	});

	it("does not treat optional register 43 as a base requirement", () => {
		const objects = requiredObjects();
		delete objects[
			STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId
		];

		const availability = inspectStrategyIntegrationAvailability(objects);
		expect(availability.modbusAvailable).to.equal(true);
		expect(availability.strategyInputsReady).to.equal(true);
		expect(availability.missingRequiredStateIds).to.deep.equal([]);
	});

	it("does not invent an APG price state", () => {
		const marketPrice = STRATEGY_INTEGRATION_CONTRACT.marketPrice;

		expect(marketPrice.required).to.equal(false);
		expect(marketPrice.priceStateId).to.equal(null);
	});
});
