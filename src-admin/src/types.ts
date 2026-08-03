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

export interface AdapterRuntimeStatus {
connection: boolean | null;
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
