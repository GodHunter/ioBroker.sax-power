export interface PvForecastInstanceOption {
	readonly value: string;
	readonly label: string;
	readonly enabled: boolean;
}

export interface PvForecastCapability {
	readonly stateId: string;
	readonly available: boolean;
}

export interface PvForecastCapabilities {
	readonly instance: string;
	readonly compatible: boolean;
	readonly states: readonly PvForecastCapability[];
	readonly missingStateIds: readonly string[];
}

interface InstanceObject {
	readonly type?: unknown;
	readonly common?: {
		readonly name?: unknown;
		readonly titleLang?: unknown;
		readonly enabled?: unknown;
	};
}

const REQUIRED_SUFFIXES = Object.freeze([
	"summary.energy.nowUntilEndOfDay",
	"summary.energy.today",
	"summary.energy.tomorrow",
	"summary.lastUpdated",
] as const);

function displayName(
	value: unknown,
	fallback: string,
): string {
	if (typeof value === "string" && value.trim() !== "") {
		return value;
	}

	if (typeof value === "object" && value !== null) {
		const names = value as Record<string, unknown>;

		for (const language of ["de", "en"]) {
			const name = names[language];

			if (typeof name === "string" && name.trim() !== "") {
				return name;
			}
		}
	}

	return fallback;
}

function normalizeInstance(id: string): string {
	const trimmed = id.trim();

	if (/^pvforecast\.\d+$/.test(trimmed)) {
		return trimmed;
	}

	return trimmed.match(
		/^system\.adapter\.(pvforecast\.\d+)$/,
	)?.[1] ?? "";
}

export function discoverPvForecastInstances(
	objects: Readonly<Record<string, unknown>>,
): PvForecastInstanceOption[] {
	return Object.entries(objects)
		.map(([id, rawObject]) => {
			const instance = normalizeInstance(id);

			if (
				instance === ""
				|| typeof rawObject !== "object"
				|| rawObject === null
			) {
				return null;
			}

			const object = rawObject as InstanceObject;

			if (object.type !== "instance") {
				return null;
			}

			const name = displayName(
				object.common?.titleLang,
				displayName(object.common?.name, instance),
			);
			const enabled = object.common?.enabled === true;

			return {
				value: instance,
				label: `${name} — ${instance}${enabled ? "" : " · disabled"}`,
				enabled,
			};
		})
		.filter(
			(option): option is PvForecastInstanceOption =>
				option !== null,
		)
		.sort((left, right) =>
			left.value.localeCompare(right.value, "en", {
				numeric: true,
			}),
		);
}

export function inspectPvForecastCapabilities(
	instance: string,
	objects: Readonly<Record<string, unknown>>,
): PvForecastCapabilities | null {
	const normalized = normalizeInstance(instance);

	if (!/^pvforecast\.\d+$/.test(normalized)) {
		return null;
	}

	const states = REQUIRED_SUFFIXES.map((suffix) => {
		const stateId = `${normalized}.${suffix}`;

		return Object.freeze({
			stateId,
			available: Object.hasOwn(objects, stateId),
		});
	});

	const missingStateIds = states
		.filter(state => !state.available)
		.map(state => state.stateId);

	return Object.freeze({
		instance: normalized,
		compatible: missingStateIds.length === 0,
		states: Object.freeze(states),
		missingStateIds: Object.freeze(missingStateIds),
	});
}
