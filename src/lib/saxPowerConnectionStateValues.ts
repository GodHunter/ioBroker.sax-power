import type {
	SaxPowerConnectionResult,
} from "./saxPowerConnectionResult";

export interface SaxPowerConnectionStateValues {
connection: boolean;
connectionState: string;
lastError: string;
lastHttpStatus: number;
}

export function createConnectionStateValues(
	result: SaxPowerConnectionResult,
): SaxPowerConnectionStateValues {
	return {
		connection: result.connected,
		connectionState: result.state,
		lastError: result.message,
		lastHttpStatus: result.httpStatus ?? 0,
	};
}
