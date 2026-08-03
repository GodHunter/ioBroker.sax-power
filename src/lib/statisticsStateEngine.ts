import type {
	SaxPowerObjectAdapter,
} from "./adapterContract";

import type {
	SaxPowerDevice,
} from "./saxPowerDevice";

import type {
	SaxPowerDeviceHistoryMetadata,
	SaxPowerDeviceStatistics,
	SaxPowerEnergyValues,
	SaxPowerHistoryPeriodMetadata,
	SaxPowerStatisticsMetadata,
	SaxPowerStatisticsResult,
} from "./saxPowerHistory";

const STATISTICS_PERIODS = [
	"day",
	"week",
	"month",
	"year",
	"total",
] as const;

type StatisticsPeriod =
(typeof STATISTICS_PERIODS)[number];

type ModelPeriod =
| "today"
| "week"
| "month"
| "year"
| "total";

const PERIOD_MODEL_MAP:
Record<StatisticsPeriod, ModelPeriod> = {
	day: "today",
	week: "week",
	month: "month",
	year: "year",
	total: "total",
};

const PLACEHOLDER_SOURCE =
"pending-history-discovery";

interface StatisticsStateCommon {
name: string;
desc: string;
type: "number" | "string";
role: string;
unit?: string;
def?: number | string;
}

export class SaxPowerStatisticsStateEngine {
	private readonly adapter:
SaxPowerObjectAdapter;

	private aggregateInitialized = false;

	private readonly initializedDevices =
		new Set<string>();

	private readonly stateCache =
		new Map<
string,
string | number
>();

	public constructor(
		adapter: SaxPowerObjectAdapter,
	) {
		this.adapter = adapter;
	}

	public async ensureObjects(
		devices: readonly SaxPowerDevice[],
	): Promise<void> {
		if (!this.aggregateInitialized) {
			await this.ensureStatisticsTree(
				"statistics",
				true,
			);

			this.aggregateInitialized = true;
		}

		for (const device of devices) {
			const serialNumber =
this.sanitizeObjectId(
	device.info.serialNumber,
);

			if (
				!serialNumber ||
this.initializedDevices.has(
	serialNumber,
)
			) {
				continue;
			}

			await this.ensureStatisticsTree(
				`devices.${serialNumber}.statistics`,
				false,
			);

			this.initializedDevices.add(
				serialNumber,
			);
		}

		await this.writeCachedState(
			"statistics.info.deviceCount",
			devices.length,
		);
	}

	public async writeStatistics(
		result: SaxPowerStatisticsResult,
		metadata: SaxPowerStatisticsMetadata,
		updatedAt: string,
	): Promise<void> {
		for (
			const [
				serialNumber,
				deviceStatistics,
			]
			of Object.entries(
				result.devices,
			)
		) {
			const safeSerial =
this.sanitizeObjectId(
	serialNumber,
);

			if (!safeSerial) {
				continue;
			}

			const deviceMetadata =
metadata.devices[
	serialNumber
];

			if (!deviceMetadata) {
				continue;
			}

			await this.writeStatisticsTree(
				`devices.${safeSerial}.statistics`,
				deviceStatistics,
				deviceMetadata,
				updatedAt,
			);
		}

		await this.writeStatisticsTree(
			"statistics",
			{
				serialNumber:
"aggregate",

				...result.total,
			},
			metadata.total,
			updatedAt,
		);

		await this.writeCachedState(
			"statistics.info.deviceCount",
			Object.keys(
				result.devices,
			).length,
		);
	}

	public async writeError(
		message: string,
	): Promise<void> {
		await this.writeCachedState(
			"statistics.info.lastError",
			message,
		);
	}

	private async writeStatisticsTree(
		rootId: string,
		statistics: SaxPowerDeviceStatistics,
		metadata: SaxPowerDeviceHistoryMetadata,
		updatedAt: string,
	): Promise<void> {
		for (
			const statePeriod
			of STATISTICS_PERIODS
		) {
			const modelPeriod =
PERIOD_MODEL_MAP[
	statePeriod
];

			await this.writePeriod(
				`${rootId}.${statePeriod}`,
				statistics[
					modelPeriod
				],
				metadata[
					modelPeriod
				],
			);
		}

		const firstMeasurement =
[
	metadata.total
		.firstTimestamp,
	metadata.year
		.firstTimestamp,
	metadata.month
		.firstTimestamp,
	metadata.week
		.firstTimestamp,
	metadata.today
		.firstTimestamp,
]
	.filter(Boolean)
	.sort()[0] ?? "";

		await this.writeCachedState(
			`${rootId}.info.firstMeasurement`,
			firstMeasurement,
		);

		await this.writeCachedState(
			`${rootId}.info.lastUpdate`,
			updatedAt,
		);

		await this.writeCachedState(
			`${rootId}.info.source`,
			"sax-power-energy-chart",
		);

		await this.writeCachedState(
			`${rootId}.info.lastError`,
			"",
		);
	}

