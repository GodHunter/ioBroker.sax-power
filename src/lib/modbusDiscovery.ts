export interface ModbusStateOption {
value: string;
label: string;
}

export interface ModbusInstanceOption {
value: string;
label: string;
enabled: boolean;
}

export type ForeignObjectReader = (
pattern: string,
) => Promise<Record<string, unknown>>;

export interface DiscoverModbusStatesOptions {
instance: string;
preferredRegister?: number;
}

interface CommonObjectData {
name?: unknown;
type?: unknown;
role?: unknown;
read?: unknown;
write?: unknown;
unit?: unknown;
}

interface ForeignStateObject {
type?: unknown;
common?: CommonObjectData;
}

function normalizeInstance(
	value: string,
): string {
	const trimmed = value.trim();

	if (!trimmed) {
		return "";
	}

	if (
		/^modbus\.\d+$/.test(trimmed)
	) {
		return trimmed;
	}

	const longMatch = trimmed.match(
		/^system\.adapter\.(modbus\.\d+)$/,
	);

	return longMatch?.[1] ?? "";
}

export function discoverModbusInstances(
	objects: Readonly<Record<string, unknown>>,
): ModbusInstanceOption[] {
	return Object.entries(objects)
		.map(([id, rawObject]) => {
			const instance = normalizeInstance(id);
			if (!instance || typeof rawObject !== "object" || rawObject === null) {
				return null;
			}

			const object = rawObject as {
				type?: unknown;
				common?: CommonObjectData & {
					titleLang?: unknown;
					enabled?: unknown;
				};
			};

			if (object.type !== "instance") {
				return null;
			}

			const name = readDisplayName(
				object.common?.titleLang,
				readDisplayName(object.common?.name, instance),
			);

			const enabled = object.common?.enabled === true;
			const suffix = enabled ? "" : " · disabled";

			return {
				value: instance,
				label: `${name} — ${instance}${suffix}`,
				enabled,
			};
		})
		.filter((option): option is ModbusInstanceOption => option !== null)
		.sort((left, right) => left.value.localeCompare(right.value, "en", {
			numeric: true,
		}));
}

function readDisplayName(
	value: unknown,
	fallback: string,
): string {
	if (typeof value === "string") {
		return value;
	}

	if (
		typeof value === "object" &&
value !== null
	) {
		const names =
value as Record<string, unknown>;

		for (const language of [
			"de",
			"en",
		]) {
			const name =
names[language];

			if (typeof name === "string") {
				return name;
			}
		}
	}

	return fallback;
}

function isNumericState(
	object: ForeignStateObject,
): boolean {
	return (
		object.type === "state" &&
object.common?.type === "number"
	);
}

function isWritableState(
	object: ForeignStateObject,
): boolean {
	return object.common?.write === true;
}

function extractRegisterNumber(
	id: string,
): number | null {
	const stateName =
id.split(".").at(-1) ?? "";

	const match =
stateName.match(/^(\d+)(?:_|$)/);

	if (!match) {
		return null;
	}

	const value = Number(match[1]);

	return Number.isFinite(value)
		? value
		: null;
}

function createLabel(
	id: string,
	object: ForeignStateObject,
): string {
	const fallbackName =
id.split(".").at(-1) ?? id;

	const name =
readDisplayName(
	object.common?.name,
	fallbackName,
);

	const unit =
typeof object.common?.unit === "string" &&
object.common.unit
	? ` [${object.common.unit}]`
	: "";

	return `${name}${unit} — ${id}`;
}

export async function discoverModbusStates(
	readObjects: ForeignObjectReader,
	options: DiscoverModbusStatesOptions,
): Promise<ModbusStateOption[]> {
	const instance =
normalizeInstance(options.instance);

	if (!instance) {
		return [];
	}

	const objects =
await readObjects(`${instance}.*`);

	const instancePrefix =
		`${instance}.`;

	const optionsList: Array<
ModbusStateOption & {
preferred: boolean;
register: number | null;
holdingRegister: boolean;
writable: boolean;
}
> = [];

	for (
		const [
			id,
			rawObject,
		] of Object.entries(objects)
	) {
		if (!id.startsWith(instancePrefix)) {
			continue;
		}

		if (
			typeof rawObject !== "object" ||
rawObject === null
		) {
			continue;
		}

		const object =
rawObject as ForeignStateObject;

		if (!isNumericState(object)) {
			continue;
		}

		const writable =
isWritableState(object);

		if (!writable) {
			continue;
		}

		const register =
extractRegisterNumber(id);

		const preferred =
options.preferredRegister !== undefined &&
register ===
options.preferredRegister;

		optionsList.push({
			value: id,
			label: createLabel(id, object),
			preferred,
			register,
			holdingRegister:
id.includes(
	".holdingRegisters.",
),
			writable,
		});
	}

	optionsList.sort(
		(left, right) => {
			if (
				left.preferred !==
right.preferred
			) {
				return left.preferred
					? -1
					: 1;
			}

			if (
				left.holdingRegister !==
right.holdingRegister
			) {
				return left.holdingRegister
					? -1
					: 1;
			}

			if (
				left.register !== null &&
right.register !== null &&
left.register !== right.register
			) {
				return (
					left.register -
right.register
				);
			}

			return left.label.localeCompare(
				right.label,
				"de",
			);
		},
	);

	return optionsList.map(
		({
			value,
			label,
		}) => ({
			value,
			label,
		}),
	);
}
