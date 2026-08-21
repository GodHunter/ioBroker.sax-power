export interface SaxPowerNativeConfig {
username: string;
password: string;
pollInterval: number;
batteryModels?: Record<string, string>;

strategyEnabled?: boolean;
strategyModbusInstance?: unknown;
strategyPvForecastInstance?: unknown;
strategyBatteryModelId?: unknown;
strategyMinimumStateOfChargePercent?: unknown;
strategyMaximumStateOfChargePercent?: unknown;
strategyMaximumChargePowerW?: unknown;
strategyMaximumDischargePowerW?: unknown;
strategyPvForecastReserveWh?: unknown;
strategyMaximumForecastAgeMs?: unknown;
strategyRequestedDischargePowerW?: unknown;
strategyIntervalMs?: unknown;
strategyChargingControlEnabled?: boolean;
strategyDayAvailabilityEnabled?: boolean;
strategyNightDischargeEnabled?: boolean;
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

export type StrategyRuntimeState =
| "disabled"
| "invalid-configuration"
| "waiting-for-inputs"
| "starting"
| "running"
| "error"
| "unknown";

export interface ModbusInstanceOption {
value: string;
label: string;
}

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
strategyState: StrategyRuntimeState;
strategyDetail: string;

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
