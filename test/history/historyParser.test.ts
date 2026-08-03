import {
	deepStrictEqual,
	equal,
	ok,
} from "node:assert";

import {
	readFileSync,
} from "node:fs";

import {
	join,
} from "node:path";

import {
	describe,
	it,
} from "mocha";

import {
	aggregateHistoryMetadata,
	aggregateStatistics,
	createDeviceHistoryMetadata,
	parseDeviceStatistics,
} from "../../src/lib/saxPowerHistoryParser";

import type {
	SaxPowerEnergyChartResponse,
} from "../../src/lib/saxPowerHistory";

const SERIAL_NUMBER =
"1012401057";

function loadFixture(
	name: string,
): SaxPowerEnergyChartResponse {
	return JSON.parse(
		readFileSync(
			join(
				__dirname,
				"fixtures",
				name,
			),
			"utf-8",
		),
	) as SaxPowerEnergyChartResponse;
}

describe(
	"SAX Power history parser",
	() => {
		const week =
loadFixture(
	"energy-chart-week_2026-08-03.json",
);

		const month =
loadFixture(
	"energy-chart-month_2026-08-03.json",
);

		const year =
loadFixture(
	"energy-chart-year_2026-08-03.json",
);

		const total =
loadFixture(
	"energy-chart-total_2026-08-03.json",
);

		const statistics =
parseDeviceStatistics({
	serialNumber:
SERIAL_NUMBER,
	todayIso:
"2026-08-03",
	week,
	month,
	year,
	total,
});

		it(
			"maps negative battery energy to charged kWh",
			() => {
				equal(
					statistics.today
						.chargedKwh,
					4.202,
				);
			},
		);

		it(
			"maps positive battery energy to discharged kWh",
			() => {
				equal(
					statistics.today
						.dischargedKwh,
					3.346,
				);
			},
		);

		it(
			"reads today's values from the monthly response",
			() => {
				deepStrictEqual(
					statistics.today,
					{
						chargedKwh:
4.202,

						dischargedKwh:
3.346,

						gridImportKwh:
0.048,

						gridExportKwh:
47.248,

						pvKwh: 0,
					},
				);
			},
		);

		it(
			"calculates plausible total battery efficiency",
			() => {
				const efficiency =
statistics.total
	.dischargedKwh /
statistics.total
	.chargedKwh;

				ok(
					efficiency >
0.85 &&
efficiency <
0.95,
				);
			},
		);

		it(
			"aggregates multiple devices",
			() => {
				const aggregated =
aggregateStatistics({
	[SERIAL_NUMBER]:
statistics,

	"second-device":
{
	...statistics,

	serialNumber:
"second-device",
},
});

				equal(
					aggregated.total
						.today
						.chargedKwh,
					8.404,
				);

				equal(
					aggregated.total
						.today
						.dischargedKwh,
					6.692,
				);
			},
		);
	},
);

describe(
	"SAX Power history metadata",
	() => {
		it(
			"creates metadata for all periods",
			async () => {
				const week =
loadFixture(
	"energy-chart-week_2026-08-03.json",
);

				const month =
loadFixture(
	"energy-chart-month_2026-08-03.json",
);

				const year =
loadFixture(
	"energy-chart-year_2026-08-03.json",
);

				const total =
loadFixture(
	"energy-chart-total_2026-08-03.json",
);

				const metadata =
createDeviceHistoryMetadata({
	serialNumber:
SERIAL_NUMBER,
	todayIso:
"2026-08-03",
	week,
	month,
	year,
	total,
});

				equal(
					metadata.today.samples,
					1,
				);

				equal(
					metadata.week.samples,
					8,
				);

				equal(
					metadata.month.samples,
					3,
				);

				equal(
					metadata.year.samples,
					8,
				);

				equal(
					metadata.total.samples,
					2,
				);

				equal(
					metadata.today
						.firstTimestamp,
					"2026-08-03",
				);

				const aggregate =
aggregateHistoryMetadata({
	[SERIAL_NUMBER]:
metadata,
});

				equal(
					aggregate.total
						.week.samples,
					8,
				);

				equal(
					aggregate.total
						.total
						.firstTimestamp,
					"2025",
				);
			},
		);
	},
);