	private async writePeriod(
		periodId: string,
		values: SaxPowerEnergyValues,
		metadata: SaxPowerHistoryPeriodMetadata,
	): Promise<void> {
		await this.writeCachedState(
			`${periodId}.chargedEnergy`,
			values.chargedKwh,
		);

		await this.writeCachedState(
			`${periodId}.dischargedEnergy`,
			values.dischargedKwh,
		);


		await this.writeCachedState(
			`${periodId}.firstTimestamp`,
			metadata.firstTimestamp,
		);

		await this.writeCachedState(
			`${periodId}.lastTimestamp`,
			metadata.lastTimestamp,
		);


	}

	private async writeCachedState(
		id: string,
		value: string | number,
	): Promise<void> {
		if (
			this.stateCache.get(id) ===
value
		) {
			return;
		}

		await this.adapter.setStateAsync(
			id,
			{
				val: value,
				ack: true,
			},
		);

		this.stateCache.set(
			id,
			value,
		);
	}

	private async ensureStatisticsTree(
		rootId: string,
		aggregate: boolean,
	): Promise<void> {
		await this.adapter.extendObjectAsync(
			rootId,
			{
				type: "channel",
				common: {
					name: aggregate
						? "Combined energy statistics"
						: "Energy statistics",
				},
				native: {},
			},
		);

		for (
			const period
			of STATISTICS_PERIODS
		) {
			await this.ensurePeriod(
				rootId,
				period,
			);
		}

		await this.ensureInfoChannel(
			rootId,
			aggregate,
		);
	}

	private async ensurePeriod(
		rootId: string,
		period: StatisticsPeriod,
	): Promise<void> {
		const periodId =
`${rootId}.${period}`;

		await this.removeLegacyPeriodStates(
			periodId,
		);

		await this.adapter.extendObjectAsync(
			periodId,
			{
				type: "channel",
				common: {
					name:
`${this.capitalize(period)} statistics`,
				},
				native: {
					period,
				},
			},
		);

		await this.ensureState(
			`${periodId}.chargedEnergy`,
			{
				name: "Charged energy",
				desc:
"Battery energy charged during this period.",
				type: "number",
				role: "value.energy",
				unit: "kWh",
			},
		);

		await this.ensureState(
			`${periodId}.dischargedEnergy`,
			{
				name: "Discharged energy",
				desc:
"Battery energy discharged during this period.",
				type: "number",
				role: "value.energy",
				unit: "kWh",
			},
		);


		await this.ensureState(
			`${periodId}.firstTimestamp`,
			{
				name: "First timestamp",
				desc:
"First included historical measurement.",
				type: "string",
				role: "date",
				def: "",
			},
		);

		await this.ensureState(
			`${periodId}.lastTimestamp`,
			{
				name: "Last timestamp",
				desc:
"Last included historical measurement.",
				type: "string",
				role: "date",
				def: "",
			},
		);


	}

	private async ensureInfoChannel(
		rootId: string,
		aggregate: boolean,
	): Promise<void> {
		const infoId =
`${rootId}.info`;

		await this.adapter.extendObjectAsync(
			infoId,
			{
				type: "channel",
				common: {
					name:
"Statistics information",
				},
				native: {},
			},
		);

		await this.ensureState(
			`${infoId}.firstMeasurement`,
			{
				name: "First measurement",
				desc:
"Earliest available historical measurement.",
				type: "string",
				role: "date",
				def: "",
			},
		);

		await this.ensureState(
			`${infoId}.lastUpdate`,
			{
				name: "Last update",
				desc:
"Last successful statistics update.",
				type: "string",
				role: "date",
				def: "",
			},
		);

		await this.ensureState(
			`${infoId}.source`,
			{
				name: "Source",
				desc:
"Historical source used by the statistics engine.",
				type: "string",
				role: "text",
				def: PLACEHOLDER_SOURCE,
			},
		);

		await this.ensureState(
			`${infoId}.lastError`,
			{
				name: "Last error",
				desc:
"Last history or statistics error.",
				type: "string",
				role: "text",
				def: "",
			},
		);

		if (aggregate) {
			await this.ensureState(
				`${infoId}.deviceCount`,
				{
					name: "Device count",
					desc:
"Storage devices included in the aggregate.",
					type: "number",
					role: "value",
					def: 0,
				},
			);
		}
	}


	private async removeLegacyPeriodStates(
		periodId: string,
	): Promise<void> {
		for (
			const stateName
			of [
				"samples",
				"source",
				"completeness",
			]
		) {
			try {
				await this.adapter.delObjectAsync(
					`${periodId}.${stateName}`,
				);
			} catch {
				/*
 * Auf Neuinstallationen existieren
 * diese Altobjekte erwartungsgemäß nicht.
 */
			}

			this.stateCache.delete(
				`${periodId}.${stateName}`,
			);
		}
	}


	private async ensureState(
		id: string,
		common: StatisticsStateCommon,
	): Promise<void> {
		await this.adapter.extendObjectAsync(
			id,
			{
				type: "state",
				common: {
					...common,
					read: true,
					write: false,
				},
				native: {
					statisticsVersion: 1,
				},
			},
		);
	}

	private sanitizeObjectId(
		value: string,
	): string {
		return value
			.trim()
			.replace(
				/[^a-zA-Z0-9_-]/g,
				"_",
			);
	}

	private capitalize(
		value: string,
	): string {
		return (
			value.charAt(0).toUpperCase() +
value.slice(1)
		);
	}
}
