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
var saxPowerHistoryParser_exports = {};
__export(saxPowerHistoryParser_exports, {
  aggregateHistoryMetadata: () => aggregateHistoryMetadata,
  aggregateStatistics: () => aggregateStatistics,
  createDeviceHistoryMetadata: () => createDeviceHistoryMetadata,
  parseDeviceStatistics: () => parseDeviceStatistics
});
module.exports = __toCommonJS(saxPowerHistoryParser_exports);
const EMPTY_VALUES = {
  chargedKwh: 0,
  dischargedKwh: 0,
  gridImportKwh: 0,
  gridExportKwh: 0,
  pvKwh: 0
};
function finiteNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}
function wattHoursToKwh(value) {
  return value / 1e3;
}
function roundKwh(value) {
  return Math.round(
    (value + Number.EPSILON) * 1e3
  ) / 1e3;
}
function addValues(left, right) {
  return {
    chargedKwh: roundKwh(
      left.chargedKwh + right.chargedKwh
    ),
    dischargedKwh: roundKwh(
      left.dischargedKwh + right.dischargedKwh
    ),
    gridImportKwh: roundKwh(
      left.gridImportKwh + right.gridImportKwh
    ),
    gridExportKwh: roundKwh(
      left.gridExportKwh + right.gridExportKwh
    ),
    pvKwh: roundKwh(
      left.pvKwh + right.pvKwh
    )
  };
}
function recordToValues(record, totalRecord = false) {
  const gridImport = totalRecord ? finiteNumber(
    record.total_m2
  ) : finiteNumber(
    record.m2
  );
  const gridExport = totalRecord ? finiteNumber(
    record.total_m2N
  ) : finiteNumber(
    record.m2N
  );
  const pv = totalRecord ? finiteNumber(
    record.total_m4
  ) : finiteNumber(
    record.m4
  );
  const discharged = totalRecord ? finiteNumber(
    record.total_m5
  ) : finiteNumber(
    record.m5
  );
  const charged = totalRecord ? finiteNumber(
    record.total_m5N
  ) : finiteNumber(
    record.m5N
  );
  return {
    chargedKwh: roundKwh(
      wattHoursToKwh(
        Math.abs(charged)
      )
    ),
    dischargedKwh: roundKwh(
      wattHoursToKwh(
        Math.abs(discharged)
      )
    ),
    gridImportKwh: roundKwh(
      wattHoursToKwh(
        Math.abs(gridImport)
      )
    ),
    gridExportKwh: roundKwh(
      wattHoursToKwh(
        Math.abs(gridExport)
      )
    ),
    pvKwh: roundKwh(
      wattHoursToKwh(
        Math.abs(pv)
      )
    )
  };
}
function sumRecords(records, totalRecords = false) {
  return records.reduce(
    (result, record) => addValues(
      result,
      recordToValues(
        record,
        totalRecords
      )
    ),
    {
      ...EMPTY_VALUES
    }
  );
}
function selectTodayRecord(records, todayIso) {
  return records.filter(
    (record) => record.de_time === todayIso
  );
}
function getRecords(response, serialNumber) {
  const records = response[serialNumber];
  return Array.isArray(records) ? records : [];
}
function parseDeviceStatistics(options) {
  const monthRecords = getRecords(
    options.month,
    options.serialNumber
  );
  return {
    serialNumber: options.serialNumber,
    today: sumRecords(
      selectTodayRecord(
        monthRecords,
        options.todayIso
      )
    ),
    week: sumRecords(
      getRecords(
        options.week,
        options.serialNumber
      )
    ),
    month: sumRecords(
      monthRecords
    ),
    year: sumRecords(
      getRecords(
        options.year,
        options.serialNumber
      )
    ),
    total: sumRecords(
      getRecords(
        options.total,
        options.serialNumber
      ),
      true
    )
  };
}
function aggregateStatistics(devices) {
  const total = {
    today: {
      ...EMPTY_VALUES
    },
    week: {
      ...EMPTY_VALUES
    },
    month: {
      ...EMPTY_VALUES
    },
    year: {
      ...EMPTY_VALUES
    },
    total: {
      ...EMPTY_VALUES
    }
  };
  for (const device of Object.values(devices)) {
    total.today = addValues(
      total.today,
      device.today
    );
    total.week = addValues(
      total.week,
      device.week
    );
    total.month = addValues(
      total.month,
      device.month
    );
    total.year = addValues(
      total.year,
      device.year
    );
    total.total = addValues(
      total.total,
      device.total
    );
  }
  return {
    devices,
    total
  };
}
function timestampOfRecord(record) {
  if (typeof record.de_time === "string") {
    return record.de_time;
  }
  if (typeof record.me_time === "string") {
    return record.me_time;
  }
  if (typeof record.year === "number" && Number.isFinite(record.year)) {
    return `${record.year}-01-01`;
  }
  return "";
}
function createPeriodMetadata(records, expectedSamples) {
  var _a, _b;
  const timestamps = records.map(timestampOfRecord).filter(Boolean).sort();
  const completeness = expectedSamples > 0 ? Math.min(
    100,
    Math.round(
      records.length / expectedSamples * 100
    )
  ) : 0;
  return {
    samples: records.length,
    firstTimestamp: (_a = timestamps[0]) != null ? _a : "",
    lastTimestamp: (_b = timestamps[timestamps.length - 1]) != null ? _b : "",
    completeness,
    source: "sax-power-energy-chart"
  };
}
function parseIsoDate(value) {
  const parsed = /* @__PURE__ */ new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(
    parsed.getTime()
  )) {
    throw new Error(
      `Invalid SAX Power history date: ${value}`
    );
  }
  return parsed;
}
function expectedElapsedWeekDays(todayIso) {
  const date = parseIsoDate(todayIso);
  const weekday = date.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}
