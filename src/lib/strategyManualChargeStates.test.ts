import { expect } from "chai";
import {
	ensureStrategyManualChargeIoBrokerStates,
	publishStrategyManualChargeStatus,
	readStrategyManualChargeInput,
	STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS,
	STRATEGY_MANUAL_CHARGE_STATE_IDS,
} from "./strategyManualChargeStates";
import type { StrategyManualChargeControl } from "./strategyManualChargeControl";

function adapterWithStates(states: Record<string, ioBroker.State | null> = {}) {
	const objects: Array<{ id: string; object: ioBroker.PartialObject }> = [];
	const writes: Array<{ id: string; state: ioBroker.SettableState }> = [];

	return {
		objects,
		writes,
		adapter: {
			async extendObjectAsync(id: string, object: ioBroker.PartialObject) {
				objects.push({ id, object });
			},
			async getStateAsync(id: string) {
				return states[id];
			},
			async setStateAsync(id: string, state: ioBroker.SettableState) {
				writes.push({ id, state });
			},
		},
	};
}

describe("strategy manual charge ioBroker states", () => {
	it("defines two writable inputs and four read-only status states", async () => {
		const runtime = adapterWithStates();

		await ensureStrategyManualChargeIoBrokerStates(runtime.adapter);

		expect(runtime.objects.map(({ id }) => id)).to.deep.equal([
			"strategy",
			"strategy.manualCharge",
			"strategy.status",
			...STRATEGY_MANUAL_CHARGE_STATE_DEFINITIONS.map(({ id }) => id),
		]);
		const states = runtime.objects.slice(3).map(
			({ object }) => object.common as ioBroker.StateCommon,
		);
		expect(states.filter(common => common?.write)).to.have.length(2);
		expect(states.filter(common => !common?.write)).to.have.length(4);
		expect(states.every(common => common?.read === true)).to.equal(true);
	});

	it("reads the manual mode and requested charge power without coercion", async () => {
		const runtime = adapterWithStates({
			[STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled]: {
				val: true, ack: false, ts: 1, lc: 1, from: "system.adapter.admin.0",
			},
			[STRATEGY_MANUAL_CHARGE_STATE_IDS.requestedChargePowerW]: {
				val: 1_800, ack: false, ts: 1, lc: 1, from: "system.adapter.admin.0",
			},
		});

		const input = await readStrategyManualChargeInput(runtime.adapter);

		expect(input).to.deep.equal({
			enabled: true,
			requestedChargePowerW: 1_800,
		});
		expect(Object.isFrozen(input)).to.equal(true);
	});

	it("fails closed for missing, coerced or invalid input values", async () => {
		for (const states of [
			{},
			{
				[STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled]: { val: "true" },
				[STRATEGY_MANUAL_CHARGE_STATE_IDS.requestedChargePowerW]: { val: 1_800 },
			},
			{
				[STRATEGY_MANUAL_CHARGE_STATE_IDS.enabled]: { val: true },
				[STRATEGY_MANUAL_CHARGE_STATE_IDS.requestedChargePowerW]: { val: -1 },
			},
		]) {
			const runtime = adapterWithStates(states as Record<string, ioBroker.State>);
			expect(await readStrategyManualChargeInput(runtime.adapter)).to.equal(null);
		}
	});

	it("publishes the selected mode, target and reason as acknowledged status", async () => {
		const runtime = adapterWithStates();
		const control = {
			operatingMode: "manual-charge",
			automaticStrategyAllowed: false,
			targetChargePowerW: 1_800,
			reason: "apply-manual-charge-target",
		} as StrategyManualChargeControl;

		await publishStrategyManualChargeStatus(runtime.adapter, control);

		expect(runtime.writes).to.have.deep.members([
			{
				id: STRATEGY_MANUAL_CHARGE_STATE_IDS.operatingMode,
				state: { val: "manual-charge", ack: true },
			},
			{
				id: STRATEGY_MANUAL_CHARGE_STATE_IDS.automaticStrategyAllowed,
				state: { val: false, ack: true },
			},
			{
				id: STRATEGY_MANUAL_CHARGE_STATE_IDS.targetChargePowerW,
				state: { val: 1_800, ack: true },
			},
			{
				id: STRATEGY_MANUAL_CHARGE_STATE_IDS.decisionReason,
				state: { val: "apply-manual-charge-target", ack: true },
			},
		]);
		expect(runtime.writes).to.have.length(4);
	});

	it("keeps adapter read and write failures visible", async () => {
		const readFailure = new Error("read failed");
		const writeFailure = new Error("write failed");

		await expect(readStrategyManualChargeInput({
			...adapterWithStates().adapter,
			async getStateAsync() { throw readFailure; },
		})).to.be.rejectedWith(readFailure);

		await expect(publishStrategyManualChargeStatus({
			...adapterWithStates().adapter,
			async setStateAsync() { throw writeFailure; },
		}, {
			operatingMode: "automatic",
			automaticStrategyAllowed: true,
			targetChargePowerW: 0,
			reason: "manual-mode-disabled",
		} as StrategyManualChargeControl)).to.be.rejectedWith(writeFailure);
	});
});
