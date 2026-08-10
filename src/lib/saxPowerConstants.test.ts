import {
	strict as assert,
} from "node:assert";

import {
	URL,
} from "node:url";

import {
	SAX_POWER_API_URL,
} from "./saxPowerConstants";

describe("SAX Power constants", () => {
	it("uses the fixed HTTPS dashboard API endpoint", () => {
		const url = new URL(SAX_POWER_API_URL);

		assert.equal(url.protocol, "https:");
		assert.equal(
			url.hostname,
			"webserver.sax-power.net",
		);
	});
});
