import React, {
	useEffect,
	useState,
} from "react";

import {
	Alert,
	CircularProgress,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from "@mui/material";

import {
	discoverPvForecastInstances,
	inspectPvForecastCapabilities,
	type PvForecastCapabilities,
} from "../../src/lib/pvForecastDiscovery";

import type {
	PvForecastInstanceOption,
} from "./types";

interface PvForecastSocket {
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

interface PvForecastSelectorProps {
	readonly socket: PvForecastSocket;
	readonly value: string;
	readonly error: boolean;
	readonly onChange: (instance: string | undefined) => void;
}

export function PvForecastSelector(
	props: PvForecastSelectorProps,
): React.JSX.Element {
	const [instances, setInstances] = useState<PvForecastInstanceOption[]>([]);
	const [instancesLoading, setInstancesLoading] = useState(true);
	const [instancesError, setInstancesError] = useState("");
	const [capabilities, setCapabilities] = useState<PvForecastCapabilities | null>(null);
	const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);

	useEffect(() => {
		let active = true;

		void (async () => {
			setInstancesLoading(true);
			setInstancesError("");

			try {
				const objects = await props.socket.getObjectViewSystem(
					"instance",
					"system.adapter.pvforecast.",
					"system.adapter.pvforecast.\u9999",
				);
				const options = discoverPvForecastInstances(objects);

				if (!active) return;

				setInstances(options);
				setInstancesLoading(false);

				const enabledOptions = options.filter(option => option.enabled);

				if (props.value === "" && enabledOptions.length === 1) {
					props.onChange(enabledOptions[0].value);
				}
			} catch (error) {
				if (!active) return;

				setInstances([]);
				setInstancesLoading(false);
				setInstancesError(
					error instanceof Error ? error.message : String(error),
				);
			}
		})();

		return () => {
			active = false;
		};
	}, [props.socket, props.value, props.onChange]);

	useEffect(() => {
		let active = true;

		if (!/^pvforecast\.\d+$/.test(props.value)) {
			setCapabilities(null);
			setCapabilitiesLoading(false);
			return () => {
				active = false;
			};
		}

		void (async () => {
			setCapabilities(null);
			setCapabilitiesLoading(true);

			try {
				const allObjects = await Promise.race([
					props.socket.getObjects(true, true),
					new Promise<never>((_, reject) => {
						window.setTimeout(
							() => reject(new Error("Timeout while reading PVForecast objects")),
							5_000,
						);
					}),
				]);
				const prefix = `${props.value}.`;
				const objects = Object.fromEntries(
					Object.entries(allObjects).filter(([id]) => id.startsWith(prefix)),
				);

				if (!active) return;

				setCapabilities(
					inspectPvForecastCapabilities(props.value, objects),
				);
				setCapabilitiesLoading(false);
			} catch (error) {
				if (!active) return;

				console.error(
					"[SAX Power] PVForecast capability discovery failed",
					error,
				);
				setCapabilities(null);
				setCapabilitiesLoading(false);
			}
		})();

		return () => {
			active = false;
		};
	}, [props.socket, props.value]);

	return (
		<Stack spacing={1.5} sx={{ marginTop: 2 }}>
			<TextField
				select
				fullWidth
				required
				label="PV forecast instance"
				value={props.value}
				onChange={(event) => props.onChange(event.target.value || undefined)}
				error={props.error}
				helperText="Select the PVForecast instance that belongs to this installation."
			>
				<MenuItem value="">
					<em>Select an instance</em>
				</MenuItem>
				{instances.map(option => (
					<MenuItem
						key={option.value}
						value={option.value}
						disabled={!option.enabled}
					>
						{option.label}
					</MenuItem>
				))}
			</TextField>

			{instancesLoading ? (
				<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
					<CircularProgress size={18} />
					<Typography variant="body2">
						Checking PVForecast instances…
					</Typography>
				</Stack>
			) : instancesError ? (
				<Alert severity="error">
					<Typography variant="body2" sx={{ fontWeight: 700 }}>
						PVForecast instances could not be read
					</Typography>
					<Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
						{instancesError}
					</Typography>
				</Alert>
			) : capabilitiesLoading ? (
				<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
					<CircularProgress size={18} />
					<Typography variant="body2">
						Checking PVForecast data…
					</Typography>
				</Stack>
			) : capabilities ? (
				<Alert severity={capabilities.compatible ? "success" : "warning"}>
					<Typography variant="body2" sx={{ fontWeight: 700 }}>
						{capabilities.compatible
							? "PVForecast data source detected"
							: "PVForecast data source incomplete"}
					</Typography>
					<Typography variant="caption">
						{capabilities.compatible
							? "All required forecast summary states are available."
							: `Missing: ${capabilities.missingStateIds.join(", ")}`}
					</Typography>
				</Alert>
			) : null}
		</Stack>
	);
}
