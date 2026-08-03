export interface SaxPowerNativeConfig {
apiUrl: string;
username: string;
password: string;
pollInterval: number;

/*
 * Retained for backwards compatibility with pre-1.0
 * development instances. They are not shown in V1.0.
 */
modbusControlEnabled?: boolean;
modbusInstance?: string;
modbusChargePowerStateId?: string;
modbusDischargePowerStateId?: string;
}

export interface AdapterRuntimeStatus {
connection: boolean | null;
lastError: string;
lastUpdate: string;
deviceCount: number | null;
}

export type AdminTab =
| "cloud"
| "support";
