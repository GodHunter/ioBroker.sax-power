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
var stateEngine_exports = {};
__export(stateEngine_exports, {
  SaxPowerStateEngine: () => SaxPowerStateEngine
});
module.exports = __toCommonJS(stateEngine_exports);
var import_stateDefinitions = require("./stateDefinitions");
var import_statisticsStateEngine = require("./statisticsStateEngine");
const DEVICE_ROOT = "devices";
const CATEGORY_NAMES = {
  info: "Device information",
  live: "Live measurements",
  status: "Device status",
  diagnostics: "Diagnostics"
};
class SaxPowerStateEngine {
  adapter;
  statistics;
  initializedDevices = /* @__PURE__ */ new Set();
  aggregateLiveInitialized = false;
  aggregateLiveCache = /* @__PURE__ */ new Map();
  constructor(adapter) {
    this.adapter = adapter;
    this.statistics = new import_statisticsStateEngine.SaxPowerStatisticsStateEngine(
      adapter
    );
  }
  async writeDevices(devices) {
    await this.ensureRootObject();
    await this.statistics.ensureObjects(
      devices
    );
    for (const device of devices) {
      await this.writeDevice(device);
    }
  }
  async ensureRootObject() {
    await this.adapter.extendObjectAsync(
      DEVICE_ROOT,
      {
        type: "folder",
        common: {
          name: "SAX Power devices"
        },
        native: {}
      }
    );
  }
  async writeDevice(device) {
    const serialNumber = this.sanitizeObjectId(
      device.info.serialNumber
    );
    if (!serialNumber) {
      throw new Error(
        "SAX Power device has no usable serial number."
      );
    }
    if (!this.initializedDevices.has(
      serialNumber
    )) {
      await this.ensureDeviceObjects(
        serialNumber,
        device.info.serialNumber
      );
      this.initializedDevices.add(
        serialNumber
      );
    }
    for (const definition of import_stateDefinitions.saxPowerStateDefinitions) {
      await this.writeState(
        serialNumber,
        definition,
        device
      );
    }
    await this.writeRawDeviceData(
      serialNumber,
      device
    );
  }
  async ensureDeviceObjects(serialNumber, displaySerialNumber) {
    const deviceRoot = `${DEVICE_ROOT}.${serialNumber}`;
    await this.adapter.extendObjectAsync(
      deviceRoot,
      {
        type: "device",
        common: {
          name: `SAX Power ${displaySerialNumber}`
        },
        native: {
          serialNumber: displaySerialNumber
        }
      }
    );
    await this.adapter.delObjectAsync(
      `${deviceRoot}.control`,
      {
        recursive: true
      }
    );
    const categories = new Set(
      import_stateDefinitions.saxPowerStateDefinitions.map(
        (definition) => definition.category
      )
    );
    categories.add("diagnostics");
    for (const category of categories) {
      const name = CATEGORY_NAMES[category];
      if (!name) {
        continue;
      }
      await this.adapter.extendObjectAsync(
        `${deviceRoot}.${category}`,
        {
          type: "channel",
          common: {
            name
          },
          native: {}
        }
      );
    }
    for (const definition of import_stateDefinitions.saxPowerStateDefinitions) {
      await this.ensureStateObject(
        serialNumber,
        definition
      );
    }
    await this.adapter.extendObjectAsync(
      `${deviceRoot}.diagnostics.raw`,
      {
        type: "state",
        common: {
          name: "Raw device data",
          desc: "Complete raw SAX Power device data as JSON.",
          type: "string",
          role: "json",
          read: true,
          write: false,
          def: ""
        },
        native: {
          source: "SAX Power dashboard API"
        }
      }
    );
  }
  async ensureStateObject(serialNumber, definition) {
    var _a;
    const stateId = `${DEVICE_ROOT}.${serialNumber}.${definition.id}`;
    const common = {
      name: definition.name,
      desc: definition.description,
      type: definition.type,
      role: definition.role,
      read: definition.read,
      write: definition.write
    };
    if (definition.unit !== void 0) {
      common.unit = definition.unit;
    }
    await this.adapter.extendObjectAsync(
      stateId,
      {
        type: "state",
        common,
        native: {
          modelPath: definition.modelPath,
          apiField: (_a = definition.apiField) != null ? _a : null,
          category: definition.category
        }
      }
    );
  }
  async writeState(serialNumber, definition, device) {
    const stateId = `${DEVICE_ROOT}.${serialNumber}.${definition.id}`;
    await this.adapter.setStateAsync(
      stateId,
      {
        val: definition.value(
          device
        ),
        ack: true
      }
    );
  }
  async writeRawDeviceData(serialNumber, device) {
    await this.adapter.setStateAsync(
      `${DEVICE_ROOT}.${serialNumber}.diagnostics.raw`,
      {
        val: JSON.stringify(
          device.diagnostics.raw
        ),
        ack: true
      }
    );
  }
  async writeAggregateLiveData(devices) {
    var _a, _b, _c, _d;
    if (!this.aggregateLiveInitialized) {
      await this.ensureAggregateLiveObjects();
      this.aggregateLiveInitialized = true;
    }
    const batteryValues = devices.map(
      (device) => device.live.batteryPower
    ).filter(
      (value) => typeof value === "number"
    );
    const socValues = devices.map(
      (device) => device.live.soc
    ).filter(
      (value) => typeof value === "number"
    );
    const pvPower = (_b = (_a = devices.find(
      (device) => typeof device.live.pvPower === "number"
    )) == null ? void 0 : _a.live.pvPower) != null ? _b : null;
    const gridPower = (_d = (_c = devices.find(
      (device) => typeof device.live.gridPower === "number"
    )) == null ? void 0 : _c.live.gridPower) != null ? _d : null;
    const batteryPower = batteryValues.length > 0 ? batteryValues.reduce(
      (sum, value) => sum + value,
      0
    ) : null;
    const soc = socValues.length > 0 ? socValues.reduce(
      (sum, value) => sum + value,
      0
    ) / socValues.length : null;
    const houseConsumptionPower = pvPower !== null && gridPower !== null && batteryPower !== null ? Math.max(
      0,
      pvPower + gridPower + batteryPower
    ) : null;
    const gridDirection = gridPower === null || gridPower === 0 ? "idle" : gridPower > 0 ? "import" : "export";
    const batteryDirection = batteryPower === null || batteryPower === 0 ? "idle" : batteryPower > 0 ? "discharging" : "charging";
    const values = {
      "live.pvPower": pvPower,
      "live.houseConsumptionPower": houseConsumptionPower,
      "live.gridPower": gridPower,
      "live.gridDirection": gridDirection,
      "live.batteryPower": batteryPower,
      "live.batteryDirection": batteryDirection,
      "live.soc": soc,
      "live.deviceCount": devices.length,
      "live.lastUpdate": (/* @__PURE__ */ new Date()).toISOString()
    };
    for (const [id, value] of Object.entries(values)) {
      if (this.aggregateLiveCache.get(id) === value) {
        continue;
      }
      await this.adapter.setStateAsync(
        id,
        {
          val: value,
          ack: true
        }
      );
      this.aggregateLiveCache.set(
        id,
        value
      );
    }
  }
  async observeBatteryHealth(devices, batteryModels) {
    await this.statistics.observeBatteryHealth(devices, batteryModels);
  }
  async ensureAggregateLiveObjects() {
    await this.adapter.extendObjectAsync(
      "live",
      {
        type: "channel",
        common: {
          name: "Combined live measurements"
        },
        native: {}
      }
    );
    const definitions = {
      pvPower: {
        name: "PV power",
        desc: "Current photovoltaic production power.",
        type: "number",
        role: "value.power.produced",
        unit: "W"
      },
      houseConsumptionPower: {
        name: "House consumption power",
        desc: "Calculated current house consumption.",
        type: "number",
        role: "value.power.consumed",
        unit: "W"
      },
      gridPower: {
        name: "Grid power",
        desc: "Positive values indicate import; negative values indicate export.",
        type: "number",
        role: "value.power",
        unit: "W"
      },
      gridDirection: {
        name: "Grid direction",
        desc: "Current grid energy direction.",
        type: "string",
        role: "text"
      },
      batteryPower: {
        name: "Battery power",
        desc: "Positive values indicate discharge; negative values indicate charging.",
        type: "number",
        role: "value.power",
        unit: "W"
      },
      batteryDirection: {
        name: "Battery direction",
        desc: "Current combined battery energy direction.",
        type: "string",
        role: "text"
      },
      soc: {
        name: "Average state of charge",
        desc: "Average state of charge across all available storage devices.",
        type: "number",
        role: "value.battery",
        unit: "%"
      },
      deviceCount: {
        name: "Device count",
        desc: "Number of storage devices included in the live aggregation.",
        type: "number",
        role: "value"
      },
      lastUpdate: {
        name: "Last update",
        desc: "Timestamp of the last successful live aggregation.",
        type: "string",
        role: "date"
      }
    };
    for (const [id, common] of Object.entries(definitions)) {
      await this.adapter.extendObjectAsync(
        `live.${id}`,
        {
          type: "state",
          common: {
            ...common,
            read: true,
            write: false
          },
          native: {
            aggregate: true
          }
        }
      );
    }
  }
  async writeStatistics(result, metadata, updatedAt, batteryModels, reportedCycles) {
    await this.statistics.writeStatistics(
      result,
      metadata,
      updatedAt,
      batteryModels,
      reportedCycles
    );
  }
  async writeStatisticsError(message) {
    await this.statistics.writeError(
      message
    );
  }
  sanitizeObjectId(value) {
    return value.trim().replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SaxPowerStateEngine
});
//# sourceMappingURL=stateEngine.js.map
