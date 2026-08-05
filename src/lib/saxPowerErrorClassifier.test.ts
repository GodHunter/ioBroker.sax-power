import { expect } from "chai";

import {
	SaxPowerApiError,
} from "./saxPowerApiClient";

import {
	SaxPowerConnectionState,
} from "./saxPowerConnectionState";

import {
	SaxPowerErrorClassifier,
} from "./saxPowerErrorClassifier";

describe("SaxPowerErrorClassifier", () => {
	it("creates a connected result", () => {
		const result =
SaxPowerErrorClassifier.connected();

		expect(result).to.deep.equal({
			connected: true,
			state: SaxPowerConnectionState.Connected,
			message: "",
		});
	});

	it("creates a connecting result", () => {
		const result =
SaxPowerErrorClassifier.connecting();

		expect(result).to.deep.equal({
			connected: false,
			state: SaxPowerConnectionState.Connecting,
			message: "",
		});
	});

	it("classifies HTTP 401 as authentication failure", () => {
		const result = SaxPowerErrorClassifier.classify(
			new SaxPowerApiError(
				"Request failed.",
				{
					statusCode: 401,
				},
			),
		);

		expect(result.connected).to.equal(false);
		expect(result.state).to.equal(
			SaxPowerConnectionState.AuthenticationFailed,
		);
		expect(result.httpStatus).to.equal(401);
		expect(result.message).to.contain(
			"enter the password again",
		);
	});

	it("classifies HTTP 403 as unauthorized", () => {
		const result = SaxPowerErrorClassifier.classify(
			new SaxPowerApiError(
				"Request failed.",
				{
					statusCode: 403,
				},
			),
		);

		expect(result.state).to.equal(
			SaxPowerConnectionState.Unauthorized,
		);
		expect(result.httpStatus).to.equal(403);
	});

	it("classifies HTTP 500 as server error", () => {
		const result = SaxPowerErrorClassifier.classify(
			new SaxPowerApiError(
				"Request failed.",
				{
					statusCode: 500,
				},
			),
		);

		expect(result.state).to.equal(
			SaxPowerConnectionState.ServerError,
		);
		expect(result.httpStatus).to.equal(500);
		expect(result.message).to.contain("HTTP 500");
	});

	it("classifies API timeout errors", () => {
		const result = SaxPowerErrorClassifier.classify(
			new SaxPowerApiError(
				"SAX Power API request timed out after 30000 ms.",
				{
					cause: new Error("timeout"),
				},
			),
		);

		expect(result.state).to.equal(
			SaxPowerConnectionState.Timeout,
		);
	});

	it("classifies invalid JSON responses", () => {
		const result = SaxPowerErrorClassifier.classify(
			new SaxPowerApiError(
				"The SAX Power API returned invalid JSON.",
				{
					statusCode: 200,
					responseBody: "<html>",
				},
			),
		);

		expect(result.state).to.equal(
			SaxPowerConnectionState.InvalidResponse,
		);
		expect(result.httpStatus).to.equal(200);
	});

	it("classifies missing access tokens as invalid responses", () => {
		const result = SaxPowerErrorClassifier.classify(
			new SaxPowerApiError(
				"The SAX Power login response did not contain an access token.",
			),
		);

		expect(result.state).to.equal(
			SaxPowerConnectionState.InvalidResponse,
		);
	});

	it("classifies communication errors as network errors", () => {
		const result = SaxPowerErrorClassifier.classify(
			new SaxPowerApiError(
				"Unable to communicate with the SAX Power API.",
				{
					cause: new Error("getaddrinfo ENOTFOUND"),
				},
			),
		);

		expect(result.state).to.equal(
			SaxPowerConnectionState.NetworkError,
		);
	});

	it("classifies unknown errors", () => {
		const result =
SaxPowerErrorClassifier.classify(
	new Error("Unexpected failure"),
);

		expect(result.state).to.equal(
			SaxPowerConnectionState.UnknownError,
		);
		expect(result.message).to.equal(
			"Unexpected failure",
		);
	});

	it("classifies non-error values safely", () => {
		const result =
SaxPowerErrorClassifier.classify(
	"unexpected",
);

		expect(result.state).to.equal(
			SaxPowerConnectionState.UnknownError,
		);
		expect(result.message).to.equal(
			"An unknown SAX Power adapter error occurred.",
		);
	});
});
