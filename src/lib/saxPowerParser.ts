import type {
	BatteryDirection,
	GridDirection,
	SaxPowerDevice,
} from "./saxPowerDevice";

interface SaxPowerApiEnvelope {
data?: unknown;
message3?: unknown;
message5?: unknown;
message6?: unknown;
[key: string]: unknown;
}

type RawDevice = Record<string, unknown>;

function readNumber(
	value: unknown,
): number | null {
	return typeof value === "number" &&
Number.isFinite(value)
		? value
		: null;
}

function readString(
	value: unknown,
): string {
	return typeof value === "string"
		? value
		: "";
}

function readFlag(
	value: unknown,
): boolean {
	return value === 1 || value === true;
}

function getGridDirection(
	gridPower: number | null,
): GridDirection {
	if (gridPower === null || gridPower === 0) {
		return "idle";
	}

	return gridPower < 0
		? "export"
		: "import";
}

function getBatteryDirection(
	batteryPower: number | null,
): BatteryDirection {
	if (
		batteryPower === null ||
batteryPower === 0
	) {
		return "idle";
	}

	return batteryPower < 0
		? "charging"
		: "discharging";
}

function parseDevice(
	serialNumber: string,
	raw: RawDevice,
	receivedTimestamp: string,
): SaxPowerDevice {
	const gridPower =
readNumber(raw.grid_power);

	const batteryPower =
readNumber(raw.battery_power);

	return {
		info: {
			serialNumber:
readString(raw.sn) ||
serialNumber,
			sourceTimestamp:
readString(raw.data_time),
			receivedTimestamp,
			phase:
readNumber(raw.phase),
			lastOnlineFrom:
readNumber(raw.last_online_from),
			reportedCycleCount:
readNumber(raw.data_cycle),
		},
		live: {
			soc:
readNumber(raw.SOC),
			gridVoltage:
readNumber(raw.grid_voltage),
			gridPower,
			gridImportPower:
gridPower !== null &&
gridPower > 0
	? gridPower
	: 0,
			gridExportPower:
gridPower !== null &&
gridPower < 0
	? Math.abs(gridPower)
	: 0,
			gridDirection:
getGridDirection(gridPower),
			batteryPower,
			batteryChargePower:
batteryPower !== null &&
batteryPower < 0
	? Math.abs(batteryPower)
	: 0,
			batteryDischargePower:
batteryPower !== null &&
batteryPower > 0
	? batteryPower
	: 0,
			batteryDirection:
getBatteryDirection(
	batteryPower,
),
			pvPower:
readNumber(raw.PV_power),
		},
		control: {
			targetChargePower:
readNumber(
	raw.charge_energy,
),
			targetDischargePower:
readNumber(
	raw.discharge_energy,
),
		},
		status: {
			connected:
readFlag(raw.data_connected),
			on:
readFlag(raw.data_on),
			standby:
readFlag(raw.data_standby),
			calibration:
readFlag(
	raw.data_calibration,
),
			hardwareError:
readFlag(raw.data_hw),
			batteryError:
readFlag(raw.data_bat),
			relayError:
readFlag(raw.data_relay),
			naProtection:
readString(
	raw.data_na_schutz,
),
			batteryStatusCode:
readNumber(
	raw.battery_status,
),
		},
		diagnostics: {
			message1:
raw.message1 ?? null,
			message2:
raw.message2 ?? null,
			lastMessages:
raw.last_messages ?? null,
			raw: {
				...raw,
			},
		},
	};
}

export function parseLiveDataResponse(
	response: SaxPowerApiEnvelope,
	receivedTimestamp =
	new Date().toISOString(),
): SaxPowerDevice[] {
	if (!Array.isArray(response.data)) {
		return [];
	}

	const devices: SaxPowerDevice[] = [];

	for (const dataEntry of response.data) {
		if (
			typeof dataEntry !== "object" ||
dataEntry === null ||
Array.isArray(dataEntry)
		) {
			continue;
		}

		for (
			const [
				serialNumber,
				rawDevice,
			] of Object.entries(dataEntry)
		) {
			if (
				typeof rawDevice !== "object" ||
rawDevice === null ||
Array.isArray(rawDevice)
			) {
				continue;
			}

			devices.push(
				parseDevice(
					serialNumber,
rawDevice as RawDevice,
receivedTimestamp,
				),
			);
		}
	}

	return devices;
}
