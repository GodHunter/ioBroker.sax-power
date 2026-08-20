import { strict as assert } from "node:assert";

import {
	isValidPollIntervalSeconds,
	MAX_POLL_INTERVAL_SECONDS,
	MIN_POLL_INTERVAL_SECONDS,
} from "./pollInterval";

describe("poll interval validation", () => {
	it("accepts the supported boundaries", () => {
		assert.equal(isValidPollIntervalSeconds(MIN_POLL_INTERVAL_SECONDS), true);
		assert.equal(isValidPollIntervalSeconds(MAX_POLL_INTERVAL_SECONDS), true);
	});

	it("rejects values that could overflow the Node.js timeout", () => {
		assert.equal(isValidPollIntervalSeconds(MAX_POLL_INTERVAL_SECONDS + 1), false);
		assert.equal(isValidPollIntervalSeconds(Number.MAX_SAFE_INTEGER), false);
	});

	it("rejects values below the minimum and non-finite values", () => {
		assert.equal(isValidPollIntervalSeconds(MIN_POLL_INTERVAL_SECONDS - 1), false);
		assert.equal(isValidPollIntervalSeconds(Number.NaN), false);
		assert.equal(isValidPollIntervalSeconds(Number.POSITIVE_INFINITY), false);
	});
});
