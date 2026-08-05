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
Grid,
IconButton,
InputAdornment,
Link,
Stack,
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
} from "@iobroker/adapter-react-v5";

import type {
AdapterRuntimeStatus,
AdminTab,
SaxPowerConnectionState,
SaxPowerNativeConfig,
} from "./types";

interface SaxPowerAdminState
extends GenericAppState {
selectedTab: AdminTab;
runtimeStatus: AdapterRuntimeStatus;
statusLoading: boolean;
statusLoaded: boolean;
statusError: string;
showPassword: boolean;
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
pvPower: null,
houseConsumptionPower: null,
gridPower: null,
gridDirection: "idle",
batteryPower: null,
batteryDirection: "idle",
soc: null,
liveLastUpdate: "",
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
encryptedFields: [
"password",
],
};

super(extendedProps);

this.state = {
...this.state,
selectedTab: "cloud",
runtimeStatus: {
...EMPTY_RUNTIME_STATUS,
},
statusLoading: false,
statusLoaded: false,
statusError: "",
showPassword: false,
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
pvPowerState,
houseConsumptionPowerState,
gridPowerState,
gridDirectionState,
batteryPowerState,
batteryDirectionState,
socState,
liveLastUpdateState,
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
`${namespace}.statistics.info.deviceCount`,
),
this.socket.getState(
`${namespace}.statistics.info.source`,
),
this.socket.getState(
`${namespace}.statistics.info.firstMeasurement`,
),
this.socket.getState(
`${namespace}.statistics.info.lastUpdate`,
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
]);

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

