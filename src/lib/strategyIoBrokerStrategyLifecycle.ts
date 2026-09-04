import type { StrategyConfiguration } from "./strategyConfiguration";
import type { StrategyHouseholdLearningConfiguration } from "./strategyHouseholdLearningConfiguration";
import {
	createStrategyIoBrokerHouseholdLearningCycle,
} from "./strategyIoBrokerHouseholdLearningCycle";
import {
	ensureStrategyHouseholdLearningStates,
} from "./strategyHouseholdLearningStates";
import {
	createStrategyIoBrokerDaylightWindowProvider,
} from "./strategyIoBrokerDaylightWindow";
import {
	createStrategyIoBrokerStrategyCycleScheduler,
	type StrategyIoBrokerStrategyCycleScheduler,
	type StrategyIoBrokerStrategyTimerAdapter,
} from "./strategyIoBrokerStrategyCycleScheduler";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	ensureStrategyManualChargeIoBrokerStates,
} from "./strategyManualChargeStates";
import {
	ensureStrategyChargingStates,
} from "./strategyChargingStates";
import {
	ensureStrategyDaylightDiagnosticStates,
} from "./strategyDaylightDiagnosticStates";
import {
	ensureStrategyDayDischargeAvailabilityStates,
} from "./strategyDayDischargeAvailabilityStates";
import { ensureStrategyPlanningStates } from "./strategyPlanningStates";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";
import {
	DEFAULT_STRATEGY_MODES,
	type StrategyModes,
} from "./strategyModes";

const DISABLED_HOUSEHOLD_LEARNING: StrategyHouseholdLearningConfiguration = Object.freeze({
	enabled: false,
	pvPowerSourceMode: "none",
	pvPowerStateId: null,
	pvNominalPowerWp: null,
});

export interface StrategyIoBrokerStrategyLifecycle {
	readonly start: () => Promise<void>;
	readonly stop: () => void;
}

export function createStrategyIoBrokerStrategyLifecycle(
	adapter: StrategyIoBrokerStrategyTimerAdapter,
	configuration: StrategyConfiguration,
	maximumForecastAgeMs: number,
	requestedDischargePowerW: number,
	intervalMs: number,
	onError: (error: unknown) => void,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
	modes: StrategyModes = DEFAULT_STRATEGY_MODES,
	householdLearning: StrategyHouseholdLearningConfiguration = DISABLED_HOUSEHOLD_LEARNING,
): StrategyIoBrokerStrategyLifecycle | null {
	const scheduler: StrategyIoBrokerStrategyCycleScheduler | null =
		createStrategyIoBrokerStrategyCycleScheduler(
			adapter,
			configuration,
			maximumForecastAgeMs,
			requestedDischargePowerW,
			intervalMs,
			onError,
			contract,
			resolverOptions,
			modes,
		);

	if (scheduler === null) return null;

	const householdCycle = createStrategyIoBrokerHouseholdLearningCycle(adapter, {
		enabled: householdLearning.enabled,
		pvPowerStateId: householdLearning.pvPowerStateId,
		batteryPowerStateId: contract.modbus.batteryPower.stateId,
		gridPowerStateId: contract.modbus.smartMeterPower.stateId,
		pvForecastEnergyStateId: contract.pvForecast.energyNowUntilEndOfDay.stateId,
		forecastReserveWh: configuration.pvForecastReserveWh,
	});

	let requested = false;
	let startPromise: Promise<void> | undefined;
	let householdTimer: ioBroker.Timeout | undefined;
	let householdRunning = false;

	const scheduleHouseholdLearning = (): void => {
		if (!requested || !householdLearning.enabled || householdTimer !== undefined) return;
		householdTimer = adapter.setTimeout(async () => {
			householdTimer = undefined;
			if (!requested || householdRunning) {
				scheduleHouseholdLearning();
				return;
			}
			householdRunning = true;
			try {
				const now = Date.now();
				let until = now;
				try {
					const daylight = await createStrategyIoBrokerDaylightWindowProvider(adapter)
						.getDaylightWindow(now);
					if (daylight != null && daylight.endsAt > now) until = daylight.endsAt;
				} catch {
					// Learning may continue without a planning horizon; control remains unaffected.
				}
				await householdCycle.runOnce(now, until);
			} catch (error) {
				onError(error);
			} finally {
				householdRunning = false;
				scheduleHouseholdLearning();
			}
		}, intervalMs);
	};

	const start = (): Promise<void> => {
		requested = true;

		if (startPromise !== undefined) return startPromise;

		startPromise = (async () => {
			try {
				if (modes.chargingControlEnabled || modes.dayAvailabilityEnabled || householdLearning.enabled) {
					await ensureStrategyDaylightDiagnosticStates(adapter);
				}
				if (modes.chargingControlEnabled) {
					await ensureStrategyManualChargeIoBrokerStates(adapter);
					await ensureStrategyChargingStates(adapter);
				}
				if (modes.dayAvailabilityEnabled) {
					await ensureStrategyDayDischargeAvailabilityStates(adapter);
				}
				if (householdLearning.enabled) {
					await ensureStrategyHouseholdLearningStates(adapter);
					await ensureStrategyPlanningStates(adapter);
				}
				if (requested) {
					scheduler.start();
					scheduleHouseholdLearning();
				}
			} catch (error) {
				requested = false;
				throw error;
			} finally {
				startPromise = undefined;
			}
		})();

		return startPromise;
	};

	return Object.freeze({
		start,
		stop(): void {
			requested = false;
			scheduler.stop();
			if (householdTimer !== undefined) {
				adapter.clearTimeout(householdTimer);
				householdTimer = undefined;
			}
		},
	});
}
