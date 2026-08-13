import { expect } from "chai";
import type { StrategyCommandWriter } from "./strategyCommandWriter";
import {
	executeStrategyManualChargeCommand,
} from "./strategyManualChargeCommandExecutor";
import {
	createStrategyManualChargeCommandPlan,
	type StrategyManualChargeCommandPlan,
} from "./strategyManualChargeCommandPlan";
import type { StrategyManualChargeControl } from "./strategyManualChargeControl";

function commandPlan(targetChargePowerW = 1_800): StrategyManualChargeCommandPlan {
	const reason = targetChargePowerW === 0
		? "requested-charge-power-zero" as const
		: "apply-manual-charge-target" as const;
	const control = {
		createdAt: 1_800_000,
		operatingMode: "manual-charge",
		automaticStrategyAllowed: false,
		requestedChargePowerW: targetChargePowerW,
		targetChargePowerW,
		reason,
		safetyEnvelope: {
			createdAt: 1_800_000,
			maximumChargePowerW: 2_500,
			availableChargeEnergyWh: 2_000,
		},
	} as StrategyManualChargeControl;
	const result = createStrategyManualChargeCommandPlan(control);

	if (result === null) throw new Error("expected a valid command plan");
	return result;
}

function writer() {
	const writes: Array<{ stateId: string; value: number; acknowledged: false }> = [];
	const commandWriter: StrategyCommandWriter = {
		async setForeignState(stateId, value, acknowledged) {
			writes.push({ stateId, value, acknowledged });
		},
	};
	return { commandWriter, writes };
}

describe("strategy manual charge command executor", () => {
	it("writes the validated target to register 44 as a transient command", async () => {
		const { commandWriter, writes } = writer();
		const plan = commandPlan();
		const result = await executeStrategyManualChargeCommand(commandWriter, plan);

		expect(writes).to.deep.equal([{
			stateId: "modbus.1.holdingRegisters.44_Leistungsgrenzwert_für_Ladung",
			value: 1_800,
			acknowledged: false,
		}]);
		expect(result).to.deep.include({
			register: 44,
			valueW: 1_800,
			acknowledged: false,
			reason: "apply-manual-charge-target",
		});
		expect(result?.commandPlan).to.equal(plan);
	});

	it("writes an explicit zero-watt manual stop", async () => {
		const { commandWriter, writes } = writer();
		const result = await executeStrategyManualChargeCommand(
			commandWriter,
			commandPlan(0),
		);

		expect(writes[0]?.value).to.equal(0);
		expect(result?.reason).to.equal("apply-manual-charge-stop");
	});

	it("fails closed without writing a manipulated plan", async () => {
		for (const manipulated of [
			{ ...commandPlan(), valueW: 1_801 },
			{ ...commandPlan(), stateId: "modbus.2.command.44" },
			{ ...commandPlan(), register: 43 },
			{ ...commandPlan(), reason: "apply-manual-charge-stop" },
		] as StrategyManualChargeCommandPlan[]) {
			const { commandWriter, writes } = writer();
			expect(await executeStrategyManualChargeCommand(
				commandWriter,
				manipulated,
			)).to.equal(null);
			expect(writes).to.deep.equal([]);
		}
	});

	it("propagates writer failures", async () => {
		const expectedError = new Error("modbus write failed");
		const commandWriter: StrategyCommandWriter = {
			async setForeignState() { throw expectedError; },
		};
		let actualError: unknown;

		try {
			await executeStrategyManualChargeCommand(
				commandWriter,
				commandPlan(),
			);
		} catch (error) {
			actualError = error;
		}

		expect(actualError).to.equal(expectedError);
	});
});
