import type { SaxPowerEnergyValues } from "./saxPowerHistory";

export type SaxPowerBatteryModelId = "home-5.8" | "home-plus-7.7";

export interface SaxPowerBatteryModel {
	id: SaxPowerBatteryModelId;
	name: string;
	nominalCapacityKwh: number;
	usableCapacityKwh: number;
}

export const SAX_POWER_BATTERY_MODELS: readonly SaxPowerBatteryModel[] = [
	{ id: "home-5.8", name: "SAX Power Home 5.8 kWh", nominalCapacityKwh: 5.76, usableCapacityKwh: 5.2 },
	{ id: "home-plus-7.7", name: "SAX Power Home Plus 7.7 kWh", nominalCapacityKwh: 7.68, usableCapacityKwh: 7 },
] as const;

export function getBatteryModel(id: string | null | undefined): SaxPowerBatteryModel | null {
	return SAX_POWER_BATTERY_MODELS.find((model) => model.id === id) ?? null;
}

export function calculateEquivalentFullCycles(
	energy: SaxPowerEnergyValues,
	nominalCapacityKwh: number,
): number | null {
	if (!Number.isFinite(nominalCapacityKwh) || nominalCapacityKwh <= 0) return null;
	const throughputKwh = Math.abs(energy.chargedKwh) + Math.abs(energy.dischargedKwh);
	return Math.round((throughputKwh / (2 * nominalCapacityKwh) + Number.EPSILON) * 1000) / 1000;
}

export function calculateAggregateEquivalentFullCycles(
	devices: readonly { energy: SaxPowerEnergyValues; nominalCapacityKwh: number }[],
): number | null {
	if (devices.length === 0 || devices.some((device) => device.nominalCapacityKwh <= 0)) return null;
	const throughputKwh = devices.reduce(
		(sum, device) => sum + Math.abs(device.energy.chargedKwh) + Math.abs(device.energy.dischargedKwh), 0,
	);
	const capacityKwh = devices.reduce((sum, device) => sum + device.nominalCapacityKwh, 0);
	return Math.round((throughputKwh / (2 * capacityKwh) + Number.EPSILON) * 1000) / 1000;
}
