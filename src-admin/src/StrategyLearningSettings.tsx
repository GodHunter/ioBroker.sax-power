import React from "react";

import {
	Alert,
	Box,
	FormControlLabel,
	Grid,
	InputAdornment,
	MenuItem,
	Stack,
	Switch,
	TextField,
	Typography,
} from "@mui/material";

import { PvForecastSelector } from "./PvForecastSelector";
import type { SaxPowerNativeConfig } from "./types";

interface StrategyLearningSocket {
	getObjectViewSystem(type: string, startKey: string, endKey: string): Promise<Record<string, unknown>>;
	getObjects(includeSystemObjects?: boolean, refresh?: boolean): Promise<Record<string, unknown>>;
}

interface SettingsProps {
	readonly socket: StrategyLearningSocket;
	readonly native: SaxPowerNativeConfig;
	readonly hasIssue: (field: string) => boolean;
	readonly onChange: <Key extends keyof SaxPowerNativeConfig>(
		key: Key,
		value: SaxPowerNativeConfig[Key],
	) => void;
}

const fieldSx = {
	"& .MuiInputBase-root": { minHeight: 56 },
	"& .MuiFormHelperText-root": { minHeight: 20, marginTop: 0.75 },
} as const;

export function PvIntegrationSettings(props: SettingsProps): React.JSX.Element {
	const sourceMode = props.native.strategyPvPowerSourceMode ?? "none";

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant="h6" sx={{ fontWeight: 700 }}>PV forecast & live PV data</Typography>
				<Typography variant="body2" color="text.secondary">
					Configure the forecast source and, optionally, a live PV-power state for this installation.
				</Typography>
			</Box>

			<Box sx={fieldSx}>
				<PvForecastSelector
					socket={props.socket}
					value={typeof props.native.strategyPvForecastInstance === "string"
						? props.native.strategyPvForecastInstance
						: ""}
					error={props.hasIssue("pvForecastInstance")}
					onChange={(instance) => props.onChange("strategyPvForecastInstance", instance)}
				/>
			</Box>

			<TextField
				select
				fullWidth
				label="Live PV-power source"
				value={sourceMode}
				onChange={(event) => props.onChange(
					"strategyPvPowerSourceMode",
					event.target.value as "state" | "none",
				)}
				sx={fieldSx}
			>
				<MenuItem value="none">No direct PV measurement</MenuItem>
				<MenuItem value="state">ioBroker state</MenuItem>
			</TextField>

			{sourceMode === "state" ? (
				<TextField
					fullWidth
					required
					label="PV power state ID"
					placeholder="e.g. modbus.0.holdingRegisters..."
					value={props.native.strategyPvPowerStateId ?? ""}
					onChange={(event) => props.onChange(
						"strategyPvPowerStateId",
						event.target.value || undefined,
					)}
					error={props.hasIssue("pvPowerStateId")}
					helperText="State containing the current total PV power in watts. It is used for adaptive household-load learning."
					sx={fieldSx}
				/>
			) : (
				<Alert severity="info">
					Without a live PV-power state, the charging strategy continues to work, but daytime household-load learning cannot use measured PV production.
				</Alert>
			)}

			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 6 }}>
					<TextField
						fullWidth
						type="number"
						label="PV nominal peak power"
						value={typeof props.native.strategyPvNominalPowerWp === "number"
							? props.native.strategyPvNominalPowerWp
							: ""}
						onChange={(event) => props.onChange(
							"strategyPvNominalPowerWp",
							event.target.value === "" ? undefined : Number(event.target.value),
						)}
						error={props.hasIssue("pvNominalPowerWp")}
						helperText="Optional installation metadata for future PV plausibility learning."
						slotProps={{
							input: { endAdornment: <InputAdornment position="end">Wp</InputAdornment> },
							htmlInput: { min: 1, step: 100 },
						}}
						sx={fieldSx}
					/>
				</Grid>
			</Grid>
		</Stack>
	);
}

export function AdaptiveLearningSettings(props: SettingsProps): React.JSX.Element {
	const learningEnabled = props.native.strategyHouseholdLearningEnabled ?? false;
	const hasLivePv = (props.native.strategyPvPowerSourceMode ?? "none") === "state"
		&& Boolean(props.native.strategyPvPowerStateId);

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant="h6" sx={{ fontWeight: 700 }}>Adaptive learning</Typography>
				<Typography variant="body2" color="text.secondary">
					Learn the installation's actual household demand and use it to improve the charging strategy.
				</Typography>
			</Box>

			<FormControlLabel
				control={(
					<Switch
						checked={learningEnabled}
						onChange={(event) => props.onChange(
							"strategyHouseholdLearningEnabled",
							event.target.checked,
						)}
					/>
				)}
				label="Learn household consumption"
			/>

			{learningEnabled ? (
				hasLivePv ? (
					<Alert severity="success">
						Live PV data is configured under Integrations. Household-load learning can use measured PV production.
					</Alert>
				) : (
					<Alert severity="warning">
						Household learning is enabled, but no live PV-power state is configured. Configure it under Integrations for full daytime learning.
					</Alert>
				)
			) : (
				<Typography variant="body2" color="text.secondary">
					Learning is disabled. The charging strategy continues to use its normal forecast and strategy inputs.
				</Typography>
			)}
		</Stack>
	);
}

// Compatibility export for older imports while the admin layout is being migrated.
export const StrategyLearningSettings = AdaptiveLearningSettings;
