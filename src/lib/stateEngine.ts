import type {
	SaxPowerObjectAdapter,
} from "./adapterContract";

import type {
	SaxPowerDevice,
} from "./saxPowerDevice";

import {
	saxPowerStateDefinitions,
	type SaxPowerStateDefinition,
} from "./stateDefinitions";

import {
	SaxPowerStatisticsStateEngine,
} from "./statisticsStateEngine";

import type {
	SaxPowerStatisticsMetadata,
	SaxPowerStatisticsResult,
} from "./saxPowerHistory";


const DEVICE_ROOT = "devices";

const CATEGORY_NAMES:
Readonly<Record<string, string>> = {
	info: "Device information",
	live: "Live measurements",
	status: "Device status",
	diagnostics: "Diagnostics",
};

export class SaxPowerStateEngine {
	private readonly adapter:
SaxPowerObjectAdapter;

	private readonly statistics:
SaxPowerStatisticsStateEngine;

	private readonly initializedDevices =
		new Set<string>();

	private aggregateLiveInitialized = false;

	private readonly aggregateLiveCache =
		new Map<string, string | number | null>();

	public constructor(
		adapter: SaxPowerObjectAdapter,
	) {
		this.adapter = adapter;

		this.statistics =
new SaxPowerStatisticsStateEngine(
	adapter,
);
	}

	public async writeDevices(
		devices: readonly SaxPowerDevice[],
	): Promise<void> {
		await this.ensureRootObject();

		await this.statistics.ensureObjects(
			devices,
		);

		for (const device of devices) {
			await this.writeDevice(device);
		}
	}

	private async ensureRootObject(): Promise<void> {
		await this.adapter.extendObjectAsync(
			DEVICE_ROOT,
			{
				type: "folder",
				common: {
					name: "SAX Power devices",
				},
				native: {},
			},
		);
	}

	private async writeDevice(
		device: SaxPowerDevice,
	): Promise<void> {
		const serialNumber =
this.sanitizeObjectId(
	device.info.serialNumber,
);

		if (!serialNumber) {
			throw new Error(
				"SAX Power device has no usable serial number.",
			);
		}

		if (
			!this.initializedDevices.has(
				serialNumber,
			)
		) {
			await this.ensureDeviceObjects(
				serialNumber,
				device.info.serialNumber,
			);

			this.initializedDevices.add(
				serialNumber,
			);
		}

		for (
			const definition
			of saxPowerStateDefinitions
		) {
			await this.writeState(
				serialNumber,
				definition,
				device,
			);
		}

		await this.writeRawDeviceData(
			serialNumber,
			device,
		);
	}

	private async ensureDeviceObjects(
		serialNumber: string,
		displaySerialNumber: string,
	): Promise<void> {
		const deviceRoot =
`${DEVICE_ROOT}.${serialNumber}`;

		await this.adapter.extendObjectAsync(
			deviceRoot,
			{
				type: "device",
				common: {
					name:
`SAX Power ${displaySerialNumber}`,
				},
				native: {
					serialNumber:
displaySerialNumber,
				},
			},
		);

		/*
 * Pre-1.0 development builds exposed dashboard control
 * values publicly. V1.0 deliberately removes that channel.
 */
		await this.adapter.delObjectAsync(
			`${deviceRoot}.control`,
			{
				recursive: true,
			},
		);

		const categories =
new Set(
	saxPowerStateDefinitions.map(
		(definition) =>
			definition.category,
	),
);

		categories.add("diagnostics");

		for (const category of categories) {
			const name =
CATEGORY_NAMES[category];

			if (!name) {
				continue;
			}

			await this.adapter.extendObjectAsync(
				`${deviceRoot}.${category}`,
				{
					type: "channel",
					common: {
						name,
					},
					native: {},
				},
			);
		}

		for (
			const definition
			of saxPowerStateDefinitions
		) {
			await this.ensureStateObject(
				serialNumber,
				definition,
			);
		}

		await this.adapter.extendObjectAsync(
			`${deviceRoot}.diagnostics.raw`,
			{
				type: "state",
				common: {
					name: "Raw device data",
					desc:
"Complete raw SAX Power device data as JSON.",
					type: "string",
					role: "json",
					read: true,
					write: false,
					def: "",
				},
				native: {
					source:
"SAX Power dashboard API",
				},
			},
		);
	}

	private async ensureStateObject(
		serialNumber: string,
		definition:
SaxPowerStateDefinition,
	): Promise<void> {
		const stateId =
`${DEVICE_ROOT}.${serialNumber}.${definition.id}`;

		const common:
ioBroker.StateCommon = {
	name: definition.name,
	desc: definition.description,
	type: definition.type,
	role: definition.role,
	read: definition.read,
	write: definition.write,
};

		if (
			definition.unit !== undefined
		) {
			common.unit =
definition.unit;
		}

		await this.adapter.extendObjectAsync(
			stateId,
			{
				type: "state",
				common,
				native: {
					modelPath:
definition.modelPath,
					apiField:
definition.apiField ??
null,
					category:
definition.category,
				},
			},
		);
	}

	private async writeState(
		serialNumber: string,
		definition:
SaxPowerStateDefinition,
		device: SaxPowerDevice,
	): Promise<void> {
		const stateId =
`${DEVICE_ROOT}.${serialNumber}.${definition.id}`;

		await this.adapter.setStateAsync(
			stateId,
			{
				val:
definition.value(
	device,
),
				ack: true,
			},
		);
	}

	private async writeRawDeviceData(
		serialNumber: string,
		device: SaxPowerDevice,
	): Promise<void> {
		await this.adapter.setStateAsync(
			`${DEVICE_ROOT}.${serialNumber}.diagnostics.raw`,
			{
				val: JSON.stringify(
					device.diagnostics.raw,
				),
				ack: true,
			},
		);
	}

