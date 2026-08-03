import type {
	SaxPowerDevice,
} from "./saxPowerDevice";

import {
	saxPowerStateDefinitions,
	type SaxPowerStateDefinition,
} from "./stateDefinitions";

interface SaxPowerStateEngineAdapter {
extendObjectAsync(
id: string,
object: ioBroker.PartialObject,
): Promise<unknown>;

setStateAsync(
id: string,
state: ioBroker.SettableState,
): Promise<unknown>;
}

const DEVICE_ROOT = "devices";

const CATEGORY_NAMES: Readonly<
Record<
SaxPowerStateDefinition["category"],
string
>
> = {
	info: "Device information",
	live: "Live measurements",
	control: "Control values",
	status: "Device status",
	diagnostics: "Diagnostics",
};

export class SaxPowerStateEngine {
	private readonly adapter: SaxPowerStateEngineAdapter;
	private readonly initializedDevices =
		new Set<string>();

	public constructor(adapter: SaxPowerStateEngineAdapter) {
		this.adapter = adapter;
	}

	public async writeDevices(
		devices: readonly SaxPowerDevice[],
	): Promise<void> {
		await this.ensureRootObject();

		for (const device of devices) {
			await this.writeDevice(device);
		}
	}

	private async ensureRootObject(): Promise<void> {
		await this.adapter.extendObjectAsync(
			DEVICE_ROOT,
			{
				type: "channel",
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

		for (
			const [
				category,
				name,
			] of Object.entries(
				CATEGORY_NAMES,
			)
		) {
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
		definition: SaxPowerStateDefinition,
	): Promise<void> {
		const stateId =
`${DEVICE_ROOT}.${serialNumber}.${definition.id}`;

		const common: ioBroker.StateCommon = {
			name: definition.name,
			desc: definition.description,
			type: definition.type,
			role: definition.role,
			read: definition.read,
			write: definition.write,
		};

		if (definition.unit !== undefined) {
			common.unit = definition.unit;
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
		definition: SaxPowerStateDefinition,
		device: SaxPowerDevice,
	): Promise<void> {
		const stateId =
`${DEVICE_ROOT}.${serialNumber}.${definition.id}`;

		const value =
definition.value(device);

		await this.adapter.setStateAsync(
			stateId,
			{
				val: value,
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
