import * as utils from "@iobroker/adapter-core";

import {
	SaxPowerApiClient,
	SaxPowerApiError,
	type SaxPowerLiveDataResponse,
} from "./lib/saxPowerApiClient";


import {
	SaxPowerErrorClassifier,
} from "./lib/saxPowerErrorClassifier";

import type {
	SaxPowerConnectionResult,
} from "./lib/saxPowerConnectionResult";

import {
	createConnectionStateValues,
} from "./lib/saxPowerConnectionStateValues";

import {
	parseLiveDataResponse,
} from "./lib/saxPowerParser";

import type {
	SaxPowerDevice,
} from "./lib/saxPowerDevice";

import {
	aggregateHistoryMetadata,
	aggregateStatistics,
	createDeviceHistoryMetadata,
	parseDeviceStatistics,
} from "./lib/saxPowerHistoryParser";

import type {
	SaxPowerDeviceHistoryMetadata,
	SaxPowerDeviceStatistics,
} from "./lib/saxPowerHistory";


import {
	SaxPowerStateEngine,
} from "./lib/stateEngine";

import {
	discoverModbusStates,
} from "./lib/modbusDiscovery";

interface SaxPowerAdapterConfig {
apiUrl: string;
username: string;
password: string;
pollInterval: number;

modbusControlEnabled: boolean;
modbusInstance: string;
modbusChargePowerStateId: string;
modbusDischargePowerStateId: string;
}

class SaxPower extends utils.Adapter {
	private apiClient: SaxPowerApiClient | undefined;
	private stateEngine: SaxPowerStateEngine | undefined;
	private pollTimer: ioBroker.Timeout | undefined;
	private historyTimer: ioBroker.Timeout | undefined;

	private pollRunning = false;
	private historyPollRunning = false;
	private historyInitialized = false;

	private latestDevices:
readonly SaxPowerDevice[] = [];

	private static readonly HISTORY_INTERVAL_MS =
		300_000;
	public constructor(
		options: Partial<utils.AdapterOptions> = {},
	) {
		super({
			...options,
			name: "sax-power",
		});

		this.on("ready", this.onReady.bind(this));
		this.on("unload", this.onUnload.bind(this));
		this.on(
			"message",
			this.onMessage.bind(this),
		);
	}

	private get saxConfig(): SaxPowerAdapterConfig {
		return this.config as unknown as SaxPowerAdapterConfig;
	}

	private async onReady(): Promise<void> {
		await this.applyConnectionResult(
			SaxPowerErrorClassifier.connecting(),
		);

		const validationError =
this.validateConfiguration();

		if (validationError) {
			this.log.warn(validationError);

			await this.applyConnectionResult(
				SaxPowerErrorClassifier.configurationError(
					validationError,
				),
			);

			return;
		}

		this.apiClient = new SaxPowerApiClient({
			baseUrl: this.saxConfig.apiUrl,
			username: this.saxConfig.username,
			password: this.saxConfig.password,
		});

		this.stateEngine =
new SaxPowerStateEngine(this);

		await this.pollLiveData();

		this.scheduleNextPoll();
	}

	private validateConfiguration(): string | undefined {
		if (!this.saxConfig.apiUrl?.trim()) {
			return "The SAX Power API URL is not configured.";
		}

		try {
			const url = new globalThis.URL(
				this.saxConfig.apiUrl,
			);

			if (
				url.protocol !== "https:" &&
url.protocol !== "http:"
			) {
				return "The SAX Power API URL must use HTTP or HTTPS.";
			}
		} catch {
			return "The configured SAX Power API URL is invalid.";
		}

		if (!this.saxConfig.username?.trim()) {
			return "The SAX Power username is not configured.";
		}

		if (!this.saxConfig.password) {
			return "The SAX Power password is not configured.";
		}

		if (
			!Number.isFinite(this.saxConfig.pollInterval) ||
this.saxConfig.pollInterval < 60
		) {
			return "The polling interval must be at least 60 seconds.";
		}

		/*
 * Modbus control is an optional feature. The SAX Power cloud
 * connection and all read-only device states work independently
 * when Modbus control is disabled.
 */

		return undefined;
	}

