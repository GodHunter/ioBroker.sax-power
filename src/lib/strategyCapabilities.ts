export type StrategyCapabilityModeId =
	| "chargingControl"
	| "dayAvailability"
	| "nightDischarge";

export interface StrategyRegisterCapability {
	readonly register: number;
	readonly stateId: string | null;
	readonly readable: boolean;
	readonly writable: boolean;
}

export interface StrategyModeCapability {
	readonly id: StrategyCapabilityModeId;
	readonly hardwareSupported: boolean;
	readonly implemented: boolean;
	readonly selectable: boolean;
	readonly missingRegisters: readonly number[];
	readonly reason: "available" | "missing-registers" | "not-implemented";
}

export interface StrategyCapabilities {
	readonly instance: string;
	readonly registers: readonly StrategyRegisterCapability[];
	readonly modes: readonly StrategyModeCapability[];
}

interface StrategyCapabilityObject {
	readonly type?: unknown;
	readonly common?: {
		readonly type?: unknown;
		readonly read?: unknown;
		readonly write?: unknown;
	};
}

interface RegisterRequirement {
	readonly register: number;
	readonly access: "read" | "write";
}

const MODE_REQUIREMENTS: Readonly<Record<
	StrategyCapabilityModeId,
	readonly RegisterRequirement[]
>> = Object.freeze({
	chargingControl: [
		{ register: 44, access: "write" },
		{ register: 45, access: "read" },
		{ register: 46, access: "read" },
		{ register: 47, access: "read" },
		{ register: 48, access: "read" },
	],
	dayAvailability: [
		{ register: 45, access: "read" },
		{ register: 46, access: "read" },
		{ register: 47, access: "read" },
		{ register: 48, access: "read" },
	],
	nightDischarge: [
		{ register: 43, access: "write" },
		{ register: 45, access: "read" },
		{ register: 46, access: "read" },
		{ register: 47, access: "read" },
		{ register: 48, access: "read" },
	],
});

function registerNumber(stateId: string): number | null {
	const stateName = stateId.split(".").at(-1) ?? "";
	const match = stateName.match(/^(4[3-8])(?:_|$)/);
	return match ? Number(match[1]) : null;
}

function providesDocumentedAccess(
	register: number,
	object: StrategyCapabilityObject,
): boolean {
	if (register === 43 || register === 44) return object.common?.write === true;
	return object.common?.read === true;
}

function modeCapability(
	id: StrategyCapabilityModeId,
	registers: readonly StrategyRegisterCapability[],
): StrategyModeCapability {
	const missingRegisters = MODE_REQUIREMENTS[id]
		.filter((requirement) => {
			const register = registers.find(item =>
				item.register === requirement.register);
			return register === undefined
				|| (requirement.access === "read"
					? !register.readable
					: !register.writable);
		})
		.map(requirement => requirement.register);
	const hardwareSupported = missingRegisters.length === 0;
	const implemented = id !== "nightDischarge";

	return Object.freeze({
		id,
		hardwareSupported,
		implemented,
		selectable: hardwareSupported && implemented,
		missingRegisters: Object.freeze(missingRegisters),
		reason: !hardwareSupported
			? "missing-registers"
			: implemented
				? "available"
				: "not-implemented",
	});
}

export function discoverStrategyCapabilities(
	instance: string,
	objects: Readonly<Record<string, unknown>>,
): StrategyCapabilities | null {
	if (!/^modbus\.\d+$/.test(instance)) return null;

	const registers = Array.from({ length: 6 }, (_, index) => index + 43)
		.map((register): StrategyRegisterCapability => {
			const candidates = Object.entries(objects)
				.filter(([id, object]) => id.startsWith(`${instance}.`)
					&& registerNumber(id) === register
					&& typeof object === "object"
					&& object !== null)
				.map(([stateId, object]) => ({
					stateId,
					object: object as StrategyCapabilityObject,
				}))
				.filter(({ object }) => object.type === "state"
					&& object.common?.type === "number")
				.sort((left, right) => {
					const leftAccess = providesDocumentedAccess(register, left.object);
					const rightAccess = providesDocumentedAccess(register, right.object);
					if (leftAccess !== rightAccess) return leftAccess ? -1 : 1;
					const leftHolding = left.stateId.includes(".holdingRegisters.");
					const rightHolding = right.stateId.includes(".holdingRegisters.");
					return leftHolding === rightHolding ? 0 : leftHolding ? -1 : 1;
				});
			const candidate = candidates[0];

			return Object.freeze({
				register,
				stateId: candidate?.stateId ?? null,
				readable: candidate?.object.common?.read === true,
				writable: candidate?.object.common?.write === true,
			});
		});

	return Object.freeze({
		instance,
		registers: Object.freeze(registers),
		modes: Object.freeze(([
			"chargingControl",
			"dayAvailability",
			"nightDischarge",
		] as const).map(id => modeCapability(id, registers))),
	});
}
