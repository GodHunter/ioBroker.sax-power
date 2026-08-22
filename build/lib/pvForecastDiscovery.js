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
var pvForecastDiscovery_exports = {};
__export(pvForecastDiscovery_exports, {
  discoverPvForecastInstances: () => discoverPvForecastInstances,
  inspectPvForecastCapabilities: () => inspectPvForecastCapabilities
});
module.exports = __toCommonJS(pvForecastDiscovery_exports);
const REQUIRED_SUFFIXES = Object.freeze([
  "summary.energy.nowUntilEndOfDay",
  "summary.energy.today",
  "summary.energy.tomorrow",
  "summary.lastUpdated"
]);
function displayName(value, fallback) {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const names = value;
    for (const language of ["de", "en"]) {
      const name = names[language];
      if (typeof name === "string" && name.trim() !== "") {
        return name;
      }
    }
  }
  return fallback;
}
function normalizeInstance(id) {
  var _a, _b;
  const trimmed = id.trim();
  if (/^pvforecast\.\d+$/.test(trimmed)) {
    return trimmed;
  }
  return (_b = (_a = trimmed.match(
    /^system\.adapter\.(pvforecast\.\d+)$/
  )) == null ? void 0 : _a[1]) != null ? _b : "";
}
function discoverPvForecastInstances(objects) {
  return Object.entries(objects).map(([id, rawObject]) => {
    var _a, _b, _c;
    const instance = normalizeInstance(id);
    if (instance === "" || typeof rawObject !== "object" || rawObject === null) {
      return null;
    }
    const object = rawObject;
    if (object.type !== "instance") {
      return null;
    }
    const name = displayName(
      (_a = object.common) == null ? void 0 : _a.titleLang,
      displayName((_b = object.common) == null ? void 0 : _b.name, instance)
    );
    const enabled = ((_c = object.common) == null ? void 0 : _c.enabled) === true;
    return {
      value: instance,
      label: `${name} \u2014 ${instance}${enabled ? "" : " \xB7 disabled"}`,
      enabled
    };
  }).filter(
    (option) => option !== null
  ).sort(
    (left, right) => left.value.localeCompare(right.value, "en", {
      numeric: true
    })
  );
}
function inspectPvForecastCapabilities(instance, objects) {
  const normalized = normalizeInstance(instance);
  if (!/^pvforecast\.\d+$/.test(normalized)) {
    return null;
  }
  const states = REQUIRED_SUFFIXES.map((suffix) => {
    const stateId = `${normalized}.${suffix}`;
    return Object.freeze({
      stateId,
      available: Object.hasOwn(objects, stateId)
    });
  });
  const missingStateIds = states.filter((state) => !state.available).map((state) => state.stateId);
  return Object.freeze({
    instance: normalized,
    compatible: missingStateIds.length === 0,
    states: Object.freeze(states),
    missingStateIds: Object.freeze(missingStateIds)
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  discoverPvForecastInstances,
  inspectPvForecastCapabilities
});
//# sourceMappingURL=pvForecastDiscovery.js.map
