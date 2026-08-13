import React, {
useEffect,
} from "react";

import {
Alert,
Box,
Button,
Card,
CardContent,
Chip,
CircularProgress,
Divider,
FormControlLabel,
Grid,
IconButton,
InputAdornment,
Link,
MenuItem,
Stack,
Switch,
Tab,
Tabs,
TextField,
ThemeProvider,
Tooltip,
Typography,
} from "@mui/material";

import {
CloudDone,
CloudOff,
Code,
Description,
EnergySavingsLeaf,
SolarPower,
Home,
ElectricalServices,
BatteryChargingFull,
BatteryFull,
Settings,
GitHub,
InfoOutlined,
Lock,
OpenInNew,
Refresh,
Savings,
Storage,
SupportAgent,
Timeline,
Visibility,
VisibilityOff,
} from "@mui/icons-material";

import {
GenericApp,
type GenericAppProps,
type GenericAppState,
} from "@iobroker/gui-components";

import type {
AdapterRuntimeStatus,
AdminTab,
ModbusInstanceOption,
SaxPowerConnectionState,
SaxPowerNativeConfig,
StrategyRuntimeState,
} from "./types";

import {
strategyRuntimeConfigurationFromNative,
} from "../../src/lib/strategyNativeConfiguration";

import {
validateStrategyRuntimeConfiguration,
} from "../../src/lib/strategyRuntimeConfiguration";

interface SaxPowerAdminState
extends GenericAppState {
selectedTab: AdminTab;
runtimeStatus: AdapterRuntimeStatus;
statusLoading: boolean;
statusLoaded: boolean;
statusError: string;
showPassword: boolean;
modbusInstances: ModbusInstanceOption[];
modbusInstancesLoaded: boolean;
}

interface RuntimeLoaderProps {
enabled: boolean;
onLoad: () => void;
intervalMs?: number;
}

function RuntimeLoader(
props: RuntimeLoaderProps,
): null {
useEffect(
() => {
if (!props.enabled) {
return undefined;
}

props.onLoad();

const interval =
window.setInterval(
props.onLoad,
props.intervalMs ??
10_000,
);

return () => {
window.clearInterval(
interval,
);
};
},
[
props.enabled,
props.intervalMs,
props.onLoad,
],
);

return null;
}

const EMPTY_RUNTIME_STATUS:
AdapterRuntimeStatus = {
connection: null,
connectionState: "unknown",
	lastHttpStatus: 0,
lastError: "",
lastUpdate: "",
deviceCount: null,
statisticsSource:
"pending-history-discovery",
firstMeasurement: "",
statisticsLastUpdate: "",
strategyState: "unknown",
strategyDetail: "",
pvPower: null,
houseConsumptionPower: null,
gridPower: null,
gridDirection: "idle",
batteryPower: null,
batteryDirection: "idle",
soc: null,
liveLastUpdate: "",
batteries: [],
aggregateBattery: {
deviceCount: null,
dayCycles: null,
monthCycles: null,
yearCycles: null,
totalCycles: null,
healthStatus: "notAvailable",
healthValue: null,
validRuns: 0,
requiredRuns: 5,
rejectedRuns: 0,
},
};

export default class App
extends GenericApp<
GenericAppProps,
SaxPowerAdminState
> {
public constructor(
props: GenericAppProps,
) {
const extendedProps:
GenericAppProps = {
...props,
adapterName: "sax-power",
};

super(extendedProps);

this.state = {
...this.state,
selectedTab: "login",
runtimeStatus: {
...EMPTY_RUNTIME_STATUS,
},
statusLoading: false,
statusLoaded: false,
statusError: "",
showPassword: false,
modbusInstances: [],
modbusInstancesLoaded: false,
};
}

private getNamespace(): string {
const query =
new URLSearchParams(
window.location.search,
);

const instance =
query.get("instance") ??
"0";

return `sax-power.${instance}`;
}

	private readStateValue(
		state:
			| {
				val?: unknown;
			}
			| null
			| undefined,
	): string | number | boolean | null {
		const value =
			state?.val;

		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			return value;
		}

		return null;
	}

private readNumberState(
state:
| {
val?: unknown;
}
| null
| undefined,
): number | null {
const value =
this.readStateValue(state);

return typeof value === "number"
? value
: null;
}



