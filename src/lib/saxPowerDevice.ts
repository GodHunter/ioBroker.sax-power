export type GridDirection =
| "import"
| "export"
| "idle";

export type BatteryDirection =
| "charging"
| "discharging"
| "idle";

export interface SaxPowerDeviceInfo {
serialNumber: string;
sourceTimestamp: string;
receivedTimestamp: string;
phase: number | null;
lastOnlineFrom: number | null;
	reportedCycleCount: number | null;
}

export interface SaxPowerDeviceLiveData {
soc: number | null;
gridVoltage: number | null;

/**
 * Original SAX Power value.
 *
 * Negative values indicate grid export.
 * Positive values indicate grid import.
 */
gridPower: number | null;

gridImportPower: number;
gridExportPower: number;
gridDirection: GridDirection;

/**
 * Original SAX Power value.
 *
 * Negative values indicate battery charging.
 * Positive values indicate battery discharging.
 */
batteryPower: number | null;

batteryChargePower: number;
batteryDischargePower: number;
batteryDirection: BatteryDirection;

pvPower: number | null;
}

export interface SaxPowerDeviceControl {
/**
 * Original SAX Power field charge_energy.
 *
 * Despite its API name, this value represents the currently
 * requested battery charging power in watts.
 */
targetChargePower: number | null;

/**
 * Original SAX Power field discharge_energy.
 *
 * Despite its API name, this value represents the currently
 * requested battery discharging power in watts.
 */
targetDischargePower: number | null;
}

export interface SaxPowerDeviceStatus {
connected: boolean;
on: boolean;
standby: boolean;
calibration: boolean;
hardwareError: boolean;
batteryError: boolean;
relayError: boolean;
naProtection: string;
batteryStatusCode: number | null;
}

export interface SaxPowerDeviceDiagnostics {
message1: unknown;
message2: unknown;
lastMessages: unknown;
raw: Record<string, unknown>;
}

export interface SaxPowerDevice {
info: SaxPowerDeviceInfo;
live: SaxPowerDeviceLiveData;
control: SaxPowerDeviceControl;
status: SaxPowerDeviceStatus;
diagnostics: SaxPowerDeviceDiagnostics;
}
