export interface SaxPowerNativeConfig {
apiUrl: string;
username: string;
password: string;
pollInterval: number;

/*
 * Retained only for compatibility with development instances.
 * Modbus control is intentionally not exposed in V1.0.
 */
modbusControlEnabled?: boolean;
modbusInstance?: string;
modbusChargePowerStateId?: string;
modbusDischargePowerStateId?: string;
}

export type SaxPowerConnectionState =
| "connecting"
| "connected"
| "authentication_failed"
| "unauthorized"
| "network_error"
| "timeout"
| "server_error"
| "invalid_response"
| "configuration_error"
| "unknown_error";

export interface AdapterRuntimeStatus {
connection: boolean | null;
	connectionState: SaxPowerConnectionState | "unknown";
	lastHttpStatus: number;
lastError: string;
lastUpdate: string;
deviceCount: number | null;
statisticsSource: string;
firstMeasurement: string;
statisticsLastUpdate: string;

pvPower: number | null;
houseConsumptionPower: number | null;
gridPower: number | null;
gridDirection: string;
batteryPower: number | null;
batteryDirection: string;
soc: number | null;
liveLastUpdate: string;

}

export type AdminTab =
| "cloud"
| "status"
| "support";