private readonly loadRuntimeStatus =
async (): Promise<void> => {
if (!this.state.modbusInstancesLoaded) {
void this.loadModbusInstances();
}

if (this.state.statusLoading) {
return;
}

this.setState({
statusLoading: true,
statusError: "",
});

try {
const namespace =
this.getNamespace();

const [
connectionState,
connectionDetailState,
			lastHttpStatusState,
			lastErrorState,
lastUpdateState,
deviceCountState,
statisticsSourceState,
firstMeasurementState,
statisticsLastUpdateState,
strategyState,
strategyDetailState,
pvPowerState,
houseConsumptionPowerState,
gridPowerState,
gridDirectionState,
batteryPowerState,
batteryDirectionState,
socState,
liveLastUpdateState,
batteryStates,
] = await Promise.all([
this.socket.getState(
`${namespace}.info.connection`,
),
this.socket.getState(
`${namespace}.info.connectionState`,
),
this.socket.getState(
`${namespace}.info.lastHttpStatus`,
),
this.socket.getState(
`${namespace}.info.lastError`,
),
this.socket.getState(
`${namespace}.info.lastUpdate`,
),
this.socket.getState(
`${namespace}.summary.statistics.info.deviceCount`,
),
this.socket.getState(
`${namespace}.summary.statistics.info.source`,
),
this.socket.getState(
`${namespace}.summary.statistics.info.firstMeasurement`,
),
this.socket.getState(
`${namespace}.summary.statistics.info.lastUpdate`,
),
this.socket.getState(
`${namespace}.info.strategyState`,
),
this.socket.getState(
`${namespace}.info.strategyDetail`,
),
this.socket.getState(
`${namespace}.live.pvPower`,
),
this.socket.getState(
`${namespace}.live.houseConsumptionPower`,
),
this.socket.getState(
`${namespace}.live.gridPower`,
),
this.socket.getState(
`${namespace}.live.gridDirection`,
),
this.socket.getState(
`${namespace}.live.batteryPower`,
),
this.socket.getState(
`${namespace}.live.batteryDirection`,
),
this.socket.getState(
`${namespace}.live.soc`,
),
this.socket.getState(
`${namespace}.live.lastUpdate`,
),
this.socket.getStates(
`${namespace}.*`,
),
]);

const readBatteryState = (id: string): string | number | boolean | null =>
this.readStateValue(batteryStates[id]);
const serialNumbers = Array.from(new Set(
Object.keys(batteryStates)
.map((id) => id.match(new RegExp(`^${namespace.replace(".", "\\.")}\\.devices\\.([^.]+)\\.battery\\.`))?.[1])
.filter((serialNumber): serialNumber is string => Boolean(serialNumber)),
));
const batteries = serialNumbers.map((serialNumber) => {
const root = `${namespace}.devices.${serialNumber}.battery`;
const numberValue = (suffix: string): number | null => {
const value = readBatteryState(`${root}.${suffix}`);
return typeof value === "number" ? value : null;
};

return {
serialNumber,
model: String(readBatteryState(`${root}.model`) ?? "notConfigured"),
reportedCycles: numberValue("cycles.reported"),
dayCycles: numberValue("cycles.day"),
monthCycles: numberValue("cycles.month"),
yearCycles: numberValue("cycles.year"),
totalCycles: numberValue("cycles.total"),
healthStatus: String(readBatteryState(`${root}.health.status`) ?? "notAvailable"),
healthValue: numberValue("health.value"),
validRuns: numberValue("health.validRuns") ?? 0,
requiredRuns: numberValue("health.requiredRuns") ?? 5,
rejectedRuns: numberValue("health.rejectedRuns") ?? 0,
activeRun: String(readBatteryState(`${root}.health.activeRun`) ?? "idle"),
activeRunDirection: String(readBatteryState(`${root}.health.activeRunDirection`) ?? "idle"),
activeRunSocStart: numberValue("health.activeRunSocStart"),
activeRunSocCurrent: numberValue("health.activeRunSocCurrent"),
activeRunEnergy: numberValue("health.activeRunEnergy"),
dataCollectionStartedAt: String(readBatteryState(`${root}.health.dataCollectionStartedAt`) ?? ""),
lastEvaluation: String(readBatteryState(`${root}.health.lastEvaluation`) ?? ""),
};
});
const aggregateRoot = `${namespace}.summary.battery`;
const aggregateNumber = (suffix: string): number | null => {
const value = readBatteryState(`${aggregateRoot}.${suffix}`);
return typeof value === "number" ? value : null;
};

const connectionValue =
this.readStateValue(
connectionState,
);

const connectionDetailValue =
this.readStateValue(
connectionDetailState,
);

const lastHttpStatusValue =
this.readStateValue(
lastHttpStatusState,
);

const deviceCountValue =
this.readStateValue(
deviceCountState,
);

this.setState({
runtimeStatus: {
connection:
typeof connectionValue ===
"boolean"
? connectionValue
: null,


connectionState:
this.normalizeConnectionState(
connectionDetailValue,
),

lastHttpStatus:
typeof lastHttpStatusValue ===
"number"
? lastHttpStatusValue
: 0,
lastError:
String(
this.readStateValue(
lastErrorState,
) ?? "",
),

lastUpdate:
String(
this.readStateValue(
lastUpdateState,
) ?? "",
),

deviceCount:
typeof deviceCountValue ===
"number"
? deviceCountValue
: null,

statisticsSource:
String(
this.readStateValue(
statisticsSourceState,
) ??
"pending-history-discovery",
),

firstMeasurement:
String(
this.readStateValue(
firstMeasurementState,
) ?? "",
),

statisticsLastUpdate:
String(
this.readStateValue(
statisticsLastUpdateState,
) ?? "",
),

strategyState:
this.normalizeStrategyRuntimeState(
this.readStateValue(
strategyState,
),
),

strategyDetail:
String(
this.readStateValue(
strategyDetailState,
) ?? "",
),

pvPower:
this.readNumberState(
pvPowerState,
),

houseConsumptionPower:
this.readNumberState(
houseConsumptionPowerState,
),

gridPower:
this.readNumberState(
gridPowerState,
),

gridDirection:
String(
this.readStateValue(
gridDirectionState,
) ?? "idle",
),

batteryPower:
this.readNumberState(
batteryPowerState,
),

batteryDirection:
String(
this.readStateValue(
batteryDirectionState,
) ?? "idle",
),

soc:
this.readNumberState(
socState,
),

liveLastUpdate:
String(
this.readStateValue(
liveLastUpdateState,
) ?? "",
),
batteries,
aggregateBattery: {
deviceCount: aggregateNumber("deviceCount"),
dayCycles: aggregateNumber("cycles.day"),
monthCycles: aggregateNumber("cycles.month"),
yearCycles: aggregateNumber("cycles.year"),
totalCycles: aggregateNumber("cycles.total"),
healthStatus: String(readBatteryState(`${aggregateRoot}.health.status`) ?? "notAvailable"),
healthValue: aggregateNumber("health.value"),
validRuns: aggregateNumber("health.validRuns") ?? 0,
requiredRuns: aggregateNumber("health.requiredRuns") ?? 5,
rejectedRuns: aggregateNumber("health.rejectedRuns") ?? 0,
},
},

statusLoading: false,
statusLoaded: true,
statusError: "",
});
} catch (error) {
this.setState({
statusLoading: false,
statusLoaded: true,
statusError:
error instanceof Error
? error.message
: String(error),
});
}
};

private readonly loadModbusInstances = async (): Promise<void> => {
try {
const options = await this.socket.sendTo<ModbusInstanceOption[]>(
this.getNamespace(),
"getModbusInstances",
{},
);
this.setState({
modbusInstances: Array.isArray(options) ? options : [],
modbusInstancesLoaded: true,
});
} catch {
this.setState({
modbusInstances: [],
modbusInstancesLoaded: true,
});
}
};

private updateNativeField<
Key extends keyof SaxPowerNativeConfig,
>(
key: Key,
value: SaxPowerNativeConfig[Key],
): void {
const currentNative =
this.state.native as
unknown as SaxPowerNativeConfig;

const nextNative:
SaxPowerNativeConfig = {
...currentNative,
[key]: value,
};
const strategyError = this.strategyConfigurationError(nextNative);

this.setState({
native:
nextNative as unknown as
Record<string, unknown>,

changed:
this.getIsChanged(
nextNative as unknown as
Record<string, unknown>,
),

isConfigurationError: strategyError,
} as unknown as Pick<
SaxPowerAdminState,
"native" | "changed" | "isConfigurationError"
>);
}

private strategyConfigurationError(
native: SaxPowerNativeConfig | Record<string, unknown>,
): string {
const validation = validateStrategyRuntimeConfiguration(
strategyRuntimeConfigurationFromNative(native),
);

return validation.valid
? ""
: `Strategie-Konfiguration unvollständig: ${validation.issues
.map(issue => `${issue.field}:${issue.reason}`)
.join(", ")}`;
}

private normalizeStrategyRuntimeState(
value: string | number | boolean | null,
): StrategyRuntimeState {
switch (value) {
case "disabled":
case "invalid-configuration":
case "waiting-for-inputs":
case "starting":
case "running":
case "error":
return value;
default:
return "unknown";
}
}

private updateBatteryModel(serialNumber: string, model: string): void {
const native = this.state.native as unknown as SaxPowerNativeConfig;
this.updateNativeField("batteryModels", {
...(native.batteryModels ?? {}),
[serialNumber]: model,
});
}

private updateOptionalNumberField(
key: keyof SaxPowerNativeConfig,
rawValue: string,
multiplier = 1,
): void {
this.updateNativeField(
key,
(rawValue === "" ? undefined : Number(rawValue) * multiplier) as never,
);
}

public override onPrepareSave(settings: Record<string, unknown>): boolean {
const strategyError = this.strategyConfigurationError(settings);

if (strategyError) {
this.setConfigurationError(strategyError);
return false;
}

this.setConfigurationError("");
return super.onPrepareSave(settings);
}

private formatDate(
value: string,
): string {
if (!value) {
return "Noch nicht verfügbar";
}

const numeric =
Number(value);

const parsed =
Number.isFinite(numeric) &&
numeric > 0
? new Date(numeric)
: new Date(value);

if (
Number.isNaN(
parsed.getTime(),
)
) {
return value;
}

return parsed.toLocaleString();
}

