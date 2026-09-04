import {
	createStrategyIoBrokerStrategyLifecycle,
	type StrategyIoBrokerStrategyLifecycle,
} from "./strategyIoBrokerStrategyLifecycle";
import type { StrategyIoBrokerStrategyTimerAdapter } from "./strategyIoBrokerStrategyCycleScheduler";
import {
	STRATEGY_INTEGRATION_CONTRACT,
	type StrategyIntegrationContract,
} from "./strategyIntegrationContract";
import {
	type StrategyRuntimeConfiguration,
	type StrategyRuntimeConfigurationInput,
	type StrategyRuntimeConfigurationIssue,
	validateStrategyRuntimeConfiguration,
} from "./strategyRuntimeConfiguration";
import type { StrategyStateResolverOptions } from "./strategyStateResolver";

export type StrategyIoBrokerStrategyBinding =
	| Readonly<{
		status: "disabled";
		configuration: Readonly<{ enabled: false }>;
		issues: readonly [];
		lifecycle: null;
	}>
	| Readonly<{
		status: "invalid-configuration";
		configuration: null;
		issues: readonly StrategyRuntimeConfigurationIssue[];
		lifecycle: null;
	}>
	| Readonly<{
		status: "ready";
		configuration: Extract<StrategyRuntimeConfiguration, { enabled: true }>;
		issues: readonly [];
		lifecycle: StrategyIoBrokerStrategyLifecycle;
	}>;

export function createStrategyIoBrokerStrategyBinding(
	adapter: StrategyIoBrokerStrategyTimerAdapter,
	input: StrategyRuntimeConfigurationInput,
	onError: (error: unknown) => void,
	contract: StrategyIntegrationContract = STRATEGY_INTEGRATION_CONTRACT,
	resolverOptions: StrategyStateResolverOptions = {},
): StrategyIoBrokerStrategyBinding {
	const validation = validateStrategyRuntimeConfiguration(input);

	if (!validation.valid) {
		return Object.freeze({
			status: "invalid-configuration" as const,
			configuration: null,
			issues: validation.issues,
			lifecycle: null,
		});
	}

	if (!validation.configuration.enabled) {
		return Object.freeze({
			status: "disabled" as const,
			configuration: validation.configuration,
			issues: validation.issues,
			lifecycle: null,
		});
	}

	const configuration = validation.configuration;
	const lifecycle = createStrategyIoBrokerStrategyLifecycle(
		adapter,
		configuration.configuration,
		configuration.maximumForecastAgeMs,
		configuration.requestedDischargePowerW,
		configuration.intervalMs,
		onError,
		contract,
		resolverOptions,
		configuration.modes,
		configuration.householdLearning,
	);

	if (lifecycle === null) {
		return Object.freeze({
			status: "invalid-configuration" as const,
			configuration: null,
			issues: Object.freeze([{
				field: "intervalMs" as const,
				reason: "out-of-range" as const,
			}]),
			lifecycle: null,
		});
	}

	return Object.freeze({
		status: "ready" as const,
		configuration,
		issues: validation.issues,
		lifecycle,
	});
}
