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
	discoverModbusInstances,
	discoverModbusStates,
} from "./lib/modbusDiscovery";
import { discoverStrategyCapabilities } from "./lib/strategyCapabilities";

import {
	SAX_POWER_API_URL,
} from "./lib/saxPowerConstants";

import {
	createStrategyIoBrokerStrategyBinding,
	type StrategyIoBrokerStrategyBinding,
} from "./lib/strategyIoBrokerStrategyBinding";

import {
	strategyRuntimeConfigurationFromNative,
	type StrategyNativeConfiguration,
} from "./lib/strategyNativeConfiguration";

import {
	resolveStrategyAstroDate,
} from "./lib/strategyAstroDate";

import type {
	StrategyIoBrokerAstroEvent,
} from "./lib/strategyIoBrokerDaylightWindow";

import type {
	StrategyIoBrokerStrategyTimerAdapter,
} from "./lib/strategyIoBrokerStrategyCycleScheduler";

import {
	publishStrategyRuntimeStatus,
} from "./lib/strategyRuntimeStatus";

import {
	assessStrategyIoBrokerReadiness,
	formatStrategyUnavailableInputs,
	type StrategyIoBrokerReadiness,
} from "./lib/strategyIoBrokerReadiness";

import {
	createStrategyReadinessRetry,
	type StrategyReadinessRetry,
} from "./lib/strategyIoBrokerReadinessRetry";

import {
	createDetectedStrategyIntegrationContract,
	createStrategyIntegrationContract,
	STRATEGY_INTEGRATION_CONTRACT,
} from "./lib/strategyIntegrationContract";

import {
	isValidPollIntervalSeconds,
	MAX_POLL_INTERVAL_SECONDS,
	MIN_POLL_INTERVAL_SECONDS,
} from "./lib/pollInterval";

interface SaxPowerAdapterConfig extends StrategyNativeConfiguration {
	username: string;
	password: string;
	pollInterval: number;
	batteryModels?: Record<string, string>;
}

class SaxPower extends utils.Adapter {
	private apiClient: SaxPowerApiClient | undefined;
	private stateEngine: SaxPowerStateEngine | undefined;
	private pollTimer: ioBroker.Timeout | undefined;
	private historyTimer: ioBroker.Timeout | undefined;
	private strategyBinding: StrategyIoBrokerStrategyBinding | undefined;
	private strategyReadinessRetry: StrategyReadinessRetry | undefined;

	private pollRunning = false;
	private historyPollRunning = false;
	private historyInitialized = false;

	private latestDevices:
readonly SaxPowerDevice[] = [];

	private static readonly HISTORY_INTERVAL_MS =
		300_000;
	private static readonly STRATEGY_READINESS_RETRY_INTERVAL_MS =
		30_000;
	public constructor(
		options: Partial<utils.AdapterOptions> = {},
	) {
		super({
			...options,
			name: "sax-power",
			useFormatDate: true,
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

		await this.startStrategy();

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
			baseUrl: SAX_POWER_API_URL,
			username: this.saxConfig.username,
			password: this.saxConfig.password,
		});

		this.stateEngine =
new SaxPowerStateEngine(this);

		await this.pollLiveData();

		this.scheduleNextPoll();
	}

	public getAstroDate(
		event: StrategyIoBrokerAstroEvent,
		date = new Date(),
		offsetMinutes = 0,
	): Date {
		return resolveStrategyAstroDate(
			event,
			date,
			this.latitude,
			this.longitude,
			offsetMinutes,
		);
	}

	private strategyAdapter(): StrategyIoBrokerStrategyTimerAdapter {
		return {
			getAstroDate: (event, date, offsetMinutes) =>
				this.getAstroDate(event, date, offsetMinutes),
			extendObjectAsync: (id, object) =>
				this.extendObjectAsync(id, object),
			getStateAsync: id => this.getStateAsync(id),
			setStateAsync: (id, state) => this.setStateAsync(id, state),
			getForeignObjectAsync: id => this.getForeignObjectAsync(id),
			getForeignStateAsync: id => this.getForeignStateAsync(id),
			setForeignStateAsync: (id, value, acknowledged) =>
				this.setForeignStateAsync(id, value, acknowledged),
			setTimeout: (callback, delay) => {
				const timeout = this.setTimeout(callback, delay);
				if (timeout === undefined) {
					throw new Error("ioBroker did not create the strategy timer.");
				}
				return timeout;
			},
			clearTimeout: timeout => this.clearTimeout(timeout),
		};
	}