private formatPower(
value: number | null,
): string {
if (value === null) {
return "Nicht verfügbar";
}

const absolute =
Math.abs(value);

if (absolute >= 1_000) {
return `${(
absolute / 1_000
).toLocaleString(
undefined,
{
minimumFractionDigits: 2,
maximumFractionDigits: 2,
},
)} kW`;
}

return `${Math.round(
absolute,
).toLocaleString()} W`;
}

private formatSoc(
value: number | null,
): string {
if (value === null) {
return "Nicht verfügbar";
}

return `${value.toLocaleString(
undefined,
{
minimumFractionDigits: 0,
maximumFractionDigits: 1,
},
)} %`;
}

private getGridLabel(
direction: string,
): string {
if (direction === "import") {
return "Netzbezug";
}

if (direction === "export") {
return "Einspeisung";
}

return "Kein Austausch";
}

private getBatteryLabel(
direction: string,
): string {
if (direction === "charging") {
return "Wird geladen";
}

if (direction === "discharging") {
return "Wird entladen";
}

return "Bereit";
}

private renderLiveDashboard():
React.JSX.Element {
const status =
this.state.runtimeStatus;

const cards = [
{
title: "PV-Leistung",
value:
this.formatPower(
status.pvPower,
),
subtitle:
status.pvPower === null
? "Kein PV-Wert gemeldet"
: "Aktuelle Erzeugung",
icon: <SolarPower />,
color: "warning.main",
},
{
title: "Hausverbrauch",
value:
this.formatPower(
status.houseConsumptionPower,
),
subtitle:
status.houseConsumptionPower ===
null
? "Nicht berechenbar"
: "Aktueller Verbrauch",
icon: <Home />,
color: "primary.main",
},
{
title: "Netz",
value:
this.formatPower(
status.gridPower,
),
subtitle:
status.gridPower === null
? "Nicht verfügbar"
: this.getGridLabel(
status.gridDirection,
),
icon: <ElectricalServices />,
color:
status.gridDirection ===
"export"
? "success.main"
: status.gridDirection ===
"import"
? "warning.main"
: "text.secondary",
},
{
title: "Batterie",
value:
this.formatPower(
status.batteryPower,
),
subtitle:
status.batteryPower === null
? "Nicht verfügbar"
: this.getBatteryLabel(
status.batteryDirection,
),
icon:
status.batteryDirection ===
"charging"
? <BatteryChargingFull />
: <BatteryFull />,
color:
status.batteryDirection ===
"charging"
? "success.main"
: status.batteryDirection ===
"discharging"
? "primary.main"
: "text.secondary",
},
{
title: "Ladezustand",
value:
this.formatSoc(
status.soc,
),
subtitle:
status.soc === null
? "Nicht verfügbar"
: status.deviceCount &&
status.deviceCount > 1
? `Durchschnitt aus ${status.deviceCount} Speichern`
: "Aktueller Speicherstand",
icon: <BatteryFull />,
color:
status.soc !== null &&
status.soc <= 20
? "error.main"
: status.soc !== null &&
status.soc <= 40
? "warning.main"
: "success.main",
},
];

return (
    <Card
    elevation={0}
    sx={{
    border: 1,
    borderColor: "divider",
    borderRadius: 3,
    overflow: "hidden",
    }}
    >
        <CardContent>
        <Stack
            direction={{
            xs: "column",
            sm: "row",
            }}
            spacing={1}
            sx={{
                alignItems: {
                xs: "flex-start",
                sm: "center",
                },

                justifyContent: "space-between",
                marginBottom: 2
            }}>
        <Box>
        <Typography
        variant="h6"
        sx={{
            fontWeight: 700
        }}
        >
        Live-Energie
        </Typography>

        <Typography
        variant="body2"
        sx={{
            color: "text.secondary"
        }}
        >
        Aktuelle Leistungswerte aus den
        ioBroker-Objekten
        </Typography>
        </Box>

        <Typography
        variant="caption"
        sx={{
            color: "text.secondary"
        }}
        >
        Stand:{" "}
        {
        this.formatDate(
        status.liveLastUpdate,
        )
        }
        </Typography>
        </Stack>

        <Grid
        container
        spacing={2}
        >
        {
        cards.map(
        (card) => (
        <Grid
            key={card.title}
            size={{
                xs: 12,
                sm: 6,
                md: 4,

                lg: card.title ===
                "PV-Leistung"
                ? 12
                : 3
            }}>
        <Card
        elevation={0}
        sx={{
        height: "100%",
        border: 1,
        borderColor:
        "divider",
        borderRadius: 2.5,
        backgroundColor:
        "background.paper",
        }}
        >
        <CardContent>
        <Stack
            direction="row"
            spacing={2}
            sx={{
                alignItems: "flex-start",
                justifyContent: "space-between"
            }}>
        <Box>
        <Typography
        variant="body2"
        sx={{
            color: "text.secondary"
        }}
        >
        {card.title}
        </Typography>

        <Typography
            variant={
            card.title ===
            "PV-Leistung"
            ? "h3"
            : "h4"
            }
            sx={{
                fontWeight: 800,
                marginTop: 0.5
            }}>
        {card.value}
        </Typography>

        <Typography
            variant="body2"
            sx={{
                color: "text.secondary",
                marginTop: 0.5
            }}>
        {card.subtitle}
        </Typography>
        </Box>

        <Box
        sx={{
        color:
        card.color,
        display: "flex",
        alignItems:
        "center",
        justifyContent:
        "center",
        width: 46,
        height: 46,
        borderRadius:
        "50%",
        backgroundColor:
        "action.hover",
        flexShrink: 0,
        }}
        >
        {card.icon}
        </Box>
        </Stack>
        </CardContent>
        </Card>
        </Grid>
        ),
        )
        }
        </Grid>
        </CardContent>
    </Card>
);
}



private normalizeConnectionState(
value: unknown,
): SaxPowerConnectionState | "unknown" {
const allowed = new Set<string>([
"connecting",
"connected",
"authentication_failed",
"unauthorized",
"network_error",
"timeout",
"server_error",
"invalid_response",
"configuration_error",
"unknown_error",
]);

return typeof value === "string" &&
allowed.has(value)
? value as SaxPowerConnectionState
: "unknown";
}

