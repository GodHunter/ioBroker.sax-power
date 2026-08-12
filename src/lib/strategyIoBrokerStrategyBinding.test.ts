import { expect } from "chai";
import {
	createStrategyIoBrokerStrategyBinding,
} from "./strategyIoBrokerStrategyBinding";
import type { StrategyIoBrokerStrategyTimerAdapter } from "./strategyIoBrokerStrategyCycleScheduler";
import type { StrategyRuntimeConfigurationInput } from "./strategyRuntimeConfiguration";

function validInput(): StrategyRuntimeConfigurationInput {
	return {
		enabled: true,
		batteryModelId: "home-plus-7.7",
		minimumStateOfChargePercent: 20,
		maximumStateOfChargePercent: 90,
		maximumChargePowerW: 3_500,
		maximumDischargePowerW: 3_000,
		pvForecastReserveWh: 500,
		maximumForecastAgeMs: 3_600_000,
		requestedDischargePowerW: 2_000,
		intervalMs: 30_000,
	};
}

function recordingAdapter() {
	const objects: string[] = [];
	const timers: number[] = [];
	const cleared: ioBroker.Timeout[] = [];
	let nextHandle = 1;
	const adapter: StrategyIoBrokerStrategyTimerAdapter = {
		getAstroDate() {
			return new Date();
		},
		async extendObjectAsync(id) {
			objects.push(id);
		},
		async getStateAsync() {
			return null;
		},
		async setStateAsync() {},
		async getForeignObjectAsync() {
			return null;
		},
		async getForeignStateAsync() {
			return null;
		},
		async setForeignStateAsync() {},
		setTimeout(_callback, delay) {
			timers.push(delay);
			return nextHandle++ as unknown as ioBroker.Timeout;
		},
		clearTimeout(handle) {
			cleared.push(handle);
		},
	};
	return { adapter, objects, timers, cleared };
}

describe("strategy ioBroker binding", () => {
	it("returns a passive disabled binding without touching ioBroker", () => {
		const run = recordingAdapter();
		const result = createStrategyIoBrokerStrategyBinding(
			run.adapter,
			{ enabled: false } as StrategyRuntimeConfigurationInput,
			() => undefined,
		);

		expect(result).to.deep.include({
			status: "disabled",
			configuration: { enabled: false },
			issues: [],
			lifecycle: null,
		});
		expect(run.objects).to.deep.equal([]);
		expect(run.timers).to.deep.equal([]);
	});

	it("returns structured issues for an invalid enabled configuration", () => {
		const run = recordingAdapter();
		const result = createStrategyIoBrokerStrategyBinding(
			run.adapter,
			{ ...validInput(), intervalMs: 0 },
			() => undefined,
		);

		expect(result).to.deep.include({
			status: "invalid-configuration",
			configuration: null,
			issues: [{ field: "intervalMs", reason: "out-of-range" }],
			lifecycle: null,
		});
		expect(run.objects).to.deep.equal([]);
		expect(run.timers).to.deep.equal([]);
	});

	it("creates but does not start a lifecycle for valid input", () => {
		const run = recordingAdapter();
		const result = createStrategyIoBrokerStrategyBinding(
			run.adapter,
			validInput(),
			() => undefined,
		);

		expect(result.status).to.equal("ready");
		expect(result.lifecycle).not.to.equal(null);
		expect(run.objects).to.deep.equal([]);
		expect(run.timers).to.deep.equal([]);
	});

	it("starts and stops the prepared lifecycle through its boundary", async () => {
		const run = recordingAdapter();
		const result = createStrategyIoBrokerStrategyBinding(
			run.adapter,
			validInput(),
			() => undefined,
		);

		await result.lifecycle?.start();
		expect(run.objects).not.to.deep.equal([]);
		expect(run.timers).to.deep.equal([30_000]);
		result.lifecycle?.stop();
		expect(run.cleared).to.have.length(1);
	});

	it("preserves the validated configuration values", () => {
		const result = createStrategyIoBrokerStrategyBinding(
			recordingAdapter().adapter,
			validInput(),
			() => undefined,
		);

		expect(result.configuration).to.deep.include({
			enabled: true,
			maximumForecastAgeMs: 3_600_000,
			requestedDischargePowerW: 2_000,
			intervalMs: 30_000,
		});
	});

	it("returns immutable binding data", () => {
		for (const input of [
			{ enabled: false } as StrategyRuntimeConfigurationInput,
			{ ...validInput(), intervalMs: 0 },
			validInput(),
		]) {
			const result = createStrategyIoBrokerStrategyBinding(
				recordingAdapter().adapter,
				input,
				() => undefined,
			);
			expect(Object.isFrozen(result)).to.equal(true);
			expect(Object.isFrozen(result.issues)).to.equal(true);
		}
	});
});
