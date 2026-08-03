import type {
	SaxPowerDeviceStatistics,
	SaxPowerEnergyChartResponse,
	SaxPowerEnergyRecord,
	SaxPowerEnergyValues,
	SaxPowerStatisticsResult,
} from "./saxPowerHistory";

const EMPTY_VALUES:
SaxPowerEnergyValues = {
	chargedKwh: 0,
	dischargedKwh: 0,
	gridImportKwh: 0,
	gridExportKwh: 0,
	pvKwh: 0,
};

function finiteNumber(
	value: number | null | undefined,
): number {
	if (
		typeof value !== "number" ||
!Number.isFinite(value)
	) {
		return 0;
	}

	return value;
}

function wattHoursToKwh(
	value: number,
): number {
	return value / 1000;
}

function roundKwh(
	value: number,
): number {
	return Math.round(
		(value + Number.EPSILON) *
1000,
	) / 1000;
}

function addValues(
	left: SaxPowerEnergyValues,
	right: SaxPowerEnergyValues,
): SaxPowerEnergyValues {
	return {
		chargedKwh:
roundKwh(
	left.chargedKwh +
right.chargedKwh,
),

		dischargedKwh:
roundKwh(
	left.dischargedKwh +
right.dischargedKwh,
),

		gridImportKwh:
roundKwh(
	left.gridImportKwh +
right.gridImportKwh,
),

		gridExportKwh:
roundKwh(
	left.gridExportKwh +
right.gridExportKwh,
),

		pvKwh:
roundKwh(
	left.pvKwh +
right.pvKwh,
),
	};
}

function recordToValues(
	record: SaxPowerEnergyRecord,
	totalRecord = false,
): SaxPowerEnergyValues {
	const gridImport =
totalRecord
	? finiteNumber(
		record.total_m2,
	)
	: finiteNumber(
		record.m2,
	);

	const gridExport =
totalRecord
	? finiteNumber(
		record.total_m2N,
	)
	: finiteNumber(
		record.m2N,
	);

	const pv =
totalRecord
	? finiteNumber(
		record.total_m4,
	)
	: finiteNumber(
		record.m4,
	);

	const discharged =
totalRecord
	? finiteNumber(
		record.total_m5,
	)
	: finiteNumber(
		record.m5,
	);

	const charged =
totalRecord
	? finiteNumber(
		record.total_m5N,
	)
	: finiteNumber(
		record.m5N,
	);

	return {
		chargedKwh:
roundKwh(
	wattHoursToKwh(
		Math.abs(charged),
	),
),

		dischargedKwh:
roundKwh(
	wattHoursToKwh(
		Math.abs(discharged),
	),
),

		gridImportKwh:
roundKwh(
	wattHoursToKwh(
		Math.abs(gridImport),
	),
),

		gridExportKwh:
roundKwh(
	wattHoursToKwh(
		Math.abs(gridExport),
	),
),

		pvKwh:
roundKwh(
	wattHoursToKwh(
		Math.abs(pv),
	),
),
	};
}

function sumRecords(
	records: SaxPowerEnergyRecord[],
	totalRecords = false,
): SaxPowerEnergyValues {
	return records.reduce(
		(result, record) =>
			addValues(
				result,
				recordToValues(
					record,
					totalRecords,
				),
			),
		{
			...EMPTY_VALUES,
		},
	);
}

function selectTodayRecord(
	records: SaxPowerEnergyRecord[],
	todayIso: string,
): SaxPowerEnergyRecord[] {
	return records.filter(
		(record) =>
			record.de_time ===
todayIso,
	);
}

function getRecords(
	response:
SaxPowerEnergyChartResponse,
	serialNumber: string,
): SaxPowerEnergyRecord[] {
	const records =
response[serialNumber];

	return Array.isArray(records)
		? records
		: [];
}

export function parseDeviceStatistics(
	options: {
serialNumber: string;
todayIso: string;

week:
SaxPowerEnergyChartResponse;

month:
SaxPowerEnergyChartResponse;

year:
SaxPowerEnergyChartResponse;

total:
SaxPowerEnergyChartResponse;
},
): SaxPowerDeviceStatistics {
	const monthRecords =
getRecords(
	options.month,
	options.serialNumber,
);

	return {
		serialNumber:
options.serialNumber,

		today:
sumRecords(
	selectTodayRecord(
		monthRecords,
		options.todayIso,
	),
),

		week:
sumRecords(
	getRecords(
		options.week,
		options.serialNumber,
	),
),

		month:
sumRecords(
	monthRecords,
),

		year:
sumRecords(
	getRecords(
		options.year,
		options.serialNumber,
	),
),

		total:
sumRecords(
	getRecords(
		options.total,
		options.serialNumber,
	),
	true,
),
	};
}

