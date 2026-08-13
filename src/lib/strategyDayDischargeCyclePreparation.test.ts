import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import { prepareStrategyDayDischargeCycle } from "./strategyDayDischargeCyclePreparation";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import type { StrategyStateReader } from "./strategyStateResolver";

const NOW = Date.parse("2026-08-11T12:00:00.000Z");
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 3_500,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

function stateValues(
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
): Record<string, number> {
	return {
		[contract.modbus.operatingState.stateId]: 1,
		[contract.modbus.stateOfCharge.stateId]: 60,
		[contract.modbus.batteryPower.stateId]: 0,
		[contract.modbus.smartMeterPower.stateId]: 0,
		[contract.pvForecast.energyNowUntilEndOfDay.stateId]: 8_000,
		[contract.pvForecast.energyToday.stateId]: 10_000,
		[contract.pvForecast.energyTomorrow.stateId]: 12_000,
		[contract.pvForecast.lastUpdated.stateId]: NOW - 1_000,
	};
}

function reader(
	values: Record<string, number> = stateValues(),
	missingObjectId?: string,
	stateTimestamp = NOW - 1_000,
): StrategyStateReader {
	return {
		async getForeignObjectAsync(id) {
			if (id === missingObjectId) {
				return null;
			}

			return {
				_id: id,
				type: "state",
				common: {
					name: id,
					type: "number",
					role: "value",
					read: true,
					write: false,
				},
				native: {},
			};
		},
		async getForeignStateAsync(id) {
			if (!Object.hasOwn(values, id)) {
				return null;
			}

			return {
				val: values[id],
				ack: true,
				ts: stateTimestamp,
				lc: stateTimestamp,
				from: "system.adapter.strategy-test.0",
				q: 0,
			};
		},
	};
}

function prepare(
	inputReader: StrategyStateReader = reader(),
	daylightWindowStartsAt = NOW - 1_000,
	daylightWindowEndsAt = NOW + 10 * 60 * 60 * 1_000,
	contract?: StrategyIntegrationContract,
) {
	return prepareStrategyDayDischargeCycle(
		inputReader,
		CONFIGURATION,
		60_000,
		2_000,
		daylightWindowStartsAt,
		daylightWindowEndsAt,
		contract,
		{ now: NOW },
	);
}

describe("strategy day discharge cycle preparation", () => {
	it("resolves inputs and prepares an allowed cycle", async () => {
		const result = await prepare();

		expect(result?.createdAt).to.equal(NOW);
		expect(result?.snapshot.modbus.stateOfChargePercent).to.equal(60);
		expect(result?.cyclePlan.evaluation.windowGate.targetDischargePowerW)
			.to.equal(2_000);
		expect(result?.cyclePlan.evaluation.createdAt).to.equal(
			result?.snapshot.createdAt,
		);
	});

	it("prepares an explicit safe stop outside the daylight window", async () => {
		const result = await prepare(reader(), NOW + 1, NOW + 2_000);

		expect(result?.cyclePlan.evaluation.windowGate.reason).to.equal(
			"before-daylight-window",
		);
		expect(result?.cyclePlan.evaluation.windowGate.targetDischargePowerW)
			.to.equal(0);
	});

	it("fails closed when a required object is missing", async () => {
		const stateId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;

		expect(await prepare(reader(stateValues(), stateId))).to.equal(null);
	});

	it("fails closed when resolved observations are stale", async () => {
		const staleReader = reader(
			stateValues(),
			undefined,
			NOW - 16 * 60 * 1_000,
		);

		expect(await prepare(staleReader)).to.equal(null);
	});

	it("uses the selected integration contract for reading", async () => {
		const contract: StrategyIntegrationContract = {
			...STRATEGY_INTEGRATION_CONTRACT,
			modbus: {
				...STRATEGY_INTEGRATION_CONTRACT.modbus,
				dischargePowerCommand: {
					...STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand,
					stateId: "modbus.2.command.43",
				},
			},
		};
		const result = await prepare(
			reader(stateValues(contract)),
			NOW - 1_000,
			NOW + 1_000,
			contract,
		);

		expect(result?.resolution.modbus.dischargePowerCommand.stateId)
			.to.equal("modbus.2.command.43");
	});

	it("fails closed for a non-finite cycle timestamp", async () => {
		const result = await prepareStrategyDayDischargeCycle(
			reader(),
			CONFIGURATION,
			60_000,
			2_000,
			NOW - 1_000,
			NOW + 1_000,
			undefined,
			{ now: Number.NaN },
		);

		expect(result).to.equal(null);
	});

	it("propagates technical reader failures", async () => {
		const failure = new Error("reader failed");
		const failingReader: StrategyStateReader = {
			async getForeignObjectAsync() {
				throw failure;
			},
			async getForeignStateAsync() {
				return null;
			},
		};
		let caught: unknown;

		try {
			await prepare(failingReader);
		} catch (error) {
			caught = error;
		}

		expect(caught).to.equal(failure);
	});
});
