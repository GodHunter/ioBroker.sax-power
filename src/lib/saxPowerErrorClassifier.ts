import {
	SaxPowerApiError,
} from "./saxPowerApiClient";

import {
	SaxPowerConnectionState,
} from "./saxPowerConnectionState";

import type {
	SaxPowerConnectionResult,
} from "./saxPowerConnectionResult";

const AUTHENTICATION_MESSAGE =
"Authentication to the SAX Power Cloud failed. Please verify the username and password. After upgrading from an older adapter version, enter the password again and save the configuration.";

export class SaxPowerErrorClassifier {
	public static connected(): SaxPowerConnectionResult {
		return {
			connected: true,
			state: SaxPowerConnectionState.Connected,
			message: "",
		};
	}

	public static connecting(): SaxPowerConnectionResult {
		return {
			connected: false,
			state: SaxPowerConnectionState.Connecting,
			message: "",
		};
	}

	public static configurationError(
		message: string,
	): SaxPowerConnectionResult {
		return {
			connected: false,
			state: SaxPowerConnectionState.ConfigurationError,
			message,
		};
	}

	public static classify(
		error: unknown,
	): SaxPowerConnectionResult {
		if (error instanceof SaxPowerApiError) {
			return this.classifyApiError(error);
		}

		if (error instanceof Error) {
			if (this.isTimeoutError(error)) {
				return {
					connected: false,
					state: SaxPowerConnectionState.Timeout,
					message:
"The connection to the SAX Power Cloud timed out.",
				};
			}

			return {
				connected: false,
				state: SaxPowerConnectionState.UnknownError,
				message:
error.message ||
"An unknown SAX Power adapter error occurred.",
			};
		}

		return {
			connected: false,
			state: SaxPowerConnectionState.UnknownError,
			message:
"An unknown SAX Power adapter error occurred.",
		};
	}

	private static classifyApiError(
		error: SaxPowerApiError,
	): SaxPowerConnectionResult {
		const statusCode = error.statusCode;

		if (statusCode === 401) {
			return {
				connected: false,
				state:
SaxPowerConnectionState.AuthenticationFailed,
				message: AUTHENTICATION_MESSAGE,
				httpStatus: statusCode,
			};
		}

		if (statusCode === 403) {
			return {
				connected: false,
				state: SaxPowerConnectionState.Unauthorized,
				message:
"The SAX Power Cloud rejected access to the requested resource.",
				httpStatus: statusCode,
			};
		}

		if (
			statusCode !== undefined &&
statusCode >= 500
		) {
			return {
				connected: false,
				state: SaxPowerConnectionState.ServerError,
				message:
`The SAX Power Cloud returned server error HTTP ${statusCode}.`,
				httpStatus: statusCode,
			};
		}

		if (this.isInvalidResponseError(error)) {
			return {
				connected: false,
				state: SaxPowerConnectionState.InvalidResponse,
				message:
"The SAX Power Cloud returned an invalid response.",
				httpStatus: statusCode,
			};
		}

		if (this.isTimeoutError(error)) {
			return {
				connected: false,
				state: SaxPowerConnectionState.Timeout,
				message:
"The connection to the SAX Power Cloud timed out.",
				httpStatus: statusCode,
			};
		}

		if (statusCode !== undefined) {
			return {
				connected: false,
				state: SaxPowerConnectionState.NetworkError,
				message:
`The SAX Power Cloud request failed with HTTP ${statusCode}.`,
				httpStatus: statusCode,
			};
		}

		return {
			connected: false,
			state: SaxPowerConnectionState.NetworkError,
			message:
"Unable to reach the SAX Power Cloud. Please check the network connection.",
		};
	}

	private static isTimeoutError(
		error: Error,
	): boolean {
		const message = error.message.toLowerCase();

		return (
			error.name === "AbortError" ||
error.name === "TimeoutError" ||
message.includes("timed out") ||
message.includes("timeout")
		);
	}

	private static isInvalidResponseError(
		error: SaxPowerApiError,
	): boolean {
		const message = error.message.toLowerCase();

		return (
			message.includes("invalid json") ||
message.includes("did not contain an access token") ||
message.includes("invalid response")
		);
	}
}