	private scheduleNextPoll(): void {
		if (this.pollTimer) {
			this.clearTimeout(this.pollTimer);
		}

		const intervalMs =
this.saxConfig.pollInterval * 1_000;

		this.pollTimer = this.setTimeout(
			async () => {
				await this.pollLiveData();
				this.scheduleNextPoll();
			},
			intervalMs,
		);
	}

	private async pollLiveData(): Promise<void> {
		if (this.pollRunning) {
			this.log.debug(
				"Skipping SAX Power poll because a previous request is still running.",
			);

			return;
		}

		if (!this.apiClient) {
			this.log.warn(
				"SAX Power API client is not initialized.",
			);

			return;
		}

		this.pollRunning = true;

		await this.applyConnectionResult(
			SaxPowerErrorClassifier.connecting(),
		);

		try {
			const response =
await this.apiClient.getLiveData();

			await this.processLiveData(response);

			await this.applyConnectionResult(
				SaxPowerErrorClassifier.connected(),
			);

			await this.setStateAsync(
				"info.lastUpdate",
				new Date().toISOString(),
				true,
			);

			this.log.debug(
				"SAX Power live data updated successfully.",
			);
		} catch (error) {
			const result =
SaxPowerErrorClassifier.classify(
	error,
);

			this.log.error(result.message);

			await this.applyConnectionResult(result);
		} finally {
			this.pollRunning = false;
		}
	}

	private async processLiveData(
		response: SaxPowerLiveDataResponse,
	): Promise<void> {
		const receivedTimestamp =
new Date().toISOString();

		const devices =
parseLiveDataResponse(
	response,
	receivedTimestamp,
);

		if (devices.length === 0) {
			throw new Error(
				"The SAX Power API response did not contain any valid devices.",
			);
		}

		if (!this.stateEngine) {
			throw new Error(
				"The SAX Power state engine is not initialized.",
			);
		}

		await this.stateEngine.writeDevices(
			devices,
		);

		await this.stateEngine
			.writeAggregateLiveData(
				devices,
			);

		this.latestDevices = devices;

		if (!this.historyInitialized) {
			this.historyInitialized = true;

			await this.pollHistory();
			this.scheduleNextHistoryPoll();
		}

		await this.setStateAsync(
			"diagnostics.rawLiveData",
			JSON.stringify(response),
			true,
		);
	}

	private scheduleNextHistoryPoll(): void {
		if (this.historyTimer) {
			this.clearTimeout(
				this.historyTimer,
			);
		}

		this.historyTimer =
this.setTimeout(
	async () => {
		await this.pollHistory();
		this.scheduleNextHistoryPoll();
	},
	SaxPower.HISTORY_INTERVAL_MS,
);
	}

