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
	getObjectViewSystem(
		type: string,
		startKey: string,
		endKey: string,
	): Promise<Record<string, unknown>>;
	getObjects(
		includeSystemObjects?: boolean,
		refresh?: boolean,
	): Promise<Record<string, unknown>>;
}

interface StrategyLearningSettingsProps {
	readonly socket: StrategyLearningSocket;
	readonly native: SaxPowerNativeConfig;
	readonly hasIssue: (field: string) => boolean;
	readonly onChange: <Key extends keyof SaxPowerNativeConfig>(
		key: Key,
		value: SaxPowerNativeConfig[Key],
	) => void;
}

export function StrategyLearningSettings(
	props: StrategyLearningSettingsProps,
): React.JSX.Element {
	const sourceMode = props.native.strategyPvPowerSourceMode ?? "none";
	const learningEnabled = props.native.strategyHouseholdLearningEnabled ?? false;

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
					Forecast and adaptive learning
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					PVForecast remains the planning source. An optional live PV-power state lets SAX Power learn the installation's actual household consumption instead of treating the whole forecast as battery-available energy.
				</Typography>
			</Box>

			<PvForecastSelector
				socket={props.socket}
				value={typeof props.native.strategyPvForecastInstance === "string"
					? props.native.strategyPvForecastInstance
					: ""}
				error={props.hasIssue("pvForecastInstance")}
				onChange={(instance) => props.onChange("strategyPvForecastInstance", instance)}
			/>

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
				<Stack spacing={2}>
					<TextField
						select
						fullWidth
						label="Live PV-power source"
						value={sourceMode}
						onChange={(event) => props.onChange(
							"strategyPvPowerSourceMode",
							event.target.value as "state" | "none",
						)}
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
							helperText="Select or enter a state whose value is the current total PV power in watts. This input is optional for the adapter overall but required for full daytime household-load learning."
						/>
					) : (
						<Alert severity="info">
							Without a live PV-power state, SAX Power will not invent daytime household consumption. The charging strategy continues to work with its existing inputs.
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
								helperText="Optional installation metadata for future local PV plausibility learning. It is not used as an instantaneous PV measurement."
								slotProps={{
									input: {
										endAdornment: <InputAdornment position="end">Wp</InputAdornment>,
									},
									htmlInput: { min: 1, step: 100 },
								}}
							/>
						</Grid>
					</Grid>
				</Stack>
			) : null}
		</Stack>
	);
}
