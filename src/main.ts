import * as utils from "@iobroker/adapter-core";

import {
	SaxPowerApiClient,
	SaxPowerApiError,
	type SaxPowerLiveDataResponse,
} from "./lib/saxPowerApiClient";

interface SaxPowerAdapterConfig {
apiUrl: string;
username: string;
password: string;
pollInterval: number;
}

class SaxPower extends utils.Adapter {
	private apiClient: SaxPowerApiClient | undefined;
	private pollTimer: ioBroker.Timeout | undefined;
	private pollRunning = false;

	public constructor(
		options: Partial<utils.AdapterOptions> = {},
	) {
		super({
			...options,
			name: "sax-power",
		});

		this.on("ready", this.onReady.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	private get saxConfig(): SaxPowerAdapterConfig {
		return this.config as unknown as SaxPowerAdapterConfig;
	}

	private async onReady(): Promise<void> {
		await this.setStateAsync(
			"info.connection",
			false,
			true,
		);

		await this.setStateAsync(
			"info.lastError",
			"",
			true,
		);

		const validationError =
this.validateConfiguration();

		if (validationError) {
			this.log.warn(validationError);

			await this.setStateAsync(
				"info.lastError",
				validationError,
				true,
			);

			return;
		}

		this.apiClient = new SaxPowerApiClient({
			baseUrl: this.saxConfig.apiUrl,
			username: this.saxConfig.username,
			password: this.saxConfig.password,
		});

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
this.saxConfig.pollInterval < 30
		) {
			return "The polling interval must be at least 30 seconds.";
		}

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

		try {
			const response =
await this.apiClient.getLiveData();

			await this.processLiveData(response);

			await this.setStateAsync(
				"info.connection",
				true,
				true,
			);

			await this.setStateAsync(
				"info.lastUpdate",
				new Date().toISOString(),
				true,
			);

			await this.setStateAsync(
				"info.lastError",
				"",
				true,
			);

			this.log.debug(
				"SAX Power live data updated successfully.",
			);
		} catch (error) {
			const message =
this.formatError(error);

			this.log.error(message);

			await this.setStateAsync(
				"info.connection",
				false,
				true,
			);

			await this.setStateAsync(
				"info.lastError",
				message,
				true,
			);
		} finally {
			this.pollRunning = false;
		}
	}

	private async processLiveData(
		response: SaxPowerLiveDataResponse,
	): Promise<void> {
		/*
 * Phase 04A deliberately stores the complete response only as
 * diagnostic JSON. The verified SAX Power field mapping and
 * device/state hierarchy will be implemented in Phase 04B.
 */
		await this.setStateAsync(
			"diagnostics.rawLiveData",
			JSON.stringify(response),
			true,
		);
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

	private onUnload(callback: () => void): void {
		try {
			if (this.pollTimer) {
				this.clearTimeout(this.pollTimer);
				this.pollTimer = undefined;
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
