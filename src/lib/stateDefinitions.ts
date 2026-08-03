import type {
	SaxPowerDevice,
} from "./saxPowerDevice";

export type SaxPowerStateType =
| "boolean"
| "number"
| "string";

export interface SaxPowerStateDefinition {
id: string;
modelPath: string;
apiField?: string;
type: SaxPowerStateType;
role: string;
unit?: string;
name: string;
description: string;
category:
| "info"
| "live"
| "control"
| "status"
| "diagnostics";
read: true;
write: false;
value: (
device: SaxPowerDevice,
) => boolean | number | string | null;
}

export const saxPowerStateDefinitions:
readonly SaxPowerStateDefinition[] = [
	{
		id: "info.serialNumber",
		modelPath: "info.serialNumber",
		apiField: "sn",
		type: "string",
		role: "info.serial",
		name: "Serial number",
		description:
"Serial number reported by the SAX Power device.",
		category: "info",
		read: true,
		write: false,
		value:
(device) =>
	device.info.serialNumber,
	},
	{
		id: "info.sourceTimestamp",
		modelPath: "info.sourceTimestamp",
		apiField: "data_time",
		type: "string",
		role: "date",
		name: "Source timestamp",
		description:
"Timestamp assigned to the measurement by SAX Power.",
		category: "info",
		read: true,
		write: false,
		value:
(device) =>
	device.info.sourceTimestamp,
	},
	{
		id: "info.receivedTimestamp",
		modelPath: "info.receivedTimestamp",
		type: "string",
		role: "date",
		name: "Received timestamp",
		description:
"Time at which the adapter received and parsed the measurement.",
		category: "info",
		read: true,
		write: false,
		value:
(device) =>
	device.info.receivedTimestamp,
	},
	{
		id: "info.phase",
		modelPath: "info.phase",
		apiField: "phase",
		type: "number",
		role: "value",
		name: "Phase count",
		description:
"Number of electrical phases reported by SAX Power.",
		category: "info",
		read: true,
		write: false,
		value:
(device) =>
	device.info.phase,
	},
	{
		id: "live.soc",
		modelPath: "live.soc",
		apiField: "SOC",
		type: "number",
		role: "value.battery",
		unit: "%",
		name: "State of charge",
		description:
"Current battery state of charge.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.soc,
	},
	{
		id: "live.gridVoltage",
		modelPath: "live.gridVoltage",
		apiField: "grid_voltage",
		type: "number",
		role: "value.voltage",
		unit: "V",
		name: "Grid voltage",
		description:
"Current grid voltage measured by the smart meter.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.gridVoltage,
	},
	{
		id: "live.gridPower",
		modelPath: "live.gridPower",
		apiField: "grid_power",
		type: "number",
		role: "value.power",
		unit: "W",
		name: "Grid power",
		description:
"Original SAX Power grid value. Negative means export; positive means import.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.gridPower,
	},
	{
		id: "live.gridImportPower",
		modelPath: "live.gridImportPower",
		type: "number",
		role: "value.power.consumption",
		unit: "W",
		name: "Grid import power",
		description:
"Positive magnitude of the current grid import. Zero while exporting.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.gridImportPower,
	},
	{
		id: "live.gridExportPower",
		modelPath: "live.gridExportPower",
		type: "number",
		role: "value.power.production",
		unit: "W",
		name: "Grid export power",
		description:
"Positive magnitude of the current grid export. Zero while importing.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.gridExportPower,
	},
	{
		id: "live.gridDirection",
		modelPath: "live.gridDirection",
		type: "string",
		role: "text",
		name: "Grid direction",
		description:
"Current grid flow direction: import, export or idle.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.gridDirection,
	},
	{
		id: "live.batteryPower",
		modelPath: "live.batteryPower",
		apiField: "battery_power",
		type: "number",
		role: "value.power",
		unit: "W",
		name: "Battery power",
		description:
"Original SAX Power battery value. Negative means charging; positive means discharging.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.batteryPower,
	},
	{
		id: "live.batteryChargePower",
		modelPath: "live.batteryChargePower",
		type: "number",
		role: "value.power.consumption",
		unit: "W",
		name: "Battery charge power",
		description:
"Positive magnitude of the current battery charging power.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.batteryChargePower,
	},
	{
		id: "live.batteryDischargePower",
		modelPath:
"live.batteryDischargePower",
		type: "number",
		role: "value.power.production",
		unit: "W",
		name: "Battery discharge power",
		description:
"Positive magnitude of the current battery discharging power.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live
		.batteryDischargePower,
	},
	{
		id: "live.batteryDirection",
		modelPath: "live.batteryDirection",
		type: "string",
		role: "text",
		name: "Battery direction",
		description:
"Current battery flow direction: charging, discharging or idle.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live
		.batteryDirection,
	},
	{
		id: "live.pvPower",
		modelPath: "live.pvPower",
		apiField: "PV_power",
		type: "number",
		role: "value.power.production",
		unit: "W",
		name: "PV power",
		description:
"PV power reported by SAX Power. May be unavailable when no PV source is integrated.",
		category: "live",
		read: true,
		write: false,
		value:
(device) =>
	device.live.pvPower,
	},
	{
		id: "status.connected",
		modelPath: "status.connected",
		apiField: "data_connected",
		type: "boolean",
		role: "indicator.connected",
		name: "Device connected",
		description:
"Whether SAX Power reports the storage device as connected.",
		category: "status",
		read: true,
		write: false,
		value:
(device) =>
	device.status.connected,
	},
	{
		id: "status.on",
		modelPath: "status.on",
		apiField: "data_on",
		type: "boolean",
		role: "indicator",
		name: "Device on",
		description:
"Whether the storage device reports that it is switched on.",
		category: "status",
		read: true,
		write: false,
		value:
(device) =>
	device.status.on,
	},
	{
		id: "status.standby",
		modelPath: "status.standby",
		apiField: "data_standby",
		type: "boolean",
		role: "indicator",
		name: "Standby",
		description:
"Whether the storage device is currently in standby mode.",
		category: "status",
		read: true,
		write: false,
		value:
(device) =>
	device.status.standby,
	},
	{
		id: "status.batteryStatusCode",
		modelPath:
"status.batteryStatusCode",
		apiField: "battery_status",
		type: "number",
		role: "value",
		name: "Battery status code",
		description:
"Unmodified numeric battery status code reported by SAX Power.",
		category: "status",
		read: true,
		write: false,
		value:
(device) =>
	device.status
		.batteryStatusCode,
	},
] as const;