export function aggregateStatistics(
	devices:
Record<
string,
SaxPowerDeviceStatistics
>,
): SaxPowerStatisticsResult {
	const total =
{
	today: {
		...EMPTY_VALUES,
	},
	week: {
		...EMPTY_VALUES,
	},
	month: {
		...EMPTY_VALUES,
	},
	year: {
		...EMPTY_VALUES,
	},
	total: {
		...EMPTY_VALUES,
	},
};

	for (
		const device of
		Object.values(devices)
	) {
		total.today =
addValues(
	total.today,
	device.today,
);

		total.week =
addValues(
	total.week,
	device.week,
);

		total.month =
addValues(
	total.month,
	device.month,
);

		total.year =
addValues(
	total.year,
	device.year,
);

		total.total =
addValues(
	total.total,
	device.total,
);
	}

	return {
		devices,
		total,
	};
}

import type {
	SaxPowerDeviceHistoryMetadata,
	SaxPowerHistoryPeriodMetadata,
	SaxPowerStatisticsMetadata,
} from "./saxPowerHistory";

function timestampOfRecord(
	record: SaxPowerEnergyRecord,
): string {
	if (typeof record.de_time === "string") {
		return record.de_time;
	}

	if (typeof record.me_time === "string") {
		return record.me_time;
	}

	if (
		typeof record.year === "number" &&
Number.isFinite(record.year)
	) {
		return String(record.year);
	}

	return "";
}

function createPeriodMetadata(
	records: SaxPowerEnergyRecord[],
): SaxPowerHistoryPeriodMetadata {
	const timestamps =
records
	.map(timestampOfRecord)
	.filter(Boolean)
	.sort();

	return {
		samples: records.length,

		firstTimestamp:
timestamps[0] ?? "",

		lastTimestamp:
timestamps[
	timestamps.length - 1
] ?? "",

		/*
 * The SAX endpoint returns server-side period aggregates.
 * A defensible percentage cannot be inferred solely from
 * the number of returned records, especially for an active
 * day, week, month or year.
 */
		completeness: 0,

		source:
"sax-power-energy-chart",
	};
}

export function createDeviceHistoryMetadata(
	options: {
serialNumber: string;
todayIso: string;

week:
SaxPowerEnergyChartResponse;

month:
SaxPowerEnergyChartResponse;

year:
SaxPowerEnergyChartResponse;

total:
SaxPowerEnergyChartResponse;
},
): SaxPowerDeviceHistoryMetadata {
	const monthRecords =
getRecords(
	options.month,
	options.serialNumber,
);

	return {
		today:
createPeriodMetadata(
	selectTodayRecord(
		monthRecords,
		options.todayIso,
	),
),

		week:
createPeriodMetadata(
	getRecords(
		options.week,
		options.serialNumber,
	),
),

		month:
createPeriodMetadata(
	monthRecords,
),

		year:
createPeriodMetadata(
	getRecords(
		options.year,
		options.serialNumber,
	),
),

		total:
createPeriodMetadata(
	getRecords(
		options.total,
		options.serialNumber,
	),
),
	};
}

function aggregatePeriodMetadata(
	values:
readonly SaxPowerHistoryPeriodMetadata[],
): SaxPowerHistoryPeriodMetadata {
	const timestamps =
values
	.flatMap(
		(value) => [
			value.firstTimestamp,
			value.lastTimestamp,
		],
	)
	.filter(Boolean)
	.sort();

	return {
		samples:
values.reduce(
	(sum, value) =>
		sum + value.samples,
	0,
),

		firstTimestamp:
timestamps[0] ?? "",

		lastTimestamp:
timestamps[
	timestamps.length - 1
] ?? "",

		completeness: 0,

		source:
"sax-power-energy-chart",
	};
}

export function aggregateHistoryMetadata(
	devices:
Record<
string,
SaxPowerDeviceHistoryMetadata
>,
): SaxPowerStatisticsMetadata {
	const values =
Object.values(devices);

	return {
		devices,

		total: {
			today:
aggregatePeriodMetadata(
	values.map(
		(value) =>
			value.today,
	),
),

			week:
aggregatePeriodMetadata(
	values.map(
		(value) =>
			value.week,
	),
),

			month:
aggregatePeriodMetadata(
	values.map(
		(value) =>
			value.month,
	),
),

			year:
aggregatePeriodMetadata(
	values.map(
		(value) =>
			value.year,
	),
),

			total:
aggregatePeriodMetadata(
	values.map(
		(value) =>
			value.total,
	),
),
		},
	};
}
