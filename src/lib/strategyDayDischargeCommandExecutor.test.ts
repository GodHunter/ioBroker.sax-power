import { expect } from "chai";
import type { StrategyDayDischargeEvaluation } from "./strategyDayDischargeEvaluation";
import {
	createStrategyDayDischargeCommandPlan,
	type StrategyDayDischargeCommandPlan,
} from "./strategyDayDischargeCommandPlan";
import {
	executeStrategyDayDischargeCommand,
	type StrategyCommandWriter,
} from "./strategyDayDischargeCommandExecutor";
import type { StrategyStateContract } from "./strategyIntegrationContract";

const CREATED_AT = 1_800_000;

function evaluation(targetDischargePowerW = 2_000): StrategyDayDischargeEvaluation {
	const decision = {
		createdAt: CREATED_AT,
	} as StrategyDayDischargeEvaluation["decision"];
	const daylightWindow = {
		evaluatedAt: CREATED_AT,
	} as StrategyDayDischargeEvaluation["daylightWindow"];

	return {
		createdAt: CREATED_AT,
		decision,
		daylightWindow,
		windowGate: {
			createdAt: CREATED_AT,
			decision,
			daylightWindow,
			targetDischargePowerW,
		},
	} as StrategyDayDischargeEvaluation;
}

function commandPlan(
	targetDischargePowerW = 2_000,
	commandContract?: StrategyStateContract,
): StrategyDayDischargeCommandPlan {
	const result = createStrategyDayDischargeCommandPlan(
		evaluation(targetDischargePowerW),
		commandContract,
	);

	if (result === null) {
		throw new Error("expected a valid command plan");
	}

	return result;
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

describe("strategy day discharge command executor", () => {
	it("executes the validated discharge target as an unacknowledged command", async () => {
		const { commandWriter, writes } = writer();
		const plan = commandPlan();
		const result = await executeStrategyDayDischargeCommand(
			commandWriter,
			plan,
		);

		expect(writes).to.deep.equal([{
			stateId:
				"modbus.1.holdingRegisters.43_Leistungsgrenzwert_für_Entladung",
			value: 2_000,
			acknowledged: false,
		}]);
		expect(result).to.deep.include({
			register: 43,
			valueW: 2_000,
			acknowledged: false,
			reason: "apply-discharge-target",
		});
		expect(result?.commandPlan).to.equal(plan);
	});

	it("executes an explicit zero-watt safe stop", async () => {
		const { commandWriter, writes } = writer();
		const result = await executeStrategyDayDischargeCommand(
			commandWriter,
			commandPlan(0),
		);

		expect(writes[0]?.value).to.equal(0);
		expect(result?.reason).to.equal("apply-safe-stop");
	});

	it("preserves an alternative valid command contract", async () => {
		const commandContract: StrategyStateContract = {
			stateId: "modbus.2.command.43",
			register: 43,
			unit: "W",
			access: "command",
			confirmation: "transient-command",
		};
		const { commandWriter, writes } = writer();
		const result = await executeStrategyDayDischargeCommand(
			commandWriter,
			commandPlan(1_500, commandContract),
			commandContract,
		);

		expect(writes[0]?.stateId).to.equal("modbus.2.command.43");
		expect(result?.valueW).to.equal(1_500);
	});

	it("fails closed without writing a manipulated command plan", async () => {
		for (const manipulatedPlan of [
			{ ...commandPlan(), valueW: 2_001 },
			{ ...commandPlan(), stateId: "modbus.2.command.43" },
			{ ...commandPlan(), register: 44 },
			{ ...commandPlan(), unit: "%" },
			{ ...commandPlan(), confirmation: "state-value" },
			{ ...commandPlan(), reason: "apply-safe-stop" },
		] as StrategyDayDischargeCommandPlan[]) {
			const { commandWriter, writes } = writer();

			expect(await executeStrategyDayDischargeCommand(
				commandWriter,
				manipulatedPlan,
			)).to.equal(null);
			expect(writes).to.deep.equal([]);
		}
	});

	it("fails closed when the expected command contract differs", async () => {
		const { commandWriter, writes } = writer();
		const otherContract: StrategyStateContract = {
			stateId: "modbus.2.command.43",
			register: 43,
			unit: "W",
			access: "command",
			confirmation: "transient-command",
		};

		expect(await executeStrategyDayDischargeCommand(
			commandWriter,
			commandPlan(),
			otherContract,
		)).to.equal(null);
		expect(writes).to.deep.equal([]);
	});

	it("propagates writer failures without returning an execution", async () => {
		const expectedError = new Error("modbus write failed");
		const commandWriter: StrategyCommandWriter = {
			async setForeignState() {
				throw expectedError;
			},
		};

		let actualError: unknown;
		try {
			await executeStrategyDayDischargeCommand(
				commandWriter,
				commandPlan(),
			);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});
});