private getConnectionPresentation(
status: AdapterRuntimeStatus,
): {
label: string;
description: string;
color:
| "default"
| "primary"
| "secondary"
| "error"
| "info"
| "success"
| "warning";
severity:
| "error"
| "info"
| "success"
| "warning";
} {
const httpSuffix =
status.lastHttpStatus > 0
? ` (HTTP ${status.lastHttpStatus})`
: "";

switch (status.connectionState) {
case "connected":
return {
label: "Verbunden",
description:
"Die SAX-Power-Cloud ist erreichbar.",
color: "success",
severity: "success",
};

case "connecting":
return {
label: "Verbindung wird aufgebaut",
description:
"Der Adapter meldet sich gerade an der SAX-Power-Cloud an.",
color: "info",
severity: "info",
};

case "authentication_failed":
return {
label: "Anmeldung fehlgeschlagen",
description:
"Bitte Benutzername und Kennwort prüfen. Nach einem Update von einer älteren Adapterversion muss das Kennwort möglicherweise einmal neu eingegeben und gespeichert werden.",
color: "warning",
severity: "warning",
};

case "unauthorized":
return {
label: "Zugriff verweigert",
description:
`Die SAX-Power-Cloud hat den Zugriff verweigert${httpSuffix}.`,
color: "error",
severity: "error",
};

case "network_error":
return {
label: "Cloud nicht erreichbar",
description:
"Die SAX-Power-Cloud konnte nicht erreicht werden. Bitte Internet-, DNS- und Firewall-Verbindung prüfen.",
color: "error",
severity: "error",
};

case "timeout":
return {
label: "Zeitüberschreitung",
description:
"Die SAX-Power-Cloud hat nicht rechtzeitig geantwortet.",
color: "warning",
severity: "warning",
};

case "server_error":
return {
label: "Cloud-Serverfehler",
description:
`Die SAX-Power-Cloud meldet einen Serverfehler${httpSuffix}.`,
color: "error",
severity: "error",
};

case "invalid_response":
return {
label: "Ungültige Cloud-Antwort",
description:
"Die SAX-Power-Cloud hat eine unerwartete oder ungültige Antwort geliefert.",
color: "warning",
severity: "warning",
};

case "configuration_error":
return {
label: "Konfiguration unvollständig",
description:
status.lastError ||
"Bitte die Cloud-Konfiguration prüfen.",
color: "warning",
severity: "warning",
};

case "unknown_error":
return {
label: "Unbekannter Fehler",
description:
status.lastError ||
"Es ist ein unbekannter Verbindungsfehler aufgetreten.",
color: "error",
severity: "error",
};

default:
return {
label:
status.connection === true
? "Verbunden"
: status.connection === false
? "Nicht verbunden"
: "Status unbekannt",
description:
status.lastError ||
"Noch kein detaillierter Cloud-Status verfügbar.",
color:
status.connection === true
? "success"
: status.connection === false
? "error"
: "default",
severity:
status.connection === true
? "success"
: status.connection === false
? "error"
: "info",
};
}
}

private renderHeader(
darkMode: boolean,
): React.JSX.Element {
const status =
this.state.runtimeStatus;

const connection =
this.getConnectionPresentation(status);

const connected =
status.connectionState === "connected" ||
status.connection === true;

return (
    <Card
    elevation={0}
    sx={{
    borderRadius: 3,
    overflow: "hidden",
    border: 1,
    borderColor: "divider",
    background:
    darkMode
    ? "linear-gradient(135deg, rgba(20,31,46,0.98), rgba(14,20,30,0.98))"
    : "linear-gradient(135deg, #ffffff, #eef5fb)",
    }}
    >
        <CardContent
        sx={{
        padding: {
        xs: 2,
        md: 3,
        },
        "&:last-child": {
        paddingBottom: {
        xs: 2,
        md: 3,
        },
        },
        }}
        >
        <Stack
            direction={{
            xs: "column",
            sm: "row",
            }}
            spacing={2}
            sx={{
                alignItems: {
                xs: "flex-start",
                sm: "center",
                },

                justifyContent: "space-between"
            }}>
        <Stack
        direction="row"
        spacing={2}
        sx={{
            alignItems: "center"
        }}
        >
        <Box
        component="img"
        src="sax-power.png"
        alt="SAX Power"
        sx={{
        width: 68,
        height: 68,
        objectFit:
        "contain",
        backgroundColor:
        "#ffffff",
        borderRadius: 2,
        padding: 0.75,
        boxShadow: 1,
        }}
        />

        <Box>
        <Typography
        variant="h4"
        component="h1"
        sx={{
        fontWeight: 700,
        lineHeight: 1.1,
        }}
        >
        SAX Power
        </Typography>

        <Typography
            variant="body2"
            sx={{
                color: "text.secondary",
                marginTop: 0.5
            }}>
        ioBroker Cloud Adapter
        </Typography>
        </Box>
        </Stack>

        <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
                alignItems: "center",
                flexWrap: "wrap"
            }}>
        <Chip
        icon={
        connected
        ? <CloudDone />
        : <CloudOff />
        }
        label={connection.label}
        color={connection.color}
        variant={
        darkMode
        ? "outlined"
        : "filled"
        }
        />


        <Tooltip title="Status aktualisieren">
        <span>
        <IconButton
        onClick={
        this.loadRuntimeStatus
        }
        disabled={
        this.state
        .statusLoading
        }
        color="primary"
        >
        {
        this.state
        .statusLoading
        ? <Refresh sx={{
        animation: "saxPowerRefresh 0.8s linear infinite",
        "@keyframes saxPowerRefresh": {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
        },
        }} />
        : <Refresh />
        }
        </IconButton>
        </span>
        </Tooltip>
        </Stack>
        </Stack>
        </CardContent>
    </Card>
);
}

private renderLoginTab(
native: SaxPowerNativeConfig,
): React.JSX.Element {
return (
    <Grid
    container
    spacing={2}
    >
        <Grid
            size={{
                xs: 12,
                lg: 8
            }}>
        <Card
        elevation={0}
        sx={{
        height: "100%",
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        }}
        >
        <CardContent>
        <Stack
            direction="row"
            spacing={1}
            sx={{
                alignItems: "center",
                marginBottom: 2.5
            }}>
        <CloudDone
        color="primary"
        />

        <Typography
        variant="h6"
        sx={{
            fontWeight: 700
        }}
        >
        Anmeldung
        </Typography>
        </Stack>

        <Stack spacing={2.5}>
        <TextField
        fullWidth
        label="Benutzername / E-Mail"
        value={
        native.username ??
        ""
        }
        onChange={
        (event) =>
        this.updateNativeField(
        "username",
        event.target
        .value,
        )
        }
        />

        <TextField
        fullWidth
        label="Passwort"
        type={
        this.state
        .showPassword
        ? "text"
        : "password"
        }
        value={
        native.password ??
        ""
        }
        onChange={
        (event) =>
        this.updateNativeField(
        "password",
        event.target
        .value,
        )
        }
        slotProps={{
        input: {
        startAdornment: (
        <InputAdornment
        position="start"
        >
        <Lock />
        </InputAdornment>
        ),

        endAdornment: (
        <InputAdornment
        position="end"
        >
        <IconButton
        edge="end"
        onClick={
        () =>
        this.setState({
        showPassword:
        !this
        .state
        .showPassword,
        })
        }
        aria-label="Passwort anzeigen"
        >
        {
        this.state
        .showPassword
        ? <VisibilityOff />
        : <Visibility />
        }
        </IconButton>
        </InputAdornment>
        ),
        },
        }}
        />

        </Stack>
        </CardContent>
        </Card>
        </Grid>

        <Grid
            size={{
                xs: 12,
                lg: 4
            }}>
        <Stack spacing={2}>
        <Card
        elevation={0}
        sx={{
        border: 1,
        borderColor:
        "divider",
        borderRadius: 3,
        }}
        >
        <CardContent>
        <Typography
        variant="overline"
        sx={{
            color: "text.secondary"
        }}
        >
        Verbindung
        </Typography>

        <Typography
            variant="h5"
            sx={{
                fontWeight: 700,
                marginTop: 0.5
            }}>
        {
        this.state
        .runtimeStatus
        .connection ===
        true
        ? "Online"
        : this.state
        .runtimeStatus
        .connection ===
        null
        ? "Unbekannt"
        : "Offline"
        }
        </Typography>

        <Typography
            variant="body2"
            sx={{
                color: "text.secondary",
                marginTop: 1
            }}>
        Letzte Aktualisierung:
        </Typography>

        <Typography
        variant="body2"
        >
        {
        this.formatDate(
        this.state
        .runtimeStatus
        .lastUpdate,
        )
        }
        </Typography>
        </CardContent>
        </Card>

        <Card
        elevation={0}
        sx={{
        border: 1,
        borderColor:
        "divider",
        borderRadius: 3,
        }}
        >
        <CardContent>
        <Stack
        direction="row"
        spacing={1}
        sx={{
            alignItems: "center"
        }}
        >
        <Storage
        color="primary"
        />

        <Typography
        variant="h6"
        sx={{
            fontWeight: 700
        }}
        >
        Erkannte Speicher
        </Typography>
        </Stack>

        <Typography
            variant="h3"
            color="primary"
            sx={{
                fontWeight: 700,
                marginTop: 1
            }}>
        {
        this.state
        .runtimeStatus
        .deviceCount ??
        "–"
        }
        </Typography>
        </CardContent>
        </Card>
        </Stack>
        </Grid>
    </Grid>
);
}

