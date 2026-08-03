import type {
	SaxPowerObjectAdapter,
} from "./adapterContract";

import type {
	SaxPowerDevice,
} from "./saxPowerDevice";

const STATISTICS_PERIODS = [
	"day",
	"week",
	"month",
	"year",
	"total",
] as const;

type StatisticsPeriod =
(typeof STATISTICS_PERIODS)[number];

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

		await this.adapter.setStateAsync(
			"statistics.info.deviceCount",
			{
				val: devices.length,
				ack: true,
			},
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
			`${periodId}.samples`,
			{
				name: "Samples",
				desc:
"Number of historical samples used.",
				type: "number",
				role: "value",
				def: 0,
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

		await this.ensureState(
			`${periodId}.completeness`,
			{
				name: "Completeness",
				desc:
"Estimated completeness of this period.",
				type: "number",
				role: "value",
				unit: "%",
				def: 0,
			},
		);

		await this.ensureState(
			`${periodId}.source`,
			{
				name: "Source",
				desc:
"Historical source used for this statistic.",
				type: "string",
				role: "text",
				def: PLACEHOLDER_SOURCE,
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
					name: "Statistics information",
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
