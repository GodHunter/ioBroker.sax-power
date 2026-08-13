export interface SaxPowerNativeConfig {
username: string;
password: string;
pollInterval: number;
batteryModels?: Record<string, string>;

strategyEnabled?: boolean;
strategyBatteryModelId?: unknown;
strategyMinimumStateOfChargePercent?: unknown;
strategyMaximumStateOfChargePercent?: unknown;
strategyMaximumChargePowerW?: unknown;
strategyMaximumDischargePowerW?: unknown;
strategyPvForecastReserveWh?: unknown;
strategyMaximumForecastAgeMs?: unknown;
strategyRequestedDischargePowerW?: unknown;
strategyIntervalMs?: unknown;

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

batteries: BatteryRuntimeStatus[];
aggregateBattery: BatteryAggregateRuntimeStatus;

}

export interface BatteryRuntimeStatus {
serialNumber: string;
model: string;
reportedCycles: number | null;
dayCycles: number | null;
monthCycles: number | null;
yearCycles: number | null;
totalCycles: number | null;
healthStatus: string;
healthValue: number | null;
validRuns: number;
requiredRuns: number;
rejectedRuns: number;
activeRun: string;
activeRunDirection: string;
activeRunSocStart: number | null;
activeRunSocCurrent: number | null;
activeRunEnergy: number | null;
dataCollectionStartedAt: string;
lastEvaluation: string;
}

export interface BatteryAggregateRuntimeStatus {
deviceCount: number | null;
dayCycles: number | null;
monthCycles: number | null;
yearCycles: number | null;
totalCycles: number | null;
healthStatus: string;
healthValue: number | null;
validRuns: number;
requiredRuns: number;
rejectedRuns: number;
}

export type AdminTab =
| "login"
| "settings"
| "status"
| "support";
