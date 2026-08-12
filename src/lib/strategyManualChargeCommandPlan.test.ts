import { expect } from "chai";
import type { StrategyStateContract } from "./strategyIntegrationContract";
import {
	createStrategyManualChargeCommandPlan,
} from "./strategyManualChargeCommandPlan";
import type { StrategyManualChargeControl } from "./strategyManualChargeControl";

const CREATED_AT = 1_800_000;

function control(
	targetChargePowerW = 1_800,
	reason: StrategyManualChargeControl["reason"] =
	"apply-manual-charge-target",
): StrategyManualChargeControl {
	return {
		createdAt: CREATED_AT,
		operatingMode: "manual-charge",
		automaticStrategyAllowed: false,
		requestedChargePowerW: targetChargePowerW,
		targetChargePowerW,
		reason,
		safetyEnvelope: {
			createdAt: CREATED_AT,
			maximumChargePowerW: 2_500,
			availableChargeEnergyWh: 2_000,
		} as StrategyManualChargeControl["safetyEnvelope"],
	};
}

function contract(
	overrides: Partial<StrategyStateContract> = {},
): StrategyStateContract {
	return {
		stateId: "modbus.1.holdingRegisters.44_Leistungsgrenzwert_für_Ladung",
		register: 44,
		unit: "W",
		access: "command",
		confirmation: "transient-command",
		...overrides,
	};
}

describe("strategy manual charge command plan", () => {
	it("plans the validated manual charge target for register 44", () => {
		const result = createStrategyManualChargeCommandPlan(control());

		expect(result).to.deep.include({
			createdAt: CREATED_AT,
			register: 44,
			valueW: 1_800,
			unit: "W",
			confirmation: "transient-command",
			reason: "apply-manual-charge-target",
		});
	});

	it("plans an explicit zero-watt stop while manual mode remains active", () => {
		const result = createStrategyManualChargeCommandPlan(
			control(0, "requested-charge-power-zero"),
		);

		expect(result).to.deep.include({
			valueW: 0,
			reason: "apply-manual-charge-stop",
		});
	});

	it("does not write a zero target when automatic mode owns control", () => {
		const automatic = {
			...control(0),
			operatingMode: "automatic",
			automaticStrategyAllowed: true,
			reason: "manual-mode-disabled",
		} as StrategyManualChargeControl;

		expect(createStrategyManualChargeCommandPlan(automatic)).to.equal(null);
	});

	it("accepts a safety-limited target and preserves a valid state id", () => {
		const limited = {
			...control(2_500),
			requestedChargePowerW: 4_000,
			reason: "limit-manual-charge-target",
		} as StrategyManualChargeControl;
		const result = createStrategyManualChargeCommandPlan(
			limited,
			contract({ stateId: "modbus.2.command.44" }),
		);

		expect(result?.stateId).to.equal("modbus.2.command.44");
		expect(result?.valueW).to.equal(2_500);
	});

	it("fails closed for inconsistent control data", () => {
		for (const invalid of [
			{ ...control(), targetChargePowerW: 2_600 },
			{ ...control(), automaticStrategyAllowed: true },
			{ ...control(), createdAt: CREATED_AT + 1 },
			{ ...control(), reason: "requested-charge-power-zero" },
		]) {
			expect(createStrategyManualChargeCommandPlan(
				invalid as StrategyManualChargeControl,
			)).to.equal(null);
		}
	});

	it("fails closed for an unsuitable command contract", () => {
		for (const invalidContract of [
			contract({ stateId: " " }),
			contract({ register: undefined }),
			contract({ unit: "%" }),
			contract({ access: "observation" }),
			contract({ confirmation: "state-value" }),
		]) {
			expect(createStrategyManualChargeCommandPlan(
				control(),
				invalidContract,
			)).to.equal(null);
		}
	});
});
