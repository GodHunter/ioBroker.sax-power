import { expect } from "chai";

import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	resolveStrategyStates,
	type StrategyStateReader,
} from "./strategyStateResolver";

const NOW = Date.parse("2026-08-11T12:00:00.000Z");

function allStateIds(
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
): string[] {
	return [
		...Object.values(contract.modbus),
		...Object.values(contract.pvForecast),
	].map(({ stateId }) => stateId);
}

function validStates(): Record<string, ioBroker.State> {
	const contract = STRATEGY_INTEGRATION_CONTRACT;

	return {
		[contract.modbus.operatingState.stateId]: {
			val: 2,
			ack: true,
			ts: NOW - 1_000,
			lc: NOW - 1_000,
			from: "system.adapter.modbus.1",
			q: 0,
		},
		[contract.modbus.stateOfCharge.stateId]: {
			val: 70,
			ack: true,
			ts: NOW - 1_000,
			lc: NOW - 1_000,
			from: "system.adapter.modbus.1",
			q: 0,
		},
		[contract.modbus.batteryPower.stateId]: {
			val: -1200,
			ack: true,
			ts: NOW - 1_000,
			lc: NOW - 1_000,
			from: "system.adapter.modbus.1",
			q: 0,
		},
		[contract.modbus.smartMeterPower.stateId]: {
			val: 350,
			ack: true,
			ts: NOW - 1_000,
			lc: NOW - 1_000,
			from: "system.adapter.modbus.1",
			q: 0,
		},
		[contract.pvForecast.energyNowUntilEndOfDay.stateId]: {
			val: 6200,
			ack: true,
			ts: NOW - 1_000,
			lc: NOW - 1_000,
			from: "system.adapter.pvforecast.0",
			q: 0,
		},
		[contract.pvForecast.energyToday.stateId]: {
			val: 11400,
			ack: true,
			ts: NOW - 1_000,
			lc: NOW - 1_000,
			from: "system.adapter.pvforecast.0",
			q: 0,
		},
		[contract.pvForecast.energyTomorrow.stateId]: {
			val: 9800,
			ack: true,
			ts: NOW - 1_000,
			lc: NOW - 1_000,
			from: "system.adapter.pvforecast.0",
			q: 0,
		},
		[contract.pvForecast.lastUpdated.stateId]: {
			val: NOW - 1_000,
			ack: true,
			ts: NOW - 1_000,
			lc: NOW - 1_000,
			from: "system.adapter.pvforecast.0",
			q: 0,
		},
	};
}

function reader(
	states: Record<string, ioBroker.State> = validStates(),
	missingObjects: readonly string[] = [],
): StrategyStateReader {
	const objects = Object.fromEntries(
		allStateIds()
			.filter(stateId => !missingObjects.includes(stateId))
			.map(stateId => {
				const object: ioBroker.StateObject = {
					_id: stateId,
					type: "state",
					common: {
						name: stateId,
						type: "number",
						role: "value",
						read: true,
						write: false,
					},
					native: {},
				};

				return [stateId, object];
			}),
	);

	return {
		async getForeignObjectAsync(id) {
			return objects[id] ?? null;
		},
		async getForeignStateAsync(id) {
			return states[id] ?? null;
		},
	};
}