function expectedElapsedMonthDays(todayIso) {
  return parseIsoDate(
    todayIso
  ).getUTCDate();
}
function expectedElapsedYearMonths(todayIso) {
  return parseIsoDate(
    todayIso
  ).getUTCMonth() + 1;
}
function createDeviceHistoryMetadata(options) {
  const monthRecords = getRecords(
    options.month,
    options.serialNumber
  );
  return {
    today: createPeriodMetadata(
      selectTodayRecord(
        monthRecords,
        options.todayIso
      ),
      1
    ),
    week: createPeriodMetadata(
      getRecords(
        options.week,
        options.serialNumber
      ),
      expectedElapsedWeekDays(
        options.todayIso
      )
    ),
    month: createPeriodMetadata(
      monthRecords,
      expectedElapsedMonthDays(
        options.todayIso
      )
    ),
    year: createPeriodMetadata(
      getRecords(
        options.year,
        options.serialNumber
      ),
      expectedElapsedYearMonths(
        options.todayIso
      )
    ),
    total: createPeriodMetadata(
      getRecords(
        options.total,
        options.serialNumber
      ),
      getRecords(
        options.total,
        options.serialNumber
      ).length || 1
    )
  };
}
function aggregatePeriodMetadata(values) {
  var _a, _b;
  const timestamps = values.flatMap(
    (value) => [
      value.firstTimestamp,
      value.lastTimestamp
    ]
  ).filter(Boolean).sort();
  return {
    samples: values.reduce(
      (sum, value) => sum + value.samples,
      0
    ),
    firstTimestamp: (_a = timestamps[0]) != null ? _a : "",
    lastTimestamp: (_b = timestamps[timestamps.length - 1]) != null ? _b : "",
    completeness: values.length > 0 ? Math.round(
      values.reduce(
        (sum, value) => sum + value.completeness,
        0
      ) / values.length
    ) : 0,
    source: "sax-power-energy-chart"
  };
}
function aggregateHistoryMetadata(devices) {
  const values = Object.values(devices);
  return {
    devices,
    total: {
      today: aggregatePeriodMetadata(
        values.map(
          (value) => value.today
        )
      ),
      week: aggregatePeriodMetadata(
        values.map(
          (value) => value.week
        )
      ),
      month: aggregatePeriodMetadata(
        values.map(
          (value) => value.month
        )
      ),
      year: aggregatePeriodMetadata(
        values.map(
          (value) => value.year
        )
      ),
      total: aggregatePeriodMetadata(
        values.map(
          (value) => value.total
        )
      )
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  aggregateHistoryMetadata,
  aggregateStatistics,
  createDeviceHistoryMetadata,
  parseDeviceStatistics
});
//# sourceMappingURL=saxPowerHistoryParser.js.map
