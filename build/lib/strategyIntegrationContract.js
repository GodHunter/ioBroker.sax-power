"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var strategyIntegrationContract_exports = {};
__export(strategyIntegrationContract_exports, {
  STRATEGY_INTEGRATION_CONTRACT: () => STRATEGY_INTEGRATION_CONTRACT,
  createDetectedStrategyIntegrationContract: () => createDetectedStrategyIntegrationContract,
  createStrategyIntegrationContract: () => createStrategyIntegrationContract,
  inspectStrategyIntegrationAvailability: () => inspectStrategyIntegrationAvailability
});
module.exports = __toCommonJS(strategyIntegrationContract_exports);
const STRATEGY_INTEGRATION_CONTRACT = {
  modbus: {
    dischargePowerCommand: {
      stateId: "modbus.1.holdingRegisters.43_Leistungsgrenzwert_f\xFCr_Entladung",
      register: 43,
      unit: "W",
      access: "command",
      confirmation: "transient-command"
    },
    chargePowerCommand: {
      stateId: "modbus.1.holdingRegisters.44_Leistungsgrenzwert_f\xFCr_Ladung",
      register: 44,
      unit: "W",
      access: "command",
      confirmation: "transient-command"
    },
    operatingState: {
      stateId: "modbus.1.holdingRegisters.45_Schaltzustand_Speicher",
      register: 45,
      unit: "code",
      access: "observation",
      confirmation: "state-value"
    },
    stateOfCharge: {
      stateId: "modbus.1.holdingRegisters.46_SOC",
      register: 46,
      unit: "%",
      access: "observation",
      confirmation: "state-value"
    },
    batteryPower: {
      stateId: "modbus.1.holdingRegisters.47_Leistung",
      register: 47,
      unit: "W",
      access: "observation",
      confirmation: "state-value"
    },
    smartMeterPower: {
      stateId: "modbus.1.holdingRegisters.48_Leistung_Smartmeter",
      register: 48,
      unit: "W",
      access: "observation",
      confirmation: "state-value"
    }
  },
  pvForecast: {
    energyNowUntilEndOfDay: {
      stateId: "pvforecast.0.summary.energy.nowUntilEndOfDay",
      unit: "Wh",
      access: "observation",
      confirmation: "state-value"
    },
    energyToday: {
      stateId: "pvforecast.0.summary.energy.today",
      unit: "Wh",
      access: "observation",
      confirmation: "state-value"
    },
    energyTomorrow: {
      stateId: "pvforecast.0.summary.energy.tomorrow",
      unit: "Wh",
      access: "observation",
      confirmation: "state-value"
    },
    lastUpdated: {
      stateId: "pvforecast.0.summary.lastUpdated",
      unit: "timestamp",
      access: "observation",
      confirmation: "state-value"
    }
  },
  marketPrice: {
    adapterName: "apg-info",
    instanceObjectId: "system.adapter.apg-info.0",
    required: false,
    priceStateId: null
  }
};
function createStrategyIntegrationContract(modbusInstance) {
  const normalized = modbusInstance.trim();
  if (!/^modbus\.\d+$/.test(normalized)) return null;
  const replaceModbusInstance = (state) => Object.freeze({
    ...state,
    stateId: state.stateId.replace(/^modbus\.1/, normalized)
  });
  return Object.freeze({
    modbus: Object.freeze({
      dischargePowerCommand: replaceModbusInstance(
        STRATEGY_INTEGRATION_CONTRACT.modbus.dischargePowerCommand
      ),
      chargePowerCommand: replaceModbusInstance(
        STRATEGY_INTEGRATION_CONTRACT.modbus.chargePowerCommand
      ),
      operatingState: replaceModbusInstance(
        STRATEGY_INTEGRATION_CONTRACT.modbus.operatingState
      ),
      stateOfCharge: replaceModbusInstance(
        STRATEGY_INTEGRATION_CONTRACT.modbus.stateOfCharge
      ),
      batteryPower: replaceModbusInstance(
        STRATEGY_INTEGRATION_CONTRACT.modbus.batteryPower
      ),
      smartMeterPower: replaceModbusInstance(
        STRATEGY_INTEGRATION_CONTRACT.modbus.smartMeterPower
      )
    }),
    pvForecast: STRATEGY_INTEGRATION_CONTRACT.pvForecast,
    marketPrice: STRATEGY_INTEGRATION_CONTRACT.marketPrice
  });
}
function createDetectedStrategyIntegrationContract(modbusInstance, registers) {
  const fallback = createStrategyIntegrationContract(modbusInstance);
  if (fallback === null) return null;
  const detectedStateId = (register, fallbackStateId) => {
    var _a, _b;
    return (_b = (_a = registers.find((item) => item.register === register)) == null ? void 0 : _a.stateId) != null ? _b : fallbackStateId;
  };
  const detected = (state) => Object.freeze({
    ...state,
    stateId: state.register === void 0 ? state.stateId : detectedStateId(state.register, state.stateId)
  });
  return Object.freeze({
    modbus: Object.freeze({
      dischargePowerCommand: detected(fallback.modbus.dischargePowerCommand),
      chargePowerCommand: detected(fallback.modbus.chargePowerCommand),
      operatingState: detected(fallback.modbus.operatingState),
      stateOfCharge: detected(fallback.modbus.stateOfCharge),
      batteryPower: detected(fallback.modbus.batteryPower),
      smartMeterPower: detected(fallback.modbus.smartMeterPower)
    }),
    pvForecast: fallback.pvForecast,
    marketPrice: fallback.marketPrice
  });
}
function stateContracts(contract) {
  return {
    modbus: [
      contract.modbus.chargePowerCommand,
      contract.modbus.operatingState,
      contract.modbus.stateOfCharge,
      contract.modbus.batteryPower,
      contract.modbus.smartMeterPower
    ],
    pvForecast: Object.values(contract.pvForecast)
  };
}
function inspectStrategyIntegrationAvailability(objects, contract = STRATEGY_INTEGRATION_CONTRACT) {
  const states = stateContracts(contract);
  const missingModbus = states.modbus.filter(({ stateId }) => !Object.hasOwn(objects, stateId)).map(({ stateId }) => stateId);
  const missingPvForecast = states.pvForecast.filter(({ stateId }) => !Object.hasOwn(objects, stateId)).map(({ stateId }) => stateId);
  const missingRequiredStateIds = [...missingModbus, ...missingPvForecast];
  return {
    modbusAvailable: missingModbus.length === 0,
    pvForecastAvailable: missingPvForecast.length === 0,
    marketPriceAdapterAvailable: Object.hasOwn(
      objects,
      contract.marketPrice.instanceObjectId
    ),
    strategyInputsReady: missingRequiredStateIds.length === 0,
    missingRequiredStateIds
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STRATEGY_INTEGRATION_CONTRACT,
  createDetectedStrategyIntegrationContract,
  createStrategyIntegrationContract,
  inspectStrategyIntegrationAvailability
});
//# sourceMappingURL=strategyIntegrationContract.js.map