private renderSettingsTab(native: SaxPowerNativeConfig): React.JSX.Element {
const batteries = this.state.runtimeStatus.batteries;
const strategyRuntime = this.state.runtimeStatus.strategyState;
const strategyRuntimePresentation: Record<StrategyRuntimeState, {
label: string;
severity: "success" | "info" | "warning" | "error";
}> = {
disabled: { label: "Deaktiviert", severity: "info" },
"invalid-configuration": { label: "Konfiguration fehlerhaft", severity: "warning" },
"waiting-for-inputs": { label: "Wartet auf Eingänge", severity: "warning" },
starting: { label: "Wird gestartet", severity: "info" },
running: { label: "Aktiv", severity: "success" },
error: { label: "Laufzeitfehler", severity: "error" },
unknown: { label: "Noch nicht verfügbar", severity: "info" },
};
const strategyRuntimeStatus = strategyRuntimePresentation[strategyRuntime];
const strategyValidation = validateStrategyRuntimeConfiguration(
strategyRuntimeConfigurationFromNative(native),
);
const strategyIssues = strategyValidation.valid
? []
: strategyValidation.issues;
const hasStrategyIssue = (field: string): boolean =>
strategyIssues.some(issue => issue.field === field);
const strategyNumber = (
value: unknown,
divisor = 1,
): number | "" => typeof value === "number" && Number.isFinite(value)
? value / divisor
: "";

return (
<Stack spacing={2}>
<Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
<CardContent>
<Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
<Settings color="primary" />
<Typography variant="h6" sx={{ fontWeight: 700 }}>Einstellungen</Typography>
</Stack>
<TextField
fullWidth
label="Aktualisierungsintervall"
type="number"
value={native.pollInterval ?? 60}
onChange={(event) => this.updateNativeField(
"pollInterval",
Math.max(60, Number(event.target.value) || 60),
)}
helperText="Mindestens 60 Sekunden"
slotProps={{
input: { endAdornment: <InputAdornment position="end">Sekunden</InputAdornment> },
htmlInput: { min: 60, step: 10 },
}}
/>
</CardContent>
</Card>

<Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
<CardContent>
<Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 1 }}>
<EnergySavingsLeaf color="primary" />
<Typography variant="h6" sx={{ fontWeight: 700 }}>Speicherstrategie</Typography>
</Stack>
<Typography variant="body2" sx={{ color: "text.secondary", marginBottom: 2 }}>
Steuert die automatische Tagesentladung und den manuellen Ladeleistungsmodus. Die Strategie bleibt ausgeschaltet, bis alle Werte vollständig konfiguriert und gespeichert wurden.
</Typography>
<Alert
severity={strategyRuntimeStatus.severity}
sx={{ marginBottom: 2 }}
action={<Chip size="small" label={strategyRuntimeStatus.label} />}
>
<Typography variant="body2" sx={{ fontWeight: 700 }}>
Laufzeitstatus
</Typography>
{this.state.runtimeStatus.strategyDetail ? (
<Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
{this.state.runtimeStatus.strategyDetail}
</Typography>
) : null}
</Alert>
<FormControlLabel
control={(
<Switch
checked={native.strategyEnabled === true}
onChange={(event) => this.updateNativeField("strategyEnabled", event.target.checked)}
/>
)}
label="Speicherstrategie aktivieren"
/>
{native.strategyEnabled === true ? (
<Stack spacing={2} sx={{ marginTop: 2 }}>
<Alert severity={strategyValidation.valid ? "success" : "warning"}>
{strategyValidation.valid
? "Die Strategie-Konfiguration ist vollständig und kann gespeichert werden."
: "Bitte alle markierten Pflichtfelder vollständig und gültig ausfüllen."}
</Alert>
<TextField
select
fullWidth
required
label="Modbus-Instanz"
value={typeof native.strategyModbusInstance === "string" ? native.strategyModbusInstance : ""}
onChange={(event) => this.updateNativeField("strategyModbusInstance", event.target.value || undefined)}
error={hasStrategyIssue("modbusInstance")}
helperText="Die benötigten SAX-Register 43 bis 48 werden beim Adapterstart live geprüft"
>
<MenuItem value=""><em>Bitte Instanz auswählen</em></MenuItem>
{this.state.modbusInstances.map(option => (
<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
))}
</TextField>
<TextField
select
fullWidth
label="Batteriemodell"
value={typeof native.strategyBatteryModelId === "string" ? native.strategyBatteryModelId : ""}
onChange={(event) => this.updateNativeField("strategyBatteryModelId", event.target.value || undefined)}
error={hasStrategyIssue("batteryModelId")}
helperText="Technische Leistungs- und Kapazitätsgrenzen des Speichers"
>
<MenuItem value=""><em>Bitte Modell auswählen</em></MenuItem>
<MenuItem value="home-5.8">SAX Power Home 5,8 kWh</MenuItem>
<MenuItem value="home-plus-7.7">SAX Power Home Plus 7,7 kWh</MenuItem>
</TextField>
<Grid container spacing={2}>
{[
{
key: "strategyMinimumStateOfChargePercent" as const,
field: "minimumStateOfChargePercent",
label: "Minimaler SOC",
unit: "%",
min: 0,
max: 100,
},
{
key: "strategyMaximumStateOfChargePercent" as const,
field: "maximumStateOfChargePercent",
label: "Maximaler SOC",
unit: "%",
min: 0,
max: 100,
},
{
key: "strategyMaximumChargePowerW" as const,
field: "maximumChargePowerW",
label: "Maximale Ladeleistung",
unit: "W",
min: 0,
},
{
key: "strategyMaximumDischargePowerW" as const,
field: "maximumDischargePowerW",
label: "Maximale Entladeleistung",
unit: "W",
min: 0,
},
{
key: "strategyPvForecastReserveWh" as const,
field: "pvForecastReserveWh",
label: "PV-Prognosereserve",
unit: "Wh",
min: 0,
},
{
key: "strategyRequestedDischargePowerW" as const,
field: "requestedDischargePowerW",
label: "Entladeleistungsziel Tag",
unit: "W",
min: 0,
},
].map(item => (
<Grid key={item.key} size={{ xs: 12, md: 6 }}>
<TextField
fullWidth
required
type="number"
label={item.label}
value={strategyNumber(native[item.key])}
onChange={(event) => this.updateOptionalNumberField(item.key, event.target.value)}
error={hasStrategyIssue(item.field)}
slotProps={{
input: { endAdornment: <InputAdornment position="end">{item.unit}</InputAdornment> },
htmlInput: { min: item.min, max: item.max, step: 1 },
}}
/>
</Grid>
))}
<Grid size={{ xs: 12, md: 6 }}>
<TextField
fullWidth
required
type="number"
label="Maximales Prognosealter"
value={strategyNumber(native.strategyMaximumForecastAgeMs, 60_000)}
onChange={(event) => this.updateOptionalNumberField(
"strategyMaximumForecastAgeMs", event.target.value, 60_000,
)}
error={hasStrategyIssue("maximumForecastAgeMs")}
slotProps={{
input: { endAdornment: <InputAdornment position="end">Minuten</InputAdornment> },
htmlInput: { min: 0, step: 1 },
}}
/>
</Grid>
<Grid size={{ xs: 12, md: 6 }}>
<TextField
fullWidth
required
type="number"
label="Strategieintervall"
value={strategyNumber(native.strategyIntervalMs, 1_000)}
onChange={(event) => this.updateOptionalNumberField(
"strategyIntervalMs", event.target.value, 1_000,
)}
error={hasStrategyIssue("intervalMs")}
slotProps={{
input: { endAdornment: <InputAdornment position="end">Sekunden</InputAdornment> },
htmlInput: { min: 1, step: 1 },
}}
/>
</Grid>
</Grid>
</Stack>
) : (
<Alert severity="info" sx={{ marginTop: 2 }}>
Im deaktivierten Zustand werden keine Strategieobjekte angelegt, keine Timer gestartet und keine Modbus-Register beschrieben.
</Alert>
)}
</CardContent>
</Card>

<Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
<CardContent>
<Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 1 }}>
<BatteryFull color="primary" />
<Typography variant="h6" sx={{ fontWeight: 700 }}>Speicher konfigurieren</Typography>
</Stack>
<Typography variant="body2" sx={{ color: "text.secondary", marginBottom: 2 }}>
Wähle für jeden automatisch erkannten Speicher das passende Modell. Die hinterlegte Nennkapazität bildet die Grundlage der dokumentierten Vollzyklenberechnung.
</Typography>
<Stack spacing={2}>
{batteries.length === 0 ? (
<Alert severity="info">Noch kein Speicher erkannt. Nach einer erfolgreichen Anmeldung erscheint der Speicher automatisch hier.</Alert>
) : batteries.map((battery, index) => (
<Card key={battery.serialNumber} variant="outlined" sx={{ borderRadius: 2 }}>
<CardContent>
<Typography variant="subtitle1" sx={{ fontWeight: 700, marginBottom: 1.5 }}>
Speicher {index + 1}
</Typography>
<TextField
select
fullWidth
label="Modell"
value={native.batteryModels?.[battery.serialNumber] ?? ""}
onChange={(event) => this.updateBatteryModel(battery.serialNumber, event.target.value)}
>
<MenuItem value=""><em>Bitte Modell auswählen</em></MenuItem>
<MenuItem value="home-5.8">SAX Power Home 5,8 kWh — 5,76 kWh nominal / 5,20 kWh nutzbar</MenuItem>
<MenuItem value="home-plus-7.7">SAX Power Home Plus 7,7 kWh — 7,68 kWh nominal / 7,00 kWh nutzbar</MenuItem>
</TextField>
</CardContent>
</Card>
))}
<Alert severity="info">Geschätzte Batteriegesundheit: Noch nicht verfügbar. Der Adapter sammelt zunächst eine belastbare Datenbasis; es wird kein ungesicherter Prozentwert erzeugt.</Alert>
</Stack>
</CardContent>
</Card>
</Stack>
);
}

private formatCycles(value: number | null): string {
return value === null ? "Nicht verfügbar" : value.toLocaleString("de-DE", { maximumFractionDigits: 3 });
}

private formatBatteryHealth(status: string): string {
const labels: Record<string, string> = {
notAvailable: "Noch nicht verfügbar",
collectingData: "Datenbasis wird aufgebaut",
insufficientData: "Noch keine belastbaren Messungen",
available: "Verfügbar",
};
return labels[status] ?? status;
}

private formatHealthValue(value: number | null, status: string): string {
return value === null ? this.formatBatteryHealth(status) : `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % (geschätzt)`;
}

private renderBatteryStatus(): React.JSX.Element {
const { batteries, aggregateBattery } = this.state.runtimeStatus;
const cycleRows = [
{ label: "Heute", key: "dayCycles" as const },
{ label: "Monat", key: "monthCycles" as const },
{ label: "Jahr", key: "yearCycles" as const },
{ label: "Gesamt", key: "totalCycles" as const },
];

return (
<Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
<CardContent>
<Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
<BatteryFull color="primary" />
<Typography variant="h6" sx={{ fontWeight: 700 }}>Batteriezustand & Vollzyklen</Typography>
</Stack>
{batteries.length === 0 ? (
<Alert severity="info">Noch keine Batteriedaten verfügbar.</Alert>
) : (
<Grid container spacing={2}>
{batteries.map((battery, index) => (
<Grid key={battery.serialNumber} size={{ xs: 12, lg: batteries.length > 1 ? 6 : 12 }}>
<Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
<CardContent>
<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
Speicher {index + 1}: {battery.serialNumber}
</Typography>
<Typography variant="body2" sx={{ color: "text.secondary", marginBottom: 2 }}>
{battery.model === "notConfigured" ? "Modell noch nicht ausgewählt" : battery.model}
</Typography>
<Grid container spacing={1.5}>
<Grid size={{ xs: 12, sm: 6 }}>
<Typography variant="caption" color="text.secondary">Vom Speicher gemeldet</Typography>
<Typography variant="h6">{this.formatCycles(battery.reportedCycles)} Zyklen</Typography>
</Grid>
<Grid size={{ xs: 12, sm: 6 }}>
<Typography variant="caption" color="text.secondary">Batteriegesundheit</Typography>
<Typography variant="h6">{this.formatHealthValue(battery.healthValue, battery.healthStatus)}</Typography>
<Typography variant="body2" color="text.secondary">
Valide Messläufe: {battery.validRuns} von {battery.requiredRuns} · Verworfen: {battery.rejectedRuns}
</Typography>
{battery.activeRun === "active" ? (
<Typography variant="body2" color="text.secondary">
Aktuell: {battery.activeRunDirection === "discharging" ? "Entladung" : "Ladung"} · SOC {battery.activeRunSocStart ?? "–"} % → {battery.activeRunSocCurrent ?? "–"} % · {battery.activeRunEnergy?.toLocaleString("de-DE", { maximumFractionDigits: 3 }) ?? "–"} kWh
</Typography>
) : (
<Typography variant="body2" color="text.secondary">Aktueller Messlauf: keiner</Typography>
)}
</Grid>
{cycleRows.map((row) => (
<Grid key={row.key} size={{ xs: 6, sm: 3 }}>
<Typography variant="caption" color="text.secondary">{row.label}</Typography>
<Typography sx={{ fontWeight: 700 }}>{this.formatCycles(battery[row.key])}</Typography>
</Grid>
))}
</Grid>
</CardContent>
</Card>
</Grid>
))}
{batteries.length > 1 ? (
<Grid size={{ xs: 12 }}>
<Card variant="outlined" sx={{ borderRadius: 2 }}>
<CardContent>
<Typography variant="subtitle1" sx={{ fontWeight: 700, marginBottom: 1.5 }}>Gesamtsystem</Typography>
<Grid container spacing={1.5}>
{cycleRows.map((row) => (
<Grid key={row.key} size={{ xs: 6, sm: 2.4 }}>
<Typography variant="caption" color="text.secondary">{row.label}</Typography>
<Typography sx={{ fontWeight: 700 }}>{this.formatCycles(aggregateBattery[row.key])}</Typography>
</Grid>
))}
<Grid size={{ xs: 12, sm: 2.4 }}>
<Typography variant="caption" color="text.secondary">Batteriegesundheit</Typography>
<Typography sx={{ fontWeight: 700 }}>{this.formatHealthValue(aggregateBattery.healthValue, aggregateBattery.healthStatus)}</Typography>
<Typography variant="body2" color="text.secondary">{aggregateBattery.validRuns} von {aggregateBattery.requiredRuns} valide · {aggregateBattery.rejectedRuns} verworfen</Typography>
</Grid>
</Grid>
</CardContent>
</Card>
</Grid>
) : null}
</Grid>
)}
</CardContent>
</Card>
);
}

