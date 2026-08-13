import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import {
	executeStrategyIoBrokerStrategyCycle,
	type StrategyIoBrokerStrategyCycleAdapter,
} from "./strategyIoBrokerStrategyCycle";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import { STRATEGY_MANUAL_CHARGE_STATE_IDS } from "./strategyManualChargeStates";

const NOW = Date.UTC(2026, 5, 21, 12);
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 3_500,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

function state(value: ioBroker.StateValue): ioBroker.State {
	return { val: value, ack: true, q: 0, ts: NOW, lc: NOW } as ioBroker.State;
}

function runtime(manualEnabled: boolean, validSoc = true) {
	const writes: Array<{ id: string; value: ioBroker.StateValue }> = [];
	let astroCalls = 0;
	const values = new Map<string, ioBroker.State>([
		[STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.operatingState.stateId, state(1)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId,
			validSoc ? state(60) : { ...state(60), ack: false }],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.smartMeterPower.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyNowUntilEndOfDay.stateId, state(8_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyToday.stateId, state(12_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyTomorrow.stateId, state(10_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId, state(NOW)],
	]);
	const adapter: StrategyIoBrokerStrategyCycleAdapter = {
		getAstroDate(pattern) {
			astroCalls += 1;
			return new Date(pattern === "sunrise"
				? Date.UTC(2026, 5, 21, 4)
				: Date.UTC(2026, 5, 21, 20));
		},
		async extendObjectAsync() {},
		async getStateAsync(id) {
			return id === STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled
				? state(manualEnabled)
				: state(1_800);
		},
		async setStateAsync(id, value) {
			writes.push({ id, value: value.val });
		},
		async getForeignObjectAsync(id) {
			return {
				_id: id,
				type: "state",
				common: {
					name: id,
					type: "number",
					role: "value",
					read: true,
					write: id === STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId
						|| id === STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
				},
				native: {},
			} as ioBroker.StateObject;
		},
		async getForeignStateAsync(id) {
			return values.get(id) ?? null;
		},
		async setForeignStateAsync(id, value) {
			writes.push({ id, value });
		},
	};
	return { adapter, writes, astroCalls: () => astroCalls };
}

describe("strategy ioBroker operating-mode cycle", () => {
	it("gives manual charging exclusive command ownership", async () => {
		const run = runtime(true);
		const result = await executeStrategyIoBrokerStrategyCycle(
			run.adapter, CONFIGURATION, 60 * 60 * 1_000, 2_000,
			undefined, { now: NOW },
		);

		expect(result?.manualCharge.control.operatingMode).to.equal("manual-charge");
		expect(result?.automatic).to.equal(null);
		expect(run.astroCalls()).to.equal(0);
		expect(run.writes).to.deep.equal([{
			id: STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId,
			value: 1_800,
		}]);
	});

	it("runs the automatic daylight cycle only when manual mode releases it", async () => {
		const run = runtime(false);
		const result = await executeStrategyIoBrokerStrategyCycle(
			run.adapter, CONFIGURATION, 60 * 60 * 1_000, 2_000,
			undefined, { now: NOW },
		);

		expect(result?.manualCharge.control.operatingMode).to.equal("automatic");
		expect(result?.automatic).not.to.equal(null);
		expect(run.astroCalls()).to.equal(2);
		expect(run.writes).to.deep.include({
			id: "strategy.dayDischarge.availablePowerW",
			value: 2_000,
		});
		expect(run.writes.some(({ id }) => id ===
			STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
		)).to.equal(false);
	});

	it("fails closed before automatic execution when manual inputs are unsafe", async () => {
		const run = runtime(false, false);
		const result = await executeStrategyIoBrokerStrategyCycle(
			run.adapter, CONFIGURATION, 60 * 60 * 1_000, 2_000,
			undefined, { now: NOW },
		);

		expect(result).to.equal(null);
		expect(run.astroCalls()).to.equal(0);
		expect(run.writes).to.deep.equal([]);
	});
});
