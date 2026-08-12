import { expect } from "chai";
import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyCommandWriter } from "./strategyDayDischargeCommandExecutor";
import { executeStrategyDayDischargeCycleWithDaylightWindow } from "./strategyDaylightWindowCycleExecution";
import type { StrategyDaylightWindowProvider } from "./strategyDaylightWindowCyclePreparation";
import { STRATEGY_INTEGRATION_CONTRACT } from "./strategyIntegrationContract";
import type { StrategyStateReader } from "./strategyStateResolver";

const NOW = Date.parse("2026-08-12T10:00:00.000Z");
const CONFIGURATION: StrategyConfiguration = {
	batteryModelId: "home-plus-7.7",
	batteryCapacityWh: 10_000,
	minimumStateOfChargePercent: 20,
	maximumStateOfChargePercent: 90,
	maximumChargePowerW: 4_000,
	maximumDischargePowerW: 3_000,
	pvForecastReserveWh: 500,
};

function reader(): StrategyStateReader {
	const values: Record<string, number> = {
		[STRATEGY_INTEGRATION_CONTRACT.modbus.operatingState.stateId]: 1,
		[STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId]: 60,
		[STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower.stateId]: 0,
		[STRATEGY_INTEGRATION_CONTRACT.modbus.smartMeterPower.stateId]: 0,
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyNowUntilEndOfDay.stateId]: 8_000,
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyToday.stateId]: 10_000,
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.energyTomorrow.stateId]: 12_000,
		[STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId]: NOW - 1_000,
	};

	return {
		async getForeignObjectAsync(id) {
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
				ts: NOW - 1_000,
				lc: NOW - 1_000,
				from: "system.adapter.strategy-test.0",
				q: 0,
			};
		},
	};
}

function provider(
	startsAt = NOW - 1_000,
	endsAt = NOW + 10 * 60 * 60 * 1_000,
): StrategyDaylightWindowProvider {
	return {
		async getDaylightWindow() {
			return { startsAt, endsAt };
		},
	};
}

function writer() {
	const writes: Array<{
		stateId: string;
		value: number;
		acknowledged: false;
	}> = [];
	const commandWriter: StrategyCommandWriter = {
		async setForeignState(stateId, value, acknowledged) {
			writes.push({ stateId, value, acknowledged });
		},
	};

	return { commandWriter, writes };
}

function execute(
	daylightWindowProvider: StrategyDaylightWindowProvider = provider(),
	commandWriter: StrategyCommandWriter = writer().commandWriter,
) {
	return executeStrategyDayDischargeCycleWithDaylightWindow(
		reader(),
		daylightWindowProvider,
		commandWriter,
		CONFIGURATION,
		60_000,
		2_000,
		undefined,
		{ now: NOW },
	);
}

describe("strategy daylight window cycle execution", () => {
	it("executes one validated discharge command for an allowed cycle", async () => {
		const { commandWriter, writes } = writer();
		const result = await execute(provider(), commandWriter);

		expect(writes).to.deep.equal([{
			stateId:
				"modbus.1.holdingRegisters.43_Leistungsgrenzwert_für_Entladung",
			value: 2_000,
			acknowledged: false,
		}]);
		expect(result?.createdAt).to.equal(NOW);
		expect(result?.commandExecution.valueW).to.equal(2_000);
		expect(result?.commandExecution.commandPlan).to.equal(
			result?.preparation.cyclePreparation.cyclePlan.commandPlan,
		);
	});

	it("executes one explicit safe stop outside the daylight window", async () => {
		const { commandWriter, writes } = writer();
		const result = await execute(
			provider(NOW + 1, NOW + 2_000),
			commandWriter,
		);

		expect(writes).to.have.length(1);
		expect(writes[0]?.value).to.equal(0);
		expect(result?.commandExecution.reason).to.equal("apply-safe-stop");
	});

	it("fails closed without writing when cycle preparation is unavailable", async () => {
		const { commandWriter, writes } = writer();
		const result = await execute({
			async getDaylightWindow() {
				return null;
			},
		}, commandWriter);

		expect(result).to.equal(null);
		expect(writes).to.deep.equal([]);
	});

	it("propagates technical daylight provider failures without writing", async () => {
		const expectedError = new Error("daylight provider failed");
		const { commandWriter, writes } = writer();
		let actualError: unknown;

		try {
			await execute({
				async getDaylightWindow() {
					throw expectedError;
				},
			}, commandWriter);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
		expect(writes).to.deep.equal([]);
	});

	it("propagates technical reader failures without writing", async () => {
		const expectedError = new Error("state reader failed");
		const { commandWriter, writes } = writer();
		let actualError: unknown;

		try {
			await executeStrategyDayDischargeCycleWithDaylightWindow(
				{
					async getForeignObjectAsync() {
						throw expectedError;
					},
					async getForeignStateAsync() {
						return null;
					},
				},
				provider(),
				commandWriter,
				CONFIGURATION,
				60_000,
				2_000,
				undefined,
				{ now: NOW },
			);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
		expect(writes).to.deep.equal([]);
	});

	it("propagates technical writer failures", async () => {
		const expectedError = new Error("modbus write failed");
		let actualError: unknown;

		try {
			await execute(provider(), {
				async setForeignState() {
					throw expectedError;
				},
			});
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});
});