	private async pollHistory(): Promise<void> {
		if (this.historyPollRunning) {
			this.log.debug(
				"Skipping SAX Power history poll because a previous history request is still running.",
			);

			return;
		}

		if (
			!this.apiClient ||
!this.stateEngine ||
this.latestDevices.length === 0
		) {
			return;
		}

		this.historyPollRunning = true;

		try {
			const today =
new Date()
	.toISOString()
	.slice(0, 10);

			const deviceStatistics:
Record<
string,
SaxPowerDeviceStatistics
> = {};

			const deviceMetadata:
Record<
string,
SaxPowerDeviceHistoryMetadata
> = {};

			for (
				const device
				of this.latestDevices
			) {
				const serialNumber =
device.info.serialNumber;

				const [
					week,
					month,
					year,
					total,
				] = await Promise.all([
					this.apiClient.getEnergyChart(
						serialNumber,
						`week_${today}`,
					),

					this.apiClient.getEnergyChart(
						serialNumber,
						`month_${today}`,
					),

					this.apiClient.getEnergyChart(
						serialNumber,
						`year_${today}`,
					),

					this.apiClient.getEnergyChart(
						serialNumber,
						`total_${today}`,
					),
				]);

				deviceStatistics[
					serialNumber
				] =
parseDeviceStatistics({
	serialNumber,
	todayIso: today,
	week,
	month,
	year,
	total,
});

				deviceMetadata[
					serialNumber
				] =
createDeviceHistoryMetadata({
	serialNumber,
	todayIso: today,
	week,
	month,
	year,
	total,
});
			}

			const statistics =
aggregateStatistics(
	deviceStatistics,
);

			const metadata =
aggregateHistoryMetadata(
	deviceMetadata,
);

			const updatedAt =
new Date().toISOString();

			await this.stateEngine
				.writeStatistics(
					statistics,
					metadata,
					updatedAt,
				);

			this.log.debug(
				`SAX Power statistics updated successfully for ${Object.keys(deviceStatistics).length} device(s).`,
			);
		} catch (error) {
			const message =
this.formatError(error);

			this.log.warn(
				`Unable to update SAX Power statistics: ${message}`,
			);

			await this.stateEngine
				.writeStatisticsError(
					message,
				);
		} finally {
			this.historyPollRunning = false;
		}
	}



	private async applyConnectionResult(
		result: SaxPowerConnectionResult,
	): Promise<void> {
		const values =
createConnectionStateValues(result);

		await Promise.all([
			this.setStateAsync(
				"info.connection",
				values.connection,
				true,
			),
			this.setStateAsync(
				"info.connectionState",
				values.connectionState,
				true,
			),
			this.setStateAsync(
				"info.lastError",
				values.lastError,
				true,
			),
			this.setStateAsync(
				"info.lastHttpStatus",
				values.lastHttpStatus,
				true,
			),
		]);
	}

	private formatError(error: unknown): string {
		if (error instanceof SaxPowerApiError) {
			const status =
error.statusCode !== undefined
	? ` HTTP ${error.statusCode}.`
	: "";

			return `${error.message}${status}`;
		}

		if (error instanceof Error) {
			return error.message;
		}

		return String(error);
	}

	private async onMessage(
		message: ioBroker.Message,
	): Promise<void> {
		if (
			!message.callback ||
!message.from
		) {
			return;
		}

		if (
			message.command !==
"getModbusStates"
		) {
			return;
		}

		try {
			const payload =
typeof message.message === "object" &&
message.message !== null
	? message.message as {
instance?: unknown;
purpose?: unknown;
}
	: {};

			const instance =
typeof payload.instance === "string"
	? payload.instance
	: "";

			const purpose =
payload.purpose === "discharge"
	? "discharge"
	: "charge";

			const preferredRegister =
purpose === "discharge"
	? 43
	: 44;

			const options =
await discoverModbusStates(
	async (pattern) => {
		const objects =
await this
	.getForeignObjectsAsync(
		pattern,
		"state",
	);

		return objects as unknown as
Record<string, unknown>;
	},
	{
		instance,
		preferredRegister,
	},
);

			this.sendTo(
				message.from,
				message.command,
				options,
				message.callback,
			);
		} catch (error) {
			this.log.warn(
				`Unable to discover Modbus states: ${
					error instanceof Error
						? error.message
						: String(error)
				}`,
			);

			this.sendTo(
				message.from,
				message.command,
				[],
				message.callback,
			);
		}
	}

	private onUnload(callback: () => void): void {
		try {
			if (this.pollTimer) {
				this.clearTimeout(this.pollTimer);
				this.pollTimer = undefined;
			}

			if (this.historyTimer) {
				this.clearTimeout(
					this.historyTimer,
				);

				this.historyTimer = undefined;
			}

			this.apiClient?.clearTokens();

			callback();
		} catch {
			callback();
		}
	}
}

if (require.main !== module) {
	module.exports = (
		options: Partial<utils.AdapterOptions> | undefined,
	) => new SaxPower(options);
} else {
	(() => new SaxPower())();
}
