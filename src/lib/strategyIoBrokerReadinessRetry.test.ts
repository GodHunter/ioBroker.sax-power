import { expect } from "chai";

import { createStrategyReadinessRetry } from "./strategyIoBrokerReadinessRetry";

describe("strategy ioBroker readiness retry", () => {
	it("runs one scheduled readiness retry", async () => {
		let callback: (() => void | Promise<void>) | undefined;
		let retries = 0;
		const retry = createStrategyReadinessRetry(
			{
				setTimeout(next) {
					callback = next;
					return 1 as unknown as ioBroker.Timeout;
				},
				clearTimeout() {
					throw new Error("unexpected clear");
				},
			},
			30_000,
			async () => {
				retries += 1;
			},
			() => undefined,
		);

		expect(retry).not.to.equal(null);
		retry?.schedule();
		retry?.schedule();
		expect(callback).not.to.equal(undefined);
		await callback?.();
		expect(retries).to.equal(1);
	});

	it("cancels a pending retry during unload", async () => {
		let callback: (() => void | Promise<void>) | undefined;
		let cleared = 0;
		let retries = 0;
		const retry = createStrategyReadinessRetry(
			{
				setTimeout(next) {
					callback = next;
					return 1 as unknown as ioBroker.Timeout;
				},
				clearTimeout() {
					cleared += 1;
				},
			},
			30_000,
			async () => {
				retries += 1;
			},
			() => undefined,
		);

		retry?.schedule();
		retry?.stop();
		await callback?.();

		expect(cleared).to.equal(1);
		expect(retries).to.equal(0);
	});

	it("reports retry failures without creating an unhandled rejection", async () => {
		const callbacks: Array<() => void | Promise<void>> = [];
		let reported: unknown;
		const failure = new Error("readiness failed");
		const retry = createStrategyReadinessRetry(
			{
				setTimeout(next) {
					callbacks.push(next);
					return 1 as unknown as ioBroker.Timeout;
				},
				clearTimeout() {
					return undefined;
				},
			},
			30_000,
			async () => {
				throw failure;
			},
			error => {
				reported = error;
			},
		);

		retry?.schedule();
		await callbacks[0]?.();
		expect(reported).to.equal(failure);
		expect(callbacks).to.have.length(2);
	});

	it("rejects invalid retry intervals", () => {
		const adapter = {
			setTimeout: () => 1 as unknown as ioBroker.Timeout,
			clearTimeout: () => undefined,
		};

		for (const interval of [0, -1, Number.NaN]) {
			expect(createStrategyReadinessRetry(
				adapter,
				interval,
				async () => undefined,
				() => undefined,
			)).to.equal(null);
		}
	});
});