private renderStatusTab(): React.JSX.Element {
const status =
this.state.runtimeStatus;

const pending =
status.statisticsSource ===
"pending-history-discovery";

const connection =
this.getConnectionPresentation(status);

return (
    <Stack spacing={2}>
        {this.renderLiveDashboard()}

        {
        this.state.statusError
        ? (
        <Alert severity="error">
        {
        this.state
        .statusError
        }
        </Alert>
        )
        : null
        }

        {this.renderBatteryStatus()}

        <Grid
        container
        spacing={2}
        >
        {
        [
        {
        title:
        "Cloud-Verbindung",
        value:
        connection.label,
        icon:
        status.connection ===
        true
        ? <CloudDone />
        : <CloudOff />,
        color:
        status.connection ===
        true
        ? "success.main"
        : status.connection ===
        null
        ? "text.secondary"
        : "error.main",
        },
        {
        title:
        "Speicher",
        value:
        status.deviceCount ??
        "–",
        icon: <Storage />,
        color:
        "primary.main",
        },
        {
        title:
        "Statistikquelle",
        value:
        pending
        ? "Noch nicht aktiv"
        : status.statisticsSource,
        icon: <Timeline />,
        color:
        pending
        ? "warning.main"
        : "success.main",
        },
        {
        title:
        "Letzter Abruf",
        value:
        this.formatDate(
        status.lastUpdate,
        ),
        icon:
        <EnergySavingsLeaf />,
        color:
        "primary.main",
        },
        ].map(
        (card) => (
        <Grid
            key={
            card.title
            }
            size={{
                xs: 12,
                sm: 6,
                lg: 3
            }}>
        <Card
        elevation={0}
        sx={{
        height:
        "100%",
        border: 1,
        borderColor:
        "divider",
        borderRadius: 3,
        }}
        >
        <CardContent>
        <Box
        sx={{
        color:
        card.color,
        marginBottom: 1,
        }}
        >
        {
        card.icon
        }
        </Box>

        <Typography
        variant="body2"
        sx={{
            color: "text.secondary"
        }}
        >
        {
        card.title
        }
        </Typography>

        <Typography
            variant="h6"
            sx={{
                fontWeight: 700,
                marginTop: 0.5,

                wordBreak:
                "break-word"
            }}>
        {
        card.value
        }
        </Typography>
        </CardContent>
        </Card>
        </Grid>
        ),
        )
        }
        </Grid>

        <Card
        elevation={0}
        sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        }}
        >
        <CardContent>
        <Stack
        direction="row"
        spacing={1}
        sx={{
            alignItems: "center"
        }}
        >
        <Timeline
        color="primary"
        />

        <Typography
        variant="h6"
        sx={{
            fontWeight: 700
        }}
        >
        Historische Statistik
        </Typography>
        </Stack>

        <Divider
        sx={{
        marginY: 2,
        }}
        />

        {
        pending
        ? (
        <Alert
        severity="info"
        icon={
        <InfoOutlined />
        }
        >
        <Typography
        sx={{
            fontWeight: 700
        }}
        >
        Historischer Abruf noch nicht implementiert
        </Typography>

        <Typography
        variant="body2"
        sx={{
        marginTop: 0.5,
        }}
        >
        Die Statistikobjekte sind bereits vorbereitet. Der Wert
        {" "}
        <strong>
        pending-history-discovery
        </strong>
        {" "}
        bedeutet nicht, dass ein automatischer Prozess wartet.
        Die Dashboard- beziehungsweise CSV-History wird in der
        nächsten Entwicklungsphase implementiert.
        </Typography>
        </Alert>
        )
        : (
        <Alert severity="success">
        Die historische Statistik ist aktiv.
        </Alert>
        )
        }

        <Grid
        container
        spacing={2}
        sx={{
        marginTop: 0.5,
        }}
        >
        <Grid
            size={{
                xs: 12,
                md: 6
            }}>
        <Typography
        variant="caption"
        sx={{
            color: "text.secondary"
        }}
        >
        Erste Messung
        </Typography>

        <Typography>
        {
        this.formatDate(
        status.firstMeasurement,
        )
        }
        </Typography>
        </Grid>

        <Grid
            size={{
                xs: 12,
                md: 6
            }}>
        <Typography
        variant="caption"
        sx={{
            color: "text.secondary"
        }}
        >
        Letzte Statistikaktualisierung
        </Typography>

        <Typography>
        {
        this.formatDate(
        status.statisticsLastUpdate,
        )
        }
        </Typography>
        </Grid>
        </Grid>
        </CardContent>
        </Card>

        {
        status.lastError
        ? (
        <Alert severity="warning">
        <strong>
        Letzter Adapterfehler:
        </strong>
        {" "}
        {status.lastError}
        </Alert>
        )
        : null
        }
    </Stack>
);
}