this.setState({
native:
nextNative as unknown as
Record<string, unknown>,

changed:
this.getIsChanged(
nextNative as unknown as
Record<string, unknown>,
),
} as unknown as Pick<
SaxPowerAdminState,
"native" | "changed"
>);
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
JSX.Element {
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
alignItems={{
xs: "flex-start",
sm: "center",
}}
justifyContent="space-between"
spacing={1}
sx={{
marginBottom: 2,
}}
>
<Box>
<Typography
variant="h6"
fontWeight={700}
>
Live-Energie
</Typography>

<Typography
variant="body2"
color="text.secondary"
>
Aktuelle Leistungswerte aus den
ioBroker-Objekten
</Typography>
</Box>

<Typography
variant="caption"
color="text.secondary"
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
item
xs={12}
sm={6}
md={4}
lg={
card.title ===
"PV-Leistung"
? 12
: 3
}
key={card.title}
>
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
alignItems="flex-start"
justifyContent="space-between"
spacing={2}
>
<Box>
<Typography
variant="body2"
color="text.secondary"
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
fontWeight={800}
sx={{
marginTop: 0.5,
}}
>
{card.value}
</Typography>

<Typography
variant="body2"
color="text.secondary"
sx={{
marginTop: 0.5,
}}
>
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
): JSX.Element {
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
alignItems={{
xs: "flex-start",
sm: "center",
}}
justifyContent="space-between"
spacing={2}
>
<Stack
direction="row"
alignItems="center"
spacing={2}
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
color="text.secondary"
sx={{
marginTop: 0.5,
}}
>
ioBroker Cloud Adapter
</Typography>
</Box>
</Stack>

<Stack
direction="row"
spacing={1}
alignItems="center"
flexWrap="wrap"
useFlexGap
>
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
? (
<CircularProgress
size={22}
/>
)
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

private renderCloudTab(
native: SaxPowerNativeConfig,
): JSX.Element {
return (
<Grid
container
spacing={2}
>
<Grid
item
xs={12}
lg={8}
>
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
alignItems="center"
spacing={1}
sx={{
marginBottom: 2.5,
}}
>
<CloudDone
color="primary"
/>

<Typography
variant="h6"
fontWeight={700}
>
Cloud-Anbindung
</Typography>
</Stack>

<Stack spacing={2.5}>
<TextField
fullWidth
label="API-URL"
value={
native.apiUrl ??
""
}
onChange={
(event) =>
this.updateNativeField(
"apiUrl",
event.target
.value,
)
}
helperText="SAX-Power-Cloud-Endpunkt"
InputProps={{
startAdornment: (
<InputAdornment
position="start"
>
<Storage />
</InputAdornment>
),
}}
/>

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
InputProps={{
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
}}
/>

<TextField
fullWidth
label="Aktualisierungsintervall"
type="number"
value={
native.pollInterval ??
60
}
onChange={
(event) =>
this.updateNativeField(
"pollInterval",
Math.max(
60,
Number(
event
.target
.value,
) ||
60,
),
)
}
helperText="Mindestens 60 Sekunden"
InputProps={{
endAdornment: (
<InputAdornment
position="end"
>
Sekunden
</InputAdornment>
),
}}
inputProps={{
min: 60,
step: 10,
}}
/>
</Stack>
</CardContent>
</Card>
</Grid>

<Grid
item
xs={12}
lg={4}
>
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
color="text.secondary"
>
Verbindung
</Typography>

<Typography
variant="h5"
fontWeight={700}
sx={{
marginTop: 0.5,
}}
>
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
color="text.secondary"
sx={{
marginTop: 1,
}}
>
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
alignItems="center"
>
<Storage
color="primary"
/>

<Typography
variant="h6"
fontWeight={700}
>
Erkannte Speicher
</Typography>
</Stack>

<Typography
variant="h3"
fontWeight={700}
color="primary"
sx={{
marginTop: 1,
}}
>
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

private renderStatusTab(): JSX.Element {
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

<Alert severity={connection.severity}>
<Typography fontWeight={700}>
{connection.label}
</Typography>

<Typography
variant="body2"
sx={{
marginTop: 0.5,
}}
>
{connection.description}
</Typography>
</Alert>
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
item
xs={12}
sm={6}
lg={3}
key={
card.title
}
>
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
color="text.secondary"
>
{
card.title
}
</Typography>

<Typography
variant="h6"
fontWeight={700}
sx={{
marginTop: 0.5,
wordBreak:
"break-word",
}}
>
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
alignItems="center"
>
<Timeline
color="primary"
/>

<Typography
variant="h6"
fontWeight={700}
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
fontWeight={700}
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
item
xs={12}
md={6}
>
<Typography
variant="caption"
color="text.secondary"
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
item
xs={12}
md={6}
>
<Typography
variant="caption"
color="text.secondary"
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

private renderSupportTab(): JSX.Element {
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
item
xs={12}
lg={8}
>
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
fontWeight={700}
>
Projekt & Hilfe
</Typography>

<Typography
variant="body2"
color="text.secondary"
sx={{
marginTop: 0.5,
marginBottom: 2,
}}
>
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
item
xs={12}
sm={6}
key={
link.title
}
>
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
fontWeight={700}
>
{
link.title
}
</Typography>

<Typography
variant="caption"
color="text.secondary"
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
item
xs={12}
lg={4}
>
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
alignItems="center"
>
<Savings
color="primary"
/>

<Typography
variant="h6"
fontWeight={700}
>
Entwicklung unterstützen
</Typography>
</Stack>

<Typography
variant="body2"
color="text.secondary"
sx={{
marginTop: 1,
marginBottom: 2,
}}
>
Der SAX Power Adapter entsteht vollständig in meiner Freizeit. Wenn er dir gefällt und dir im Alltag hilft, kannst du seine Weiterentwicklung mit einer freiwilligen Spende unterstützen. Vielen Dank!
</Typography>

<Button
fullWidth
variant="contained"
component="a"
href="https://www.paypal.com/donate/?business=tobias.pruegner%40posteo.de&no_recurring=0&currency_code=EUR&item_name=ioBroker%20SAX%20Power%20Adapter"
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
fontWeight={700}
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
"Modbus-Steuerung",
"Intelligente Ladealgorithmen",
"Benutzerdefinierte Zeiträume",
"Batterieanalyse",
].map(
(item) => (
<Stack
key={
item
}
direction="row"
spacing={1}
alignItems="center"
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

public render(): JSX.Element {
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
value="cloud"
icon={
<CloudDone />
}
iconPosition="start"
label="Cloud"
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
"cloud"
? this.renderCloudTab(
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

<Stack
direction={{
xs: "column",
sm: "row",
}}
justifyContent="space-between"
spacing={1}
sx={{
paddingY: 1,
}}
>
<Typography
variant="caption"
color="text.secondary"
>
ioBroker SAX Power Adapter
</Typography>

<Typography
variant="caption"
color="text.secondary"
>
V1.0-Entwicklungsstand
</Typography>
</Stack>
</Box>
</Box>
</ThemeProvider>
);
}
}
