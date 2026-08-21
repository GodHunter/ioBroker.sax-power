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
var modbusDiscovery_exports = {};
__export(modbusDiscovery_exports, {
  discoverModbusInstances: () => discoverModbusInstances,
  discoverModbusStates: () => discoverModbusStates
});
module.exports = __toCommonJS(modbusDiscovery_exports);
function normalizeInstance(value) {
  var _a;
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/^modbus\.\d+$/.test(trimmed)) {
    return trimmed;
  }
  const longMatch = trimmed.match(
    /^system\.adapter\.(modbus\.\d+)$/
  );
  return (_a = longMatch == null ? void 0 : longMatch[1]) != null ? _a : "";
}
function discoverModbusInstances(objects) {
  return Object.entries(objects).map(([id, rawObject]) => {
    var _a, _b, _c;
    const instance = normalizeInstance(id);
    if (!instance || typeof rawObject !== "object" || rawObject === null) {
      return null;
    }
    const object = rawObject;
    if (object.type !== "instance") {
      return null;
    }
    const name = readDisplayName(
      (_a = object.common) == null ? void 0 : _a.titleLang,
      readDisplayName((_b = object.common) == null ? void 0 : _b.name, instance)
    );
    const enabled = ((_c = object.common) == null ? void 0 : _c.enabled) === true;
    const suffix = enabled ? "" : " \xB7 disabled";
    return {
      value: instance,
      label: `${name} \u2014 ${instance}${suffix}`,
      enabled
    };
  }).filter((option) => option !== null).sort((left, right) => left.value.localeCompare(right.value, "en", {
    numeric: true
  }));
}
function readDisplayName(value, fallback) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const names = value;
    for (const language of [
      "de",
      "en"
    ]) {
      const name = names[language];
      if (typeof name === "string") {
        return name;
      }
    }
  }
  return fallback;
}
function isNumericState(object) {
  var _a;
  return object.type === "state" && ((_a = object.common) == null ? void 0 : _a.type) === "number";
}
function isWritableState(object) {
  var _a;
  return ((_a = object.common) == null ? void 0 : _a.write) === true;
}
function extractRegisterNumber(id) {
  var _a;
  const stateName = (_a = id.split(".").at(-1)) != null ? _a : "";
  const match = stateName.match(/^(\d+)(?:_|$)/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
function createLabel(id, object) {
  var _a, _b, _c;
  const fallbackName = (_a = id.split(".").at(-1)) != null ? _a : id;
  const name = readDisplayName(
    (_b = object.common) == null ? void 0 : _b.name,
    fallbackName
  );
  const unit = typeof ((_c = object.common) == null ? void 0 : _c.unit) === "string" && object.common.unit ? ` [${object.common.unit}]` : "";
  return `${name}${unit} \u2014 ${id}`;
}
async function discoverModbusStates(readObjects, options) {
  const instance = normalizeInstance(options.instance);
  if (!instance) {
    return [];
  }
  const objects = await readObjects(`${instance}.*`);
  const instancePrefix = `${instance}.`;
  const optionsList = [];
  for (const [
    id,
    rawObject
  ] of Object.entries(objects)) {
    if (!id.startsWith(instancePrefix)) {
      continue;
    }
    if (typeof rawObject !== "object" || rawObject === null) {
      continue;
    }
    const object = rawObject;
    if (!isNumericState(object)) {
      continue;
    }
    const writable = isWritableState(object);
    if (!writable) {
      continue;
    }
    const register = extractRegisterNumber(id);
    const preferred = options.preferredRegister !== void 0 && register === options.preferredRegister;
    optionsList.push({
      value: id,
      label: createLabel(id, object),
      preferred,
      register,
      holdingRegister: id.includes(
        ".holdingRegisters."
      ),
      writable
    });
  }
  optionsList.sort(
    (left, right) => {
      if (left.preferred !== right.preferred) {
        return left.preferred ? -1 : 1;
      }
      if (left.holdingRegister !== right.holdingRegister) {
        return left.holdingRegister ? -1 : 1;
      }
      if (left.register !== null && right.register !== null && left.register !== right.register) {
        return left.register - right.register;
      }
      return left.label.localeCompare(
        right.label,
        "de"
      );
    }
  );
  return optionsList.map(
    ({
      value,
      label
    }) => ({
      value,
      label
    })
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  discoverModbusInstances,
  discoverModbusStates
});
//# sourceMappingURL=modbusDiscovery.js.map
