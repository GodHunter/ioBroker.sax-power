import { expect } from "chai";

import { createStrategyInputSnapshot } from "./strategyInputSnapshot";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyStateContract,
} from "./strategyIntegrationContract";
import type {
	StrategyResolvedState,
	StrategyStateResolution,
} from "./strategyStateResolver";

function available(
	contract: StrategyStateContract,
	value: number | null,
): StrategyResolvedState {
	return {
		stateId: contract.stateId,
		contract,
		available: true,
		value,
		reason: null,
	};
}

function validResolution(): StrategyStateResolution {
	const { modbus, pvForecast } = STRATEGY_INTEGRATION_CONTRACT;

	return {
		modbus: {
			dischargePowerCommand: available(
				modbus.dischargePowerCommand,
				null,
			),
			chargePowerCommand: available(modbus.chargePowerCommand, null),
			operatingState: available(modbus.operatingState, 2),
			stateOfCharge: available(modbus.stateOfCharge, 63),
			batteryPower: available(modbus.batteryPower, -1250),
			smartMeterPower: available(modbus.smartMeterPower, 340),
		},
		pvForecast: {
			energyNowUntilEndOfDay: available(
				pvForecast.energyNowUntilEndOfDay,
				12400,
			),
			energyToday: available(pvForecast.energyToday, 18700),
			energyTomorrow: available(pvForecast.energyTomorrow, 22100),
			lastUpdated: available(pvForecast.lastUpdated, 1_786_464_000_000),
		},
		modbusReady: true,
		pvForecastReady: true,
		strategyInputsReady: true,
		unavailableStateIds: [],
	};
}

describe("strategy input snapshot", () => {
	it("creates a typed snapshot from a successful resolution", () => {
		const snapshot = createStrategyInputSnapshot(
			validResolution(),
			1_786_464_123_000,
		);

		expect(snapshot).to.deep.equal({
			createdAt: 1_786_464_123_000,
			modbus: {
				operatingState: 2,
				stateOfChargePercent: 63,
				batteryPowerW: -1250,
				smartMeterPowerW: 340,
			},
			pvForecast: {
				energyNowUntilEndOfDayWh: 12400,
				energyTodayWh: 18700,
				energyTomorrowWh: 22100,
				lastUpdatedTimestamp: 1_786_464_000_000,
			},
		});
	});

	it("does not require the night discharge command", () => {
		const resolution = validResolution();
		const command = resolution.modbus.dischargePowerCommand;

		expect(createStrategyInputSnapshot({
			...resolution,
			modbus: {
				...resolution.modbus,
				dischargePowerCommand: {
					...command,
					available: false,
					reason: "object-missing",
				},
			},
		})).not.to.equal(null);
	});

	it("creates an immutable nested snapshot", () => {
		const snapshot = createStrategyInputSnapshot(validResolution());

		expect(snapshot).not.to.equal(null);
		expect(Object.isFrozen(snapshot)).to.equal(true);
		expect(Object.isFrozen(snapshot?.modbus)).to.equal(true);
		expect(Object.isFrozen(snapshot?.pvForecast)).to.equal(true);
	});

	it("uses the resolved observations instead of aggregate readiness flags", () => {
		const resolution = validResolution();

		expect(createStrategyInputSnapshot({
			...resolution,
			strategyInputsReady: false,
		})).not.to.equal(null);
	});

	it("does not require the charge command for daytime availability", () => {
		const resolution = validResolution();
		const command = resolution.modbus.chargePowerCommand;

		expect(createStrategyInputSnapshot({
			...resolution,
			modbus: {
				...resolution.modbus,
				chargePowerCommand: {
					...command,
					available: false,
					reason: "object-missing",
				},
			},
		})).not.to.equal(null);
	});

	it("fails closed when an observation has no numeric value", () => {
		const resolution = validResolution();

		expect(createStrategyInputSnapshot({
			...resolution,
			modbus: {
				...resolution.modbus,
				stateOfCharge: {
					...resolution.modbus.stateOfCharge,
					value: null,
				},
			},
		})).to.equal(null);
	});

	it("fails closed for a non-finite creation timestamp", () => {
		expect(
			createStrategyInputSnapshot(validResolution(), Number.NaN),
		).to.equal(null);
	});
});
