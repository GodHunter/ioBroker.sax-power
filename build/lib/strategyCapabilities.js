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
var strategyCapabilities_exports = {};
__export(strategyCapabilities_exports, {
  discoverStrategyCapabilities: () => discoverStrategyCapabilities
});
module.exports = __toCommonJS(strategyCapabilities_exports);
const MODE_REQUIREMENTS = Object.freeze({
  chargingControl: [
    { register: 44, access: "write" },
    { register: 45, access: "read" },
    { register: 46, access: "read" },
    { register: 47, access: "read" },
    { register: 48, access: "read" }
  ],
  dayAvailability: [
    { register: 45, access: "read" },
    { register: 46, access: "read" },
    { register: 47, access: "read" },
    { register: 48, access: "read" }
  ],
  nightDischarge: [
    { register: 43, access: "write" },
    { register: 45, access: "read" },
    { register: 46, access: "read" },
    { register: 47, access: "read" },
    { register: 48, access: "read" }
  ]
});
function registerNumber(stateId) {
  var _a;
  const stateName = (_a = stateId.split(".").at(-1)) != null ? _a : "";
  const match = stateName.match(/^(4[3-8])(?:_|$)/);
  return match ? Number(match[1]) : null;
}
function providesDocumentedAccess(register, object) {
  var _a, _b;
  if (register === 43 || register === 44) return ((_a = object.common) == null ? void 0 : _a.write) === true;
  return ((_b = object.common) == null ? void 0 : _b.read) === true;
}
function modeCapability(id, registers) {
  const missingRegisters = MODE_REQUIREMENTS[id].filter((requirement) => {
    const register = registers.find((item) => item.register === requirement.register);
    return register === void 0 || (requirement.access === "read" ? !register.readable : !register.writable);
  }).map((requirement) => requirement.register);
  const hardwareSupported = missingRegisters.length === 0;
  const implemented = id !== "nightDischarge";
  return Object.freeze({
    id,
    hardwareSupported,
    implemented,
    selectable: hardwareSupported && implemented,
    missingRegisters: Object.freeze(missingRegisters),
    reason: !hardwareSupported ? "missing-registers" : implemented ? "available" : "not-implemented"
  });
}
function discoverStrategyCapabilities(instance, objects) {
  if (!/^modbus\.\d+$/.test(instance)) return null;
  const registers = Array.from({ length: 6 }, (_, index) => index + 43).map((register) => {
    var _a, _b, _c;
    const candidates = Object.entries(objects).filter(([id, object]) => id.startsWith(`${instance}.`) && registerNumber(id) === register && typeof object === "object" && object !== null).map(([stateId, object]) => ({
      stateId,
      object
    })).filter(({ object }) => {
      var _a2;
      return object.type === "state" && ((_a2 = object.common) == null ? void 0 : _a2.type) === "number";
    }).sort((left, right) => {
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
      stateId: (_a = candidate == null ? void 0 : candidate.stateId) != null ? _a : null,
      readable: ((_b = candidate == null ? void 0 : candidate.object.common) == null ? void 0 : _b.read) === true,
      writable: ((_c = candidate == null ? void 0 : candidate.object.common) == null ? void 0 : _c.write) === true
    });
  });
  return Object.freeze({
    instance,
    registers: Object.freeze(registers),
    modes: Object.freeze([
      "chargingControl",
      "dayAvailability",
      "nightDischarge"
    ].map((id) => modeCapability(id, registers)))
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  discoverStrategyCapabilities
});
//# sourceMappingURL=strategyCapabilities.js.map