private renderSupportTab(): React.JSX.Element {
const links = [
{
title:
"GitHub Repository",
description:
"Quellcode und Projektentwicklung",
url:
"https://github.com/GodHunter/ioBroker.sax-power",
icon: <GitHub />,
},
{
title:
"Dokumentation",
description:
"Objekte, API, Architektur und Statistik",
url:
"https://github.com/GodHunter/ioBroker.sax-power/tree/main/docs",
icon:
<Description />,
},
{
title:
"Issue melden",
description:
"Fehler melden oder Funktion vorschlagen",
url:
"https://github.com/GodHunter/ioBroker.sax-power/issues",
icon:
<SupportAgent />,
},
{
title:
"MIT-Lizenz",
description:
"Lizenzbedingungen des Projekts",
url:
"https://github.com/GodHunter/ioBroker.sax-power/blob/main/LICENSE",
icon: <Code />,
},
];

return (
    <Grid
    container
    spacing={2}
    >
        <Grid
            size={{
                xs: 12,
                lg: 8
            }}>
        <Card
        elevation={0}
        sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        }}
        >
        <CardContent>
        <Typography
        variant="h6"
        sx={{
            fontWeight: 700
        }}
        >
        Projekt & Hilfe
        </Typography>

        <Typography
            variant="body2"
            sx={{
                color: "text.secondary",
                marginTop: 0.5,
                marginBottom: 2
            }}>
        Der SAX-Power-Adapter ist ein unabhängiges
        Open-Source-Community-Projekt.
        </Typography>

        <Grid
        container
        spacing={2}
        >
        {
        links.map(
        (link) => (
        <Grid
            key={
            link.title
            }
            size={{
                xs: 12,
                sm: 6
            }}>
        <Button
        fullWidth
        variant="outlined"
        startIcon={
        link.icon
        }
        endIcon={
        <OpenInNew />
        }
        component="a"
        href={
        link.url
        }
        target="_blank"
        rel="noreferrer"
        sx={{
        justifyContent:
        "flex-start",
        textAlign:
        "left",
        padding: 1.5,
        minHeight: 72,
        textTransform:
        "none",
        }}
        >
        <Box>
        <Typography
        sx={{
            fontWeight: 700
        }}
        >
        {
        link.title
        }
        </Typography>

        <Typography
        variant="caption"
        sx={{
            color: "text.secondary"
        }}
        >
        {
        link.description
        }
        </Typography>
        </Box>
        </Button>
        </Grid>
        ),
        )
        }
        </Grid>

        <Alert
        severity="info"
        sx={{
        marginTop: 2,
        }}
        >
        SAX Power und das SAX-Power-Logo sind geschützte
        Marken beziehungsweise Markenbestandteile der
        SAX Power GmbH. Dieses Projekt ist nicht offiziell
        mit der SAX Power GmbH verbunden.
        </Alert>
        </CardContent>
        </Card>
        </Grid>

        <Grid
            size={{
                xs: 12,
                lg: 4
            }}>
        <Stack spacing={2}>
        <Card
        elevation={0}
        sx={{
        border: 1,
        borderColor:
        "divider",
        borderRadius: 3,
        }}
        >
        <CardContent>
        <Stack
        direction="row"
        spacing={1}
        sx={{
            alignItems: "center"
        }}
        >
        <Savings
        color="primary"
        />

        <Typography
        variant="h6"
        sx={{
            fontWeight: 700
        }}
        >
        Entwicklung unterstützen
        </Typography>
        </Stack>

        <Typography
            variant="body2"
            sx={{
                color: "text.secondary",
                marginTop: 1,
                marginBottom: 2
            }}>
        Der SAX Power Adapter entsteht vollständig in meiner Freizeit. Wenn er dir gefällt und dir im Alltag hilft, kannst du seine Weiterentwicklung mit einer freiwilligen Spende unterstützen. Vielen Dank!
        </Typography>

        <Button
        fullWidth
        variant="contained"
        component="a"
        href="https://www.paypal.com/donate/?business=godhunter%40posteo.de&no_recurring=0&currency_code=EUR&item_name=ioBroker%20SAX%20Power%20Adapter"
        target="_blank"
        rel="noreferrer"
        startIcon={
        <Savings />
        }
        sx={{
        textTransform:
        "none",
        fontWeight: 700,
        paddingY: 1.2,
        }}
        >
        Mit PayPal spenden
        </Button>
        </CardContent>
        </Card>

        <Card
        elevation={0}
        sx={{
        border: 1,
        borderColor:
        "divider",
        borderRadius: 3,
        }}
        >
        <CardContent>
        <Typography
        variant="h6"
        sx={{
            fontWeight: 700
        }}
        >
        Geplante Features
        </Typography>

        <Stack
        spacing={1}
        sx={{
        marginTop: 1.5,
        }}
        >
        {
        [
        "Intelligente Ladealgorithmen",
        "Benutzerdefinierte Zeiträume",
        ].map(
        (item) => (
        <Stack
        key={
        item
        }
        direction="row"
        spacing={1}
        sx={{
            alignItems: "center"
        }}
        >
        <EnergySavingsLeaf
        fontSize="small"
        color="primary"
        />

        <Typography
        variant="body2"
        >
        {
        item
        }
        </Typography>
        </Stack>
        ),
        )
        }
        </Stack>
        </CardContent>
        </Card>
        </Stack>
        </Grid>
    </Grid>
);
}

public render(): React.JSX.Element {
const theme =
			this.state.theme;

const darkMode =
			this.state.themeType ===
			"dark";

if (!this.state.loaded) {
return (
<ThemeProvider theme={theme}>
<Box
sx={{
display: "flex",
alignItems: "center",
justifyContent:
"center",
minHeight: "100%",
height: "100%",
overflowY: "auto",
overflowX: "hidden",
boxSizing: "border-box",
backgroundColor:
"background.default",
}}
>
<CircularProgress />
</Box>
</ThemeProvider>
);
}

const native =
this.state.native as
unknown as SaxPowerNativeConfig;

return (
    <ThemeProvider theme={theme}>
        <RuntimeLoader
        enabled={this.state.loaded}
        onLoad={this.loadRuntimeStatus}
        intervalMs={10_000}
        />

        <Box
        sx={{
        minHeight: "100vh",
        backgroundColor:
        "background.default",
        color: "text.primary",
        padding: {
        xs: 1.5,
        sm: 2,
        md: 3,
        },
        }}
        >
        <Box
        sx={{
        maxWidth: 1440,
        margin: "0 auto",
        }}
        >
        {this.renderHeader(darkMode)}

        <Card
        elevation={0}
        sx={{
        marginTop: 2,
        marginBottom: 2,
        border: 1,
        borderColor:
        "divider",
        borderRadius: 3,
        }}
        >
        <Tabs
        value={
        this.state
        .selectedTab
        }
        onChange={
        (
        _event,
        value:
        AdminTab,
        ) =>
        this.setState({
        selectedTab:
        value,
        })
        }
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
        paddingX: 1,
        }}
        >
        <Tab
	value="login"
        icon={
        <CloudDone />
        }
        iconPosition="start"
	label="Anmeldung"
        />

        <Tab
	value="settings"
        icon={
        <Settings />
        }
        iconPosition="start"
	label="Einstellungen"
        />

        <Tab
        value="status"
        icon={
        <Timeline />
        }
        iconPosition="start"
        label="Status & Statistik"
        />

        <Tab
        value="support"
        icon={
        <SupportAgent />
        }
        iconPosition="start"
        label="Support & Info"
        />
        </Tabs>
        </Card>

        {
        this.state
	.selectedTab ===
	"login"
	? this.renderLoginTab(
        native,
        )
        : null
        }

        {
        this.state
	.selectedTab ===
	"settings"
	? this.renderSettingsTab(
        native,
        )
        : null
        }

        {
        this.state
        .selectedTab ===
        "status"
        ? this.renderStatusTab()
        : null
        }

        {
        this.state
        .selectedTab ===
        "support"
        ? this.renderSupportTab()
        : null
        }

        <Box
        sx={{
        marginTop: 3,
        paddingBottom: 2,
        }}
        >
        {
        this.renderSaveCloseButtons()
        }
        </Box>

        </Box>
        </Box>
    </ThemeProvider>
);
}
}