	private async startStrategy(): Promise<void> {
		const runtimeConfiguration = strategyRuntimeConfigurationFromNative(
			this.saxConfig,
		);
		let contract = typeof runtimeConfiguration.modbusInstance === "string"
			? createStrategyIntegrationContract(runtimeConfiguration.modbusInstance)
			: null;
		let capabilities: ReturnType<typeof discoverStrategyCapabilities> = null;
		let capabilityDiscoveryError: unknown;

		if (
			runtimeConfiguration.enabled === true
			&& typeof runtimeConfiguration.modbusInstance === "string"
			&& contract !== null
		) {
			const modbusInstance = runtimeConfiguration.modbusInstance;
			try {
				const objects = await this.getForeignObjectsAsync(
					`${modbusInstance}.*`,
					"state",
				);
				capabilities = discoverStrategyCapabilities(
					modbusInstance,
					objects,
				);
				contract = capabilities === null
					? contract
					: createDetectedStrategyIntegrationContract(
						modbusInstance,
						capabilities.registers,
					);
			} catch (error) {
				capabilityDiscoveryError = error;
				this.log.warn(
					`Unable to detect SAX Modbus registers during strategy startup: ${this.formatError(error)}`,
				);
			}
		}
		const binding = createStrategyIoBrokerStrategyBinding(
			this.strategyAdapter(),
			runtimeConfiguration,
			error => {
				this.logStrategyError("cycle", error);
				void this.publishStrategyErrorStatus("cycle", error);
			},
			contract ?? STRATEGY_INTEGRATION_CONTRACT,
		);

		this.strategyBinding = binding;
		this.strategyReadinessRetry?.stop();
		this.strategyReadinessRetry = undefined;

		if (binding.status === "disabled") {
			await publishStrategyRuntimeStatus(this, "disabled");
			this.log.debug("SAX Power strategy is disabled.");
			return;
		}

		if (binding.status === "invalid-configuration") {
			const detail = binding.issues
				.map(issue => `${issue.field}:${issue.reason}`)
				.join(", ");

			await publishStrategyRuntimeStatus(
				this,
				"invalid-configuration",
				detail,
			);
			this.log.error(
				`SAX Power strategy configuration is invalid: ${detail}`,
			);
			return;
		}

		if (contract === null) {
			await publishStrategyRuntimeStatus(
				this,
				"invalid-configuration",
				"modbusInstance:invalid-instance",
			);
			return;
		}

		if (binding.status === "ready" && capabilityDiscoveryError !== undefined) {
			await this.publishStrategyErrorStatus(
				"Modbus register detection",
				capabilityDiscoveryError,
			);
			return;
		}

		if (binding.status === "ready" && capabilities !== null) {
			const enabledModes = new Map([
				["chargingControl", binding.configuration.modes.chargingControlEnabled],
				["dayAvailability", binding.configuration.modes.dayAvailabilityEnabled],
				["nightDischarge", binding.configuration.modes.nightDischargeEnabled],
			] as const);
			const unavailableModes = capabilities.modes.filter(mode =>
				enabledModes.get(mode.id) === true && !mode.selectable);
			if (unavailableModes.length > 0) {
				const detail = unavailableModes.map(mode =>
					`${mode.id}:${mode.reason}${mode.missingRegisters.length > 0
						? `(${mode.missingRegisters.join(",")})`
						: ""}`,
				).join(", ");
				await publishStrategyRuntimeStatus(
					this,
					"invalid-configuration",
					detail,
				);
				this.log.error(`SAX Power strategy mode is unavailable: ${detail}`);
				return;
			}
		}

		const readinessRetry = createStrategyReadinessRetry(
			this.strategyAdapter(),
			SaxPower.STRATEGY_READINESS_RETRY_INTERVAL_MS,
			async () => this.startReadyStrategy(binding, contract),
			error => {
				this.logStrategyError("readiness retry", error);
				void this.publishStrategyErrorStatus("readiness retry", error);
			},
		);

		if (readinessRetry === null) {
			await this.publishStrategyErrorStatus(
				"readiness retry",
				new Error("Invalid readiness retry interval."),
			);
			return;
		}

		this.strategyReadinessRetry = readinessRetry;
		await this.startReadyStrategy(binding, contract);
	}

