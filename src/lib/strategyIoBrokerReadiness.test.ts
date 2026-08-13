import { expect } from "chai";

import {
	assessStrategyIoBrokerReadiness,
	formatStrategyUnavailableInputs,
} from "./strategyIoBrokerReadiness";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import type { StrategyStateReader } from "./strategyStateResolver";

function readerWith(
	missingStateId?: string,
): StrategyStateReader {
	const currentTimestamp = Date.now() - 100;

	return {
		async getForeignObjectAsync(id) {
			return id === missingStateId
				? null
				: { type: "state" } as ioBroker.StateObject;
		},
		async getForeignStateAsync(id) {
			const contractStates = [
				...Object.values(STRATEGY_INTEGRATION_CONTRACT.modbus),
				...Object.values(STRATEGY_INTEGRATION_CONTRACT.pvForecast),
			];
			const contract = contractStates.find((state) => state.stateId === id);

			return {
				val: contract?.unit === "timestamp" ? currentTimestamp : 1,
				ack: true,
				ts: currentTimestamp,
				q: 0,
				from: "system.adapter.test.0",
				lc: currentTimestamp,
			};
		},
	};
}

describe("strategy ioBroker readiness", () => {
	it("accepts complete and current integration inputs", async () => {
		const result = await assessStrategyIoBrokerReadiness(
			readerWith(),
			3_600_000,
		);

		expect(result).to.deep.equal({
			ready: true,
			unavailableInputs: [],
		});
		expect(Object.isFrozen(result)).to.equal(true);
		expect(Object.isFrozen(result.unavailableInputs)).to.equal(true);
	});

	it("reports a missing required object without starting optimistically", async () => {
		const stateId = STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;
		const result = await assessStrategyIoBrokerReadiness(
			readerWith(stateId),
			3_600_000,
		);

		expect(result).to.deep.equal({
			ready: false,
			unavailableInputs: [{ stateId, reason: "object-missing" }],
		});
		expect(formatStrategyUnavailableInputs(result.unavailableInputs))
			.to.equal(`${stateId}:object-missing`);
	});

	it("accepts charging and daytime availability without register 43", async () => {
		const result = await assessStrategyIoBrokerReadiness(
			readerWith(
				STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
			),
			3_600_000,
		);

		expect(result).to.deep.equal({
			ready: true,
			unavailableInputs: [],
		});
	});

	it("uses the configured maximum forecast age", async () => {
		const reader = readerWith();
		const original = reader.getForeignStateAsync.bind(reader);
		reader.getForeignStateAsync = async (id) => {
			const state = await original(id);
			if (id !== STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId) {
				return state;
			}
			return {
				...state,
				val: Date.now() - 2_000,
			} as ioBroker.State;
		};

		const result = await assessStrategyIoBrokerReadiness(reader, 1_000);

		expect(result.ready).to.equal(false);
		expect(result.unavailableInputs).to.deep.equal([{
			stateId: STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId,
			reason: "stale",
		}]);
	});
});
