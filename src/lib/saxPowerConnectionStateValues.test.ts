import { expect } from "chai";

import {
	SaxPowerConnectionState,
} from "./saxPowerConnectionState";

import {
	createConnectionStateValues,
} from "./saxPowerConnectionStateValues";

describe("createConnectionStateValues", () => {
	it("maps a connected result", () => {
		const values = createConnectionStateValues({
			connected: true,
			state: SaxPowerConnectionState.Connected,
			message: "",
		});

		expect(values).to.deep.equal({
			connection: true,
			connectionState: "connected",
			lastError: "",
			lastHttpStatus: 0,
		});
	});

	it("maps an authentication error with HTTP status", () => {
		const values = createConnectionStateValues({
			connected: false,
			state:
SaxPowerConnectionState.AuthenticationFailed,
			message: "Authentication failed.",
			httpStatus: 401,
		});

		expect(values).to.deep.equal({
			connection: false,
			connectionState: "authentication_failed",
			lastError: "Authentication failed.",
			lastHttpStatus: 401,
		});
	});

	it("uses zero when no HTTP status exists", () => {
		const values = createConnectionStateValues({
			connected: false,
			state: SaxPowerConnectionState.Timeout,
			message: "Timed out.",
		});

		expect(values.lastHttpStatus).to.equal(0);
	});
});