describe("strategy state resolver", () => {
	it("accepts all valid required strategy inputs", async () => {
		const resolution = await resolveStrategyStates(reader(), undefined, {
			now: NOW,
		});

		expect(resolution.modbusReady).to.equal(true);
		expect(resolution.pvForecastReady).to.equal(true);
		expect(resolution.strategyInputsReady).to.equal(true);
		expect(resolution.unavailableStateIds).to.deep.equal([]);
		expect(resolution.modbus.stateOfCharge.value).to.equal(70);
	});

	it("checks transient command objects without reading their states", async () => {
		const baseReader = reader();
		const commandIds = [
			STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand.stateId,
			STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand.stateId,
		];
		const readStateIds: string[] = [];

		const recordingReader: StrategyStateReader = {
			getForeignObjectAsync: id =>
				baseReader.getForeignObjectAsync(id),
			async getForeignStateAsync(id) {
				readStateIds.push(id);
				return baseReader.getForeignStateAsync(id);
			},
		};

		const resolution = await resolveStrategyStates(
			recordingReader,
			undefined,
			{ now: NOW },
		);

		expect(resolution.modbus.dischargePowerCommand.available).to.equal(true);
		expect(resolution.modbus.dischargePowerCommand.value).to.equal(null);
		expect(resolution.modbus.chargePowerCommand.available).to.equal(true);
		expect(resolution.modbus.chargePowerCommand.value).to.equal(null);
		expect(readStateIds).not.to.include.members(commandIds);
	});

	it("distinguishes a missing object from a missing state", async () => {
		const objectId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;
		const stateId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower.stateId;
		const states = validStates();

		delete states[stateId];

		const resolution = await resolveStrategyStates(
			reader(states, [objectId]),
			undefined,
			{ now: NOW },
		);

		expect(resolution.modbus.stateOfCharge.reason).to.equal(
			"object-missing",
		);
		expect(resolution.modbus.batteryPower.reason).to.equal(
			"state-missing",
		);
		expect(resolution.strategyInputsReady).to.equal(false);
	});

	it("rejects null and non-numeric observation values", async () => {
		const states = validStates();
		const socId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;
		const powerId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower.stateId;

		states[socId] = { ...states[socId], val: null };
		states[powerId] = { ...states[powerId], val: "1200" };

		const resolution = await resolveStrategyStates(
			reader(states),
			undefined,
			{ now: NOW },
		);

		expect(resolution.modbus.stateOfCharge.reason).to.equal(
			"value-missing",
		);
		expect(resolution.modbus.batteryPower.reason).to.equal(
			"invalid-number",
		);
	});

	it("rejects bad quality and unacknowledged observations", async () => {
		const states = validStates();
		const socId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;
		const powerId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower.stateId;

		states[socId] = { ...states[socId], q: 1 };
		states[powerId] = { ...states[powerId], ack: false };

		const resolution = await resolveStrategyStates(
			reader(states),
			undefined,
			{ now: NOW },
		);

		expect(resolution.modbus.stateOfCharge.reason).to.equal(
			"bad-quality",
		);
		expect(resolution.modbus.batteryPower.reason).to.equal(
			"not-acknowledged",
		);
	});

	it("rejects a stale dynamic Modbus state update", async () => {
		const states = validStates();
		const stateId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge.stateId;

		states[stateId] = {
			...states[stateId],
			ts: NOW - 20 * 60 * 1000,
		};

		const resolution = await resolveStrategyStates(
			reader(states),
			undefined,
			{
				now: NOW,
				maximumStateAgeMs: 15 * 60 * 1000,
			},
		);

		expect(resolution.modbus.stateOfCharge.reason).to.equal("stale");
	});

	it("accepts an unchanged operating state with an old ioBroker timestamp", async () => {
		const states = validStates();
		const stateId =
			STRATEGY_INTEGRATION_CONTRACT.modbus.operatingState.stateId;

		states[stateId] = {
			...states[stateId],
			ts: NOW - 12 * 60 * 60 * 1000,
			lc: NOW - 12 * 60 * 60 * 1000,
		};

		const resolution = await resolveStrategyStates(
			reader(states),
			undefined,
			{
				now: NOW,
				maximumStateAgeMs: 15 * 60 * 1000,
			},
		);

		expect(resolution.modbus.operatingState.available).to.equal(true);
		expect(resolution.modbus.operatingState.value).to.equal(2);
		expect(resolution.modbusReady).to.equal(true);
	});

	it("uses the PVForecast domain timestamp instead of energy state timestamps", async () => {
		const states = validStates();
		const forecast = STRATEGY_INTEGRATION_CONTRACT.pvForecast;
		const oldStateTimestamp = NOW - 12 * 60 * 60 * 1000;

		for (const stateId of [
			forecast.energyNowUntilEndOfDay.stateId,
			forecast.energyToday.stateId,
			forecast.energyTomorrow.stateId,
			forecast.lastUpdated.stateId,
		]) {
			states[stateId] = {
				...states[stateId],
				ts: oldStateTimestamp,
				lc: oldStateTimestamp,
			};
		}

		states[forecast.lastUpdated.stateId] = {
			...states[forecast.lastUpdated.stateId],
			val: NOW - 30_000,
		};

		const resolution = await resolveStrategyStates(
			reader(states),
			undefined,
			{
				now: NOW,
				maximumStateAgeMs: 15 * 60 * 1000,
				maximumTimestampAgeMs: 60 * 60 * 1000,
			},
		);

		expect(resolution.pvForecast.energyNowUntilEndOfDay.available).to.equal(true);
		expect(resolution.pvForecast.energyToday.available).to.equal(true);
		expect(resolution.pvForecast.energyTomorrow.available).to.equal(true);
		expect(resolution.pvForecast.lastUpdated.available).to.equal(true);
		expect(resolution.pvForecastReady).to.equal(true);
	});

	it("validates and normalizes the PVForecast timestamp", async () => {
		const states = validStates();
		const stateId =
			STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId;
		const timestamp = NOW - 10_000;

		states[stateId] = {
			...states[stateId],
			val: new Date(timestamp).toISOString(),
		};

		const resolution = await resolveStrategyStates(
			reader(states),
			undefined,
			{ now: NOW },
		);

		expect(resolution.pvForecast.lastUpdated.available).to.equal(true);
		expect(resolution.pvForecast.lastUpdated.value).to.equal(timestamp);
	});

	it("rejects invalid and stale PVForecast timestamps", async () => {
		const stateId =
			STRATEGY_INTEGRATION_CONTRACT.pvForecast.lastUpdated.stateId;

		const invalidStates = validStates();
		invalidStates[stateId] = {
			...invalidStates[stateId],
			val: "not-a-timestamp",
		};

		const invalidResolution = await resolveStrategyStates(
			reader(invalidStates),
			undefined,
			{ now: NOW },
		);

		expect(invalidResolution.pvForecast.lastUpdated.reason).to.equal(
			"invalid-timestamp",
		);

		const staleStates = validStates();
		staleStates[stateId] = {
			...staleStates[stateId],
			val: NOW - 2 * 60 * 60 * 1000,
		};

		const staleResolution = await resolveStrategyStates(
			reader(staleStates),
			undefined,
			{
				now: NOW,
				maximumTimestampAgeMs: 60 * 60 * 1000,
			},
		);

		expect(staleResolution.pvForecast.lastUpdated.reason).to.equal(
			"stale",
		);
	});

	it("uses state IDs supplied through a custom contract", async () => {
		const original = STRATEGY_INTEGRATION_CONTRACT;
		const customSocId = "custom.0.storage.soc";
		const customContract: StrategyIntegrationContract = {
			...original,
			modbus: {
				...original.modbus,
				stateOfCharge: {
					...original.modbus.stateOfCharge,
					stateId: customSocId,
				},
			},
		};

		const states = validStates();
		const originalSocId = original.modbus.stateOfCharge.stateId;

		states[customSocId] = states[originalSocId];
		delete states[originalSocId];

		const customReader: StrategyStateReader = {
			async getForeignObjectAsync(id) {
				return id === customSocId || allStateIds(customContract).includes(id)
					? ({
						_id: id,
						type: "state",
						common: {},
						native: {},
					} as ioBroker.StateObject)
					: null;
			},
			async getForeignStateAsync(id) {
				return states[id] ?? null;
			},
		};

		const resolution = await resolveStrategyStates(
			customReader,
			customContract,
			{ now: NOW },
		);

		expect(resolution.modbus.stateOfCharge.available).to.equal(true);
		expect(resolution.modbus.stateOfCharge.stateId).to.equal(customSocId);
	});
});
