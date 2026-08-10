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
var saxPowerParser_exports = {};
__export(saxPowerParser_exports, {
  parseLiveDataResponse: () => parseLiveDataResponse
});
module.exports = __toCommonJS(saxPowerParser_exports);
function readNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function readString(value) {
  return typeof value === "string" ? value : "";
}
function readFlag(value) {
  return value === 1 || value === true;
}
function getGridDirection(gridPower) {
  if (gridPower === null || gridPower === 0) {
    return "idle";
  }
  return gridPower < 0 ? "export" : "import";
}
function getBatteryDirection(batteryPower) {
  if (batteryPower === null || batteryPower === 0) {
    return "idle";
  }
  return batteryPower < 0 ? "charging" : "discharging";
}
function parseDevice(serialNumber, raw, receivedTimestamp) {
  var _a, _b, _c;
  const gridPower = readNumber(raw.grid_power);
  const batteryPower = readNumber(raw.battery_power);
  return {
    info: {
      serialNumber: readString(raw.sn) || serialNumber,
      sourceTimestamp: readString(raw.data_time),
      receivedTimestamp,
      phase: readNumber(raw.phase),
      lastOnlineFrom: readNumber(raw.last_online_from),
      reportedCycleCount: readNumber(raw.data_cycle)
    },
    live: {
      soc: readNumber(raw.SOC),
      gridVoltage: readNumber(raw.grid_voltage),
      gridPower,
      gridImportPower: gridPower !== null && gridPower > 0 ? gridPower : 0,
      gridExportPower: gridPower !== null && gridPower < 0 ? Math.abs(gridPower) : 0,
      gridDirection: getGridDirection(gridPower),
      batteryPower,
      batteryChargePower: batteryPower !== null && batteryPower < 0 ? Math.abs(batteryPower) : 0,
      batteryDischargePower: batteryPower !== null && batteryPower > 0 ? batteryPower : 0,
      batteryDirection: getBatteryDirection(
        batteryPower
      ),
      pvPower: readNumber(raw.PV_power)
    },
    control: {
      targetChargePower: readNumber(
        raw.charge_energy
      ),
      targetDischargePower: readNumber(
        raw.discharge_energy
      )
    },
    status: {
      connected: readFlag(raw.data_connected),
      on: readFlag(raw.data_on),
      standby: readFlag(raw.data_standby),
      calibration: readFlag(
        raw.data_calibration
      ),
      hardwareError: readFlag(raw.data_hw),
      batteryError: readFlag(raw.data_bat),
      relayError: readFlag(raw.data_relay),
      naProtection: readString(
        raw.data_na_schutz
      ),
      batteryStatusCode: readNumber(
        raw.battery_status
      )
    },
    diagnostics: {
      message1: (_a = raw.message1) != null ? _a : null,
      message2: (_b = raw.message2) != null ? _b : null,
      lastMessages: (_c = raw.last_messages) != null ? _c : null,
      raw: {
        ...raw
      }
    }
  };
}
function parseLiveDataResponse(response, receivedTimestamp = (/* @__PURE__ */ new Date()).toISOString()) {
  if (!Array.isArray(response.data)) {
    return [];
  }
  const devices = [];
  for (const dataEntry of response.data) {
    if (typeof dataEntry !== "object" || dataEntry === null || Array.isArray(dataEntry)) {
      continue;
    }
    for (const [
      serialNumber,
      rawDevice
    ] of Object.entries(dataEntry)) {
      if (typeof rawDevice !== "object" || rawDevice === null || Array.isArray(rawDevice)) {
        continue;
      }
      devices.push(
        parseDevice(
          serialNumber,
          rawDevice,
          receivedTimestamp
        )
      );
    }
  }
  return devices;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseLiveDataResponse
});
//# sourceMappingURL=saxPowerParser.js.map
