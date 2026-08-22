import { expect } from "chai";

import type { StrategyConfiguration } from "./strategyConfiguration";
import { STRATEGY_CHARGING_SHADOW_STATE_IDS } from "./strategyChargingShadowStates";
import {
	executeStrategyIoBrokerChargingShadowCycle,
	type StrategyIoBrokerChargingShadowAdapter,
} from "./strategyIoBrokerChargingShadowCycle";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";

const NOW = Date.UTC(2026, 5, 21, 12);
const AFTER_SUNSET = Date.UTC(2026, 5, 21, 21);
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 3_500,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

function state(
	value: ioBroker.StateValue,
	timestamp = NOW,
): ioBroker.State {
	return {
		val: value,
		ack: true,
		q: 0,
		ts: timestamp,
		lc: timestamp,
	} as ioBroker.State;
}

function runtime() {
	const published = new Map<string, ioBroker.StateValue>();
	const values = new Map<string, ioBroker.State>([
		[STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.operatingState.stateId, state(1)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId, state(60)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.modbus.smartMeterPower.stateId, state(0)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyNowUntilEndOfDay.stateId, state(8_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyToday.stateId, state(12_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyTomorrow.stateId, state(10_000)],
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId, state(NOW)],
	]);

	const adapter: StrategyIoBrokerChargingShadowAdapter = {
		getAstroDate(pattern) {
			return new Date(pattern === "sunrise"
				? Date.UTC(2026, 5, 21, 4)
				: Date.UTC(2026, 5, 21, 20));
		},
		async extendObjectAsync() {},
		async setStateAsync(id, value) {
			published.set(id, value.val ?? null);
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
		async setForeignStateAsync() {
			throw new Error("shadow cycle must never write a Modbus command");
		},
	};

	return { adapter, values, published };
}

describe("strategy ioBroker charging shadow cycle", () => {
	it("clears a previous recommendation when required inputs become unsafe", async () => {
		const run = runtime();

		const first = await executeStrategyIoBrokerChargingShadowCycle(
			run.adapter,
			CONFIGURATION,
			undefined,
			{ now: NOW },
		);

		expect(first?.decision.valid).to.equal(true);
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.recommendedChargePowerW,
		)).to.be.greaterThan(0);

		const socId = STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;
		run.values.set(socId, {
			...state(60),
			ack: false,
		});

		const second = await executeStrategyIoBrokerChargingShadowCycle(
			run.adapter,
			CONFIGURATION,
			undefined,
			{ now: NOW },
		);

		expect(second).to.equal(null);
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.active,
		)).to.equal(false);
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.recommendedChargePowerW,
		)).to.equal(0);
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.decisionReason,
		)).to.equal("inputs-not-ready");
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.wouldWriteRegister44,
		)).to.equal(false);
	});

	it("publishes outside-daylight after sunset instead of retaining a recommendation", async () => {
		const run = runtime();

		for (const [id, currentState] of run.values) {
			run.values.set(id, {
				...currentState,
				ts: AFTER_SUNSET,
				lc: AFTER_SUNSET,
			});
		}
		run.values.set(
			STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId,
			state(AFTER_SUNSET, AFTER_SUNSET),
		);

		const result = await executeStrategyIoBrokerChargingShadowCycle(
			run.adapter,
			CONFIGURATION,
			undefined,
			{ now: AFTER_SUNSET },
		);

		expect(result).to.equal(null);
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.active,
		)).to.equal(false);
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.recommendedChargePowerW,
		)).to.equal(0);
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.decisionReason,
		)).to.equal("outside-daylight");
		expect(run.published.get(
			STRATEGY_CHARGING_SHADOW_STATE_IDS.wouldWriteRegister44,
		)).to.equal(false);
	});
});
