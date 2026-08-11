import { expect } from "chai";
import type { StrategyDayDischargeEvaluation } from "./strategyDayDischargeEvaluation";
import { createStrategyDayDischargeCommandPlan } from "./strategyDayDischargeCommandPlan";
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

function contract(
	overrides: Partial<StrategyStateContract> = {},
): StrategyStateContract {
	return {
		stateId:
			"modbus.1.holdingRegisters.43_Leistungsgrenzwert_für_Entladung",
		register: 43,
		unit: "W",
		access: "command",
		confirmation: "transient-command",
		...overrides,
	};
}

describe("strategy day discharge command plan", () => {
	it("plans the evaluated discharge target for register 43", () => {
		const result = createStrategyDayDischargeCommandPlan(evaluation());

		expect(result).to.deep.include({
			createdAt: CREATED_AT,
			register: 43,
			valueW: 2_000,
			unit: "W",
			confirmation: "transient-command",
			reason: "apply-discharge-target",
		});
	});

	it("plans an explicit safe stop for a zero target", () => {
		const result = createStrategyDayDischargeCommandPlan(evaluation(0));

		expect(result).to.deep.include({
			valueW: 0,
			reason: "apply-safe-stop",
		});
	});

	it("preserves the configured transient command state id", () => {
		const commandContract = contract({ stateId: "modbus.2.command.43" });
		const result = createStrategyDayDischargeCommandPlan(
			evaluation(),
			commandContract,
		);

		expect(result?.stateId).to.equal("modbus.2.command.43");
	});

	it("fails closed for an invalid target", () => {
		expect(createStrategyDayDischargeCommandPlan(
			evaluation(Number.NaN),
		)).to.equal(null);
		expect(createStrategyDayDischargeCommandPlan(
			evaluation(-1),
		)).to.equal(null);
	});

	it("fails closed when evaluation timestamps differ", () => {
		const input = evaluation();

		expect(createStrategyDayDischargeCommandPlan({
			...input,
			createdAt: CREATED_AT + 1,
		})).to.equal(null);
	});

	it("fails closed when the gate does not reference its evaluation inputs", () => {
		const input = evaluation();

		expect(createStrategyDayDischargeCommandPlan({
			...input,
			windowGate: {
				...input.windowGate,
				decision: { ...input.decision },
			},
		})).to.equal(null);
	});

	it("fails closed for a non-command state contract", () => {
		expect(createStrategyDayDischargeCommandPlan(
			evaluation(),
			contract({ access: "observation" }),
		)).to.equal(null);
	});

	it("fails closed for an unsuitable command contract", () => {
		for (const invalidContract of [
			contract({ stateId: " " }),
			contract({ register: undefined }),
			contract({ unit: "%" }),
			contract({ confirmation: "state-value" }),
		]) {
			expect(createStrategyDayDischargeCommandPlan(
				evaluation(),
				invalidContract,
			)).to.equal(null);
		}
	});
});