	public async writeAggregateLiveData(
		devices: readonly SaxPowerDevice[],
	): Promise<void> {
		if (!this.aggregateLiveInitialized) {
			await this.ensureAggregateLiveObjects();

			this.aggregateLiveInitialized = true;
		}

		const batteryValues =
devices
	.map(
		(device) =>
			device.live.batteryPower,
	)
	.filter(
		(value):
value is number =>
			typeof value === "number",
	);

		const socValues =
devices
	.map(
		(device) =>
			device.live.soc,
	)
	.filter(
		(value):
value is number =>
			typeof value === "number",
	);

		/*
 * PV and grid measurements describe the installation,
 * not an individual battery. The first available value
 * is therefore used instead of summing duplicated values.
 */
		const pvPower =
devices.find(
	(device) =>
		typeof device.live.pvPower ===
"number",
)?.live.pvPower ?? null;

		const gridPower =
devices.find(
	(device) =>
		typeof device.live.gridPower ===
"number",
)?.live.gridPower ?? null;

		const batteryPower =
batteryValues.length > 0
	? batteryValues.reduce(
		(sum, value) =>
			sum + value,
		0,
	)
	: null;

		const soc =
socValues.length > 0
	? socValues.reduce(
		(sum, value) =>
			sum + value,
		0,
	) /
socValues.length
	: null;

		const houseConsumptionPower =
pvPower !== null &&
gridPower !== null &&
batteryPower !== null
	? Math.max(
		0,
		pvPower +
gridPower +
batteryPower,
	)
	: null;

		const gridDirection =
gridPower === null ||
gridPower === 0
	? "idle"
	: gridPower > 0
		? "import"
		: "export";

		const batteryDirection =
batteryPower === null ||
batteryPower === 0
	? "idle"
	: batteryPower > 0
		? "discharging"
		: "charging";

		const values:
Record<
string,
string | number | null
> = {
	"live.pvPower":
pvPower,

	"live.houseConsumptionPower":
houseConsumptionPower,

	"live.gridPower":
gridPower,

	"live.gridDirection":
gridDirection,

	"live.batteryPower":
batteryPower,

	"live.batteryDirection":
batteryDirection,

	"live.soc":
soc,

	"live.deviceCount":
devices.length,

	"live.lastUpdate":
new Date().toISOString(),
};

		for (
			const [id, value]
			of Object.entries(values)
		) {
			if (
				this.aggregateLiveCache.get(id) ===
value
			) {
				continue;
			}

			await this.adapter.setStateAsync(
				id,
				{
					val: value,
					ack: true,
				},
			);

			this.aggregateLiveCache.set(
				id,
				value,
			);
		}
	}

	public async observeBatteryHealth(devices: readonly SaxPowerDevice[], batteryModels: Record<string, string>): Promise<void> {
		await this.statistics.observeBatteryHealth(devices, batteryModels);
	}

	private async ensureAggregateLiveObjects():
Promise<void> {
		await this.adapter.extendObjectAsync(
			"live",
			{
				type: "channel",
				common: {
					name:
"Combined live measurements",
				},
				native: {},
			},
		);

		const definitions = {
			pvPower: {
				name: "PV power",
				desc:
"Current photovoltaic production power.",
				type: "number",
				role:
"value.power.production",
				unit: "W",
			},

			houseConsumptionPower: {
				name:
"House consumption power",
				desc:
"Calculated current house consumption.",
				type: "number",
				role:
"value.power.consumption",
				unit: "W",
			},

			gridPower: {
				name: "Grid power",
				desc:
"Positive values indicate import; negative values indicate export.",
				type: "number",
				role: "value.power",
				unit: "W",
			},

			gridDirection: {
				name: "Grid direction",
				desc:
"Current grid energy direction.",
				type: "string",
				role: "text",
			},

			batteryPower: {
				name: "Battery power",
				desc:
"Positive values indicate discharge; negative values indicate charging.",
				type: "number",
				role: "value.power",
				unit: "W",
			},

			batteryDirection: {
				name: "Battery direction",
				desc:
"Current combined battery energy direction.",
				type: "string",
				role: "text",
			},

			soc: {
				name:
"Average state of charge",
				desc:
"Average state of charge across all available storage devices.",
				type: "number",
				role: "value.battery",
				unit: "%",
			},

			deviceCount: {
				name: "Device count",
				desc:
"Number of storage devices included in the live aggregation.",
				type: "number",
				role: "value",
			},

			lastUpdate: {
				name: "Last update",
				desc:
"Timestamp of the last successful live aggregation.",
				type: "string",
				role: "date",
			},
		} as const;

		for (
			const [id, common]
			of Object.entries(definitions)
		) {
			await this.adapter.extendObjectAsync(
				`live.${id}`,
				{
					type: "state",
					common: {
						...common,
						read: true,
						write: false,
					},
					native: {
						aggregate: true,
					},
				},
			);
		}
	}



	public async writeStatistics(
		result: SaxPowerStatisticsResult,
		metadata: SaxPowerStatisticsMetadata,
		updatedAt: string,
		batteryModels: Record<string, string>,
		reportedCycles: Record<string, number | null>,
	): Promise<void> {
		await this.statistics.writeStatistics(
			result,
			metadata,
			updatedAt,
			batteryModels,
			reportedCycles,
		);
	}

	public async writeStatisticsError(
		message: string,
	): Promise<void> {
		await this.statistics.writeError(
			message,
		);
	}



	private sanitizeObjectId(
		value: string,
	): string {
		return value
			.trim()
			.replace(
				/[^a-zA-Z0-9_-]/g,
				"_",
			);
	}
}