	private async startReadyStrategy(
		binding: Extract<StrategyIoBrokerStrategyBinding, { status: "ready" }>,
		contract: NonNullable<ReturnType<typeof createStrategyIntegrationContract>>,
	): Promise<void> {
		if (this.strategyBinding !== binding) return;

		let readiness: StrategyIoBrokerReadiness;
		try {
			readiness = await assessStrategyIoBrokerReadiness(
				this.strategyAdapter(),
				binding.configuration.maximumForecastAgeMs,
				contract,
				binding.configuration.modes,
			);
		} catch (error) {
			this.logStrategyError("readiness check", error);
			await this.publishStrategyErrorStatus("readiness check", error);
			this.strategyReadinessRetry?.schedule();
			return;
		}

		if (!readiness.ready) {
			const detail = formatStrategyUnavailableInputs(
				readiness.unavailableInputs,
			);
			await publishStrategyRuntimeStatus(
				this,
				"waiting-for-inputs",
				detail,
			);
			this.log.warn(
				`SAX Power strategy is waiting for required inputs: ${detail}`,
			);
			this.strategyReadinessRetry?.schedule();
			return;
		}

		try {
			this.strategyReadinessRetry?.stop();
			this.strategyReadinessRetry = undefined;
			await publishStrategyRuntimeStatus(this, "starting");
			await binding.lifecycle.start();
			await publishStrategyRuntimeStatus(this, "running");
			this.log.info("SAX Power strategy scheduler started.");
		} catch (error) {
			binding.lifecycle.stop();
			this.logStrategyError("initialization", error);
			await this.publishStrategyErrorStatus("initialization", error);
		}
	}

	private async publishStrategyErrorStatus(
		context: string,
		error: unknown,
	): Promise<void> {
		try {
			await publishStrategyRuntimeStatus(
				this,
				"error",
				`${context}: ${error instanceof Error ? error.message : String(error)}`,
			);
		} catch (statusError) {
			this.logStrategyError("status publication", statusError);
		}
	}

	private logStrategyError(context: string, error: unknown): void {
		this.log.error(
			`SAX Power strategy ${context} failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}

	private validateConfiguration(): string | undefined {
		if (!this.saxConfig.username?.trim()) {
			return "The SAX Power username is not configured.";
		}

		if (!this.saxConfig.password) {
			return "The SAX Power password is not configured.";
		}

		if (!isValidPollIntervalSeconds(this.saxConfig.pollInterval)) {
			return `The polling interval must be between ${MIN_POLL_INTERVAL_SECONDS} and ${MAX_POLL_INTERVAL_SECONDS.toLocaleString("en-US")} seconds.`;
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

		await this.stateEngine.observeBatteryHealth(devices, this.saxConfig.batteryModels ?? {});

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

			const batteryModels: Record<string, string> = {};
			const reportedCycles: Record<string, number | null> = {};

			for (
				const device
				of this.latestDevices
			) {
				const serialNumber =
device.info.serialNumber;

				batteryModels[serialNumber] =
this.saxConfig.batteryModels?.[serialNumber] ?? "";
				reportedCycles[serialNumber] =
device.info.reportedCycleCount;

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
					batteryModels,
					reportedCycles,
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

		if (message.command === "getModbusInstances") {
			try {
				const objects = await this.getForeignObjectsAsync(
					"system.adapter.modbus.*",
				);
				this.sendTo(
					message.from,
					message.command,
					discoverModbusInstances(objects),
					message.callback,
				);
			} catch (error) {
				this.log.warn(
					`Unable to discover Modbus instances: ${this.formatError(error)}`,
				);
				this.sendTo(message.from, message.command, [], message.callback);
			}
			return;
		}

		if (message.command === "getStrategyCapabilities") {
			const payload = typeof message.message === "object"
				&& message.message !== null
				? message.message as { instance?: unknown }
				: {};
			const instance = typeof payload.instance === "string"
				? payload.instance
				: "";
			if (!/^modbus\.\d+$/.test(instance)) {
				this.sendTo(message.from, message.command, null, message.callback);
				return;
			}
			try {
				const objects = await this.getForeignObjectsAsync(
					`${instance}.*`,
					"state",
				);
				this.sendTo(
					message.from,
					message.command,
					discoverStrategyCapabilities(instance, objects) ?? null,
					message.callback,
				);
			} catch (error) {
				this.log.warn(
					`Unable to discover strategy capabilities: ${this.formatError(error)}`,
				);
				this.sendTo(message.from, message.command, null, message.callback);
			}
			return;
		}

		if (message.command !== "getModbusStates") return;

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
			this.strategyReadinessRetry?.stop();
			this.strategyReadinessRetry = undefined;
			this.strategyBinding?.lifecycle?.stop();
			this.strategyBinding = undefined;

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
