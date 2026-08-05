import type {
	SaxPowerConnectionState,
} from "./saxPowerConnectionState";

export interface SaxPowerConnectionResult {
connected: boolean;
state: SaxPowerConnectionState;
message: string;
httpStatus?: number;
}
