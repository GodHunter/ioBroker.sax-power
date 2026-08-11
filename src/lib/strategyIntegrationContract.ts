export type StrategyValueUnit =
	| "W"
	| "%"
	| "Wh"
	| "timestamp"
	| "code";

export type StrategyStateAccess =
	| "command"
	| "observation";

export type StrategyConfirmation =
	| "transient-command"
	| "state-value";

export interface StrategyStateContract {
	readonly stateId: string;
	readonly register?: number;
	readonly unit: StrategyValueUnit;
	readonly access: StrategyStateAccess;
	readonly confirmation: StrategyConfirmation;
}

export interface StrategyModbusContract {
	readonly dischargePowerCommand: StrategyStateContract;
	readonly chargePowerCommand: StrategyStateContract;
	readonly operatingState: StrategyStateContract;
	readonly stateOfCharge: StrategyStateContract;
	readonly batteryPower: StrategyStateContract;
	readonly smartMeterPower: StrategyStateContract;
}

export interface StrategyPvForecastContract {
	readonly energyNowUntilEndOfDay: StrategyStateContract;
	readonly energyToday: StrategyStateContract;
	readonly energyTomorrow: StrategyStateContract;
	readonly lastUpdated: StrategyStateContract;
}

export interface OptionalMarketPriceContract {
	readonly adapterName: "apg-info";
	readonly instanceObjectId: "system.adapter.apg-info.0";
	readonly required: false;
	readonly priceStateId: null;
}

export interface StrategyIntegrationContract {
	readonly modbus: StrategyModbusContract;
	readonly pvForecast: StrategyPvForecastContract;
	readonly marketPrice: OptionalMarketPriceContract;
}

export interface StrategyIntegrationAvailability {
	readonly modbusAvailable: boolean;
	readonly pvForecastAvailable: boolean;
	readonly marketPriceAdapterAvailable: boolean;
	readonly strategyInputsReady: boolean;
	readonly missingRequiredStateIds: readonly string[];
}

export const STRATEGY_INTEGRATION_CONTRACT: StrategyIntegrationContract = {
	modbus: {
		dischargePowerCommand: {
			stateId: "modbus.1.holdingRegisters.43_Leistungsgrenzwert_für_Entladung",
			register: 43,
			unit: "W",
			access: "command",
			confirmation: "transient-command",
		},
		chargePowerCommand: {
			stateId: "modbus.1.holdingRegisters.44_Leistungsgrenzwert_für_Ladung",
			register: 44,
			unit: "W",
			access: "command",
			confirmation: "transient-command",
		},
		operatingState: {
			stateId: "modbus.1.holdingRegisters.45_Schaltzustand_Speicher",
			register: 45,
			unit: "code",
			access: "observation",
			confirmation: "state-value",
		},
		stateOfCharge: {
			stateId: "modbus.1.holdingRegisters.46_SOC",
			register: 46,
			unit: "%",
			access: "observation",
			confirmation: "state-value",
		},
		batteryPower: {
			stateId: "modbus.1.holdingRegisters.47_Leistung",
			register: 47,
			unit: "W",
			access: "observation",
			confirmation: "state-value",
		},
		smartMeterPower: {
			stateId: "modbus.1.holdingRegisters.48_Leistung_Smartmeter",
			register: 48,
			unit: "W",
			access: "observation",
			confirmation: "state-value",
		},
	},
	pvForecast: {
		energyNowUntilEndOfDay: {
			stateId: "pvforecast.0.summary.energy.nowUntilEndOfDay",
			unit: "Wh",
			access: "observation",
			confirmation: "state-value",
		},
		energyToday: {
			stateId: "pvforecast.0.summary.energy.today",
			unit: "Wh",
			access: "observation",
			confirmation: "state-value",
		},
		energyTomorrow: {
			stateId: "pvforecast.0.summary.energy.tomorrow",
			unit: "Wh",
			access: "observation",
			confirmation: "state-value",
		},
		lastUpdated: {
			stateId: "pvforecast.0.summary.lastUpdated",
			unit: "timestamp",
			access: "observation",
			confirmation: "state-value",
		},
	},
	marketPrice: {
		adapterName: "apg-info",
		instanceObjectId: "system.adapter.apg-info.0",
		required: false,
		priceStateId: null,
	},
};

function stateContracts(
	contract: StrategyIntegrationContract,
): {
	modbus: readonly StrategyStateContract[];
	pvForecast: readonly StrategyStateContract[];
} {
	return {
		modbus: Object.values(contract.modbus),
		pvForecast: Object.values(contract.pvForecast),
	};
}

export function inspectStrategyIntegrationAvailability(
	objects: Readonly<Record<string, unknown>>,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
): StrategyIntegrationAvailability {
	const states = stateContracts(contract);

	const missingModbus = states.modbus
		.filter(({ stateId }) => !Object.hasOwn(objects, stateId))
		.map(({ stateId }) => stateId);

	const missingPvForecast = states.pvForecast
		.filter(({ stateId }) => !Object.hasOwn(objects, stateId))
		.map(({ stateId }) => stateId);

	const missingRequiredStateIds = [...missingModbus, ...missingPvForecast];

	return {
		modbusAvailable: missingModbus.length === 0,
		pvForecastAvailable: missingPvForecast.length === 0,
		marketPriceAdapterAvailable: Object.hasOwn(
			objects,
			contract.marketPrice.instanceObjectId,
		),
		strategyInputsReady: missingRequiredStateIds.length === 0,
		missingRequiredStateIds,
	};
}
