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
import type {
StrategyCapabilities,
StrategyCapabilityModeId,
} from "../../src/lib/strategyCapabilities";

import { LocalizedContent, translate } from "./localization";

import de from "../../admin/i18n/de.json";
import en from "../../admin/i18n/en.json";
import es from "../../admin/i18n/es.json";
import fr from "../../admin/i18n/fr.json";
import it from "../../admin/i18n/it.json";
import nl from "../../admin/i18n/nl.json";
import pl from "../../admin/i18n/pl.json";
import pt from "../../admin/i18n/pt.json";
import ru from "../../admin/i18n/ru.json";
import uk from "../../admin/i18n/uk.json";
import zhCn from "../../admin/i18n/zh-cn.json";

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
modbusInstancesLoading: boolean;
modbusInstancesError: string;
modbusInstancesResponse: string;
strategyCapabilities: StrategyCapabilities | null;
strategyCapabilitiesLoading: boolean;
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
translations: {
de,
en,
es,
fr,
it,
nl,
pl,
pt,
ru,
uk,
"zh-cn": zhCn,
},
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
modbusInstancesLoading: false,
modbusInstancesError: "",
modbusInstancesResponse: "",
strategyCapabilities: null,
strategyCapabilitiesLoading: false,
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

private getAdapterMessageTarget(): string {
return `system.adapter.${this.getNamespace()}`;
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

const configuredModbusInstance = (this.state.native as unknown as SaxPowerNativeConfig)
.strategyModbusInstance;
if (
!this.state.strategyCapabilities
&& !this.state.strategyCapabilitiesLoading
&& typeof configuredModbusInstance === "string"
) {
void this.loadStrategyCapabilities(configuredModbusInstance);
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
const target = this.getAdapterMessageTarget();

this.setState({
modbusInstancesLoading: true,
modbusInstancesError: "",
modbusInstancesResponse: "",
});

try {
console.info("[SAX Power] Requesting Modbus instances", {
target,
command: "getModbusInstances",
});

const options = await Promise.race([
this.socket.sendTo<unknown>(
target,
"getModbusInstances",
{},
),
new Promise<never>((_, reject) => {
window.setTimeout(
() => reject(new Error(`Timeout while waiting for ${target} / getModbusInstances`)),
5_000,
);
}),
]);

const responseText = (() => {
try {
return JSON.stringify(options);
} catch {
return String(options);
}
})();

console.info("[SAX Power] Modbus instance response", options);

if (!Array.isArray(options)) {
throw new Error(
`Unexpected response from ${target}: expected an array, received ${responseText}`,
);
}

this.setState({
modbusInstances: options as ModbusInstanceOption[],
modbusInstancesLoaded: true,
modbusInstancesLoading: false,
modbusInstancesError: "",
modbusInstancesResponse: responseText,
});
} catch (error) {
const message = error instanceof Error
? error.message
: String(error);

console.error("[SAX Power] Modbus instance discovery failed", {
target,
error,
});

this.setState({
modbusInstances: [],
modbusInstancesLoaded: true,
modbusInstancesLoading: false,
modbusInstancesError: message,
modbusInstancesResponse: "",
});
}
};

private readonly loadStrategyCapabilities = async (
instance: string,
): Promise<void> => {
if (!/^modbus\.\d+$/.test(instance)) {
this.setState({ strategyCapabilities: null, strategyCapabilitiesLoading: false });
return;
}

this.setState({ strategyCapabilities: null, strategyCapabilitiesLoading: true });
try {
const capabilities = await this.socket.sendTo<StrategyCapabilities | null>(
this.getAdapterMessageTarget(),
"getStrategyCapabilities",
{ instance },
);
this.setState({
strategyCapabilities: capabilities?.instance === instance ? capabilities : null,
strategyCapabilitiesLoading: false,
});
} catch {
this.setState({ strategyCapabilities: null, strategyCapabilitiesLoading: false });
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

if (key === "strategyModbusInstance") {
void this.loadStrategyCapabilities(typeof value === "string" ? value : "");
}
}

private strategyConfigurationError(
native: SaxPowerNativeConfig | Record<string, unknown>,
): string {
const validation = validateStrategyRuntimeConfiguration(
strategyRuntimeConfigurationFromNative(native),
);

return validation.valid
? ""
: `Strategy configuration incomplete: ${validation.issues
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

private strategyModeLabel(id: StrategyCapabilityModeId): string {
switch (id) {
case "chargingControl":
return "Grid-friendly and battery-friendly charging";
case "dayAvailability":
return "Daytime availability for external consumers";
case "nightDischarge":
return "Price-controlled night discharge";
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
return "Not yet available";
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
return "Not available";
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
return "Not available";
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
return "Grid import";
}

if (direction === "export") {
return "Grid export";
}

return "No grid flow";
}

private getBatteryLabel(
direction: string,
): string {
if (direction === "charging") {
return "Charging";
}

if (direction === "discharging") {
return "Discharging";
}

return "Idle";
}

private renderLiveDashboard():
React.JSX.Element {
const status =
this.state.runtimeStatus;

const cards = [
{
title: "PV power",
value:
this.formatPower(
status.pvPower,
),
subtitle:
status.pvPower === null
? "No PV value reported"
: "Current production",
icon: <SolarPower />,
color: "warning.main",
},
{
title: "House consumption",
value:
this.formatPower(
status.houseConsumptionPower,
),
subtitle:
status.houseConsumptionPower ===
null
? "Cannot be calculated"
: "Current consumption",
icon: <Home />,
color: "primary.main",
},
{
title: "Grid",
value:
this.formatPower(
status.gridPower,
),
subtitle:
status.gridPower === null
? "Not available"
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
title: "Battery",
value:
this.formatPower(
status.batteryPower,
),
subtitle:
status.batteryPower === null
? "Not available"
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
title: "State of charge",
value:
this.formatSoc(
status.soc,
),
subtitle:
status.soc === null
? "Not available"
: status.deviceCount &&
status.deviceCount > 1
? `Average across ${status.deviceCount} storage systems`
: "Current battery level",
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
        Live energy
        </Typography>

        <Typography
        variant="body2"
        sx={{
            color: "text.secondary"
        }}
        >
        Current power values from the ioBroker objects
        </Typography>
        </Box>

        <Typography
        variant="caption"
        sx={{
            color: "text.secondary"
        }}
        >
        Updated:{" "}
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
                "PV power"
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
            "PV power"
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
label: "Connected",
description:
"The SAX Power cloud is reachable.",
color: "success",
severity: "success",
};

case "connecting":
return {
label: "Establishing connection",
description:
"The adapter is currently signing in to the SAX Power cloud.",
color: "info",
severity: "info",
};

case "authentication_failed":
return {
label: "Login failed",
description:
"Check the username and password. After updating from an older adapter version, you may need to enter and save the password again.",
color: "warning",
severity: "warning",
};

case "unauthorized":
return {
label: "Access denied",
description:
`The SAX Power cloud denied access${httpSuffix}.`,
color: "error",
severity: "error",
};

case "network_error":
return {
label: "Cloud unreachable",
description:
"The SAX Power cloud could not be reached. Check the internet, DNS and firewall connection.",
color: "error",
severity: "error",
};

case "timeout":
return {
label: "Connection timed out",
description:
"The SAX Power cloud did not respond in time.",
color: "warning",
severity: "warning",
};

case "server_error":
return {
label: "Cloud server error",
description:
`The SAX Power cloud reported a server error${httpSuffix}.`,
color: "error",
severity: "error",
};

case "invalid_response":
return {
label: "Invalid cloud response",
description:
"The SAX Power cloud returned an unexpected or invalid response.",
color: "warning",
severity: "warning",
};

case "configuration_error":
return {
label: "Configuration incomplete",
description:
status.lastError ||
"Check the cloud configuration.",
color: "warning",
severity: "warning",
};

case "unknown_error":
return {
label: "Unknown error",
description:
status.lastError ||
"An unknown connection error occurred.",
color: "error",
severity: "error",
};

default:
return {
label:
status.connection === true
? "Connected"
: status.connection === false
? "Not connected"
: "Status unknown",
description:
status.lastError ||
"No detailed cloud status is available yet.",
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


        <Tooltip title="Refresh status">
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
        Login
        </Typography>
        </Stack>

        <Stack spacing={2.5}>
        <TextField
        fullWidth
        label="Username / email"
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
        label="Password"
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
        aria-label="Show password"
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
        Connection
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
        ? "Unknown"
        : "Offline"
        }
        </Typography>

        <Typography
            variant="body2"
            sx={{
                color: "text.secondary",
                marginTop: 1
            }}>
        Last update:
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
        Detected storage systems
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
disabled: { label: "Disabled", severity: "info" },
"invalid-configuration": { label: "Invalid configuration", severity: "warning" },
"waiting-for-inputs": { label: "Waiting for inputs", severity: "warning" },
starting: { label: "Starting", severity: "info" },
running: { label: "Active", severity: "success" },
error: { label: "Runtime error", severity: "error" },
unknown: { label: "Not yet available", severity: "info" },
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
const capabilities = this.state.strategyCapabilities;
const modeDescription: Record<StrategyCapabilityModeId, string> = {
chargingControl: "Register 44 controls charging power. Automatic grid-friendly control is built on this safe write limit.",
dayAvailability: "Publishes usable battery power for external consumers and never writes register 43.",
nightDischarge: "Active discharge via register 43; later additionally controlled by a price threshold, time window and minimum SOC.",
};
const modeConfigKey: Record<StrategyCapabilityModeId, keyof SaxPowerNativeConfig> = {
chargingControl: "strategyChargingControlEnabled",
dayAvailability: "strategyDayAvailabilityEnabled",
nightDischarge: "strategyNightDischargeEnabled",
};

return (
<Stack spacing={2}>
<Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
<CardContent>
<Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
<Settings color="primary" />
<Typography variant="h6" sx={{ fontWeight: 700 }}>Settings</Typography>
</Stack>
<TextField
fullWidth
label="Update interval"
type="number"
value={native.pollInterval ?? 60}
onChange={(event) => this.updateNativeField(
"pollInterval",
Math.min(2_147_483, Math.max(60, Number(event.target.value) || 60)),
)}
helperText="Between 60 and 2,147,483 seconds"
slotProps={{
input: { endAdornment: <InputAdornment position="end">seconds</InputAdornment> },
htmlInput: { min: 60, max: 2_147_483, step: 10 },
}}
/>
</CardContent>
</Card>

<Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
<CardContent>
<Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 1 }}>
<EnergySavingsLeaf color="primary" />
<Typography variant="h6" sx={{ fontWeight: 700 }}>Storage strategy</Typography>
</Stack>
<Typography variant="body2" sx={{ color: "text.secondary", marginBottom: 2 }}>
Controls the charging-power limit and publishes safe daytime availability for external consumers. Active discharge remains a separate mode.
</Typography>
<Alert
severity={strategyRuntimeStatus.severity}
sx={{ marginBottom: 2 }}
action={<Chip size="small" label={strategyRuntimeStatus.label} />}
>
<Typography variant="body2" sx={{ fontWeight: 700 }}>
Runtime status
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
label="Enable storage strategy"
/>
{native.strategyEnabled === true ? (
<Stack spacing={2} sx={{ marginTop: 2 }}>
<Alert severity={strategyValidation.valid ? "success" : "warning"}>
{strategyValidation.valid
? "The strategy configuration is complete and can be saved."
: "Complete all marked required fields with valid values."}
</Alert>
{this.state.modbusInstancesLoading ? (
<Alert severity="info">
<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
<CircularProgress size={18} />
<Typography variant="body2">
Loading Modbus instances from {this.getAdapterMessageTarget()}…
</Typography>
</Stack>
</Alert>
) : this.state.modbusInstancesError ? (
<Alert severity="error">
<Typography variant="body2" sx={{ fontWeight: 700 }}>
Modbus instance discovery failed
</Typography>
<Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
{this.state.modbusInstancesError}
</Typography>
<Typography variant="caption" sx={{ display: "block", marginTop: 0.5 }}>
Target: {this.getAdapterMessageTarget()}
</Typography>
</Alert>
) : this.state.modbusInstancesLoaded ? (
<Alert severity={this.state.modbusInstances.length > 0 ? "success" : "warning"}>
<Typography variant="body2" sx={{ fontWeight: 700 }}>
{this.state.modbusInstances.length > 0
? `${this.state.modbusInstances.length} Modbus instance${this.state.modbusInstances.length === 1 ? "" : "s"} detected`
: "No Modbus instances returned"}
</Typography>
{this.state.modbusInstancesResponse ? (
<Typography
variant="caption"
component="div"
sx={{
marginTop: 0.5,
fontFamily: "monospace",
overflowWrap: "anywhere",
}}
>
Raw response: {this.state.modbusInstancesResponse}
</Typography>
) : null}
</Alert>
) : null}

<TextField
select
fullWidth
required
label="Modbus instance"
value={typeof native.strategyModbusInstance === "string" ? native.strategyModbusInstance : ""}
onChange={(event) => this.updateNativeField("strategyModbusInstance", event.target.value || undefined)}
error={hasStrategyIssue("modbusInstance")}
helperText="Registers 43 to 48 are detected live; register 43 is required only for active night discharge"
>
<MenuItem value=""><em>Select an instance</em></MenuItem>
{this.state.modbusInstances.map(option => (
<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
))}
</TextField>
{this.state.strategyCapabilitiesLoading ? (
<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
<CircularProgress size={18} />
<Typography variant="body2">Checking registers and available modes…</Typography>
</Stack>
) : capabilities ? (
<Stack spacing={1.5}>
<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
Detected SAX capabilities
</Typography>
<Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
{capabilities.registers.map(register => (
<Chip
key={register.register}
size="small"
color={register.stateId ? "success" : "default"}
variant={register.stateId ? "filled" : "outlined"}
label={`R${register.register}: ${register.stateId
? `${register.readable ? "read" : ""}${register.readable && register.writable ? "/" : ""}${register.writable ? "write" : ""}`
: "missing"}`}
/>
))}
</Stack>
{capabilities.modes.map(mode => {
const configKey = modeConfigKey[mode.id];
const checked = native[configKey] === undefined
? mode.id !== "nightDischarge"
: native[configKey] === true;
const detail = mode.reason === "missing-registers"
? `Not available: register ${mode.missingRegisters.join(", ")} is missing or does not provide the required access.`
: mode.reason === "not-implemented"
? "Hardware supported; the separate night logic is not implemented in this beta yet."
: "Available for this Modbus instance.";
return (
<Card key={mode.id} variant="outlined" sx={{ borderRadius: 2 }}>
<CardContent sx={{ paddingBottom: "16px !important" }}>
<Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
<Box>
<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
{this.strategyModeLabel(mode.id)}
</Typography>
<Typography variant="body2" sx={{ color: "text.secondary" }}>
{modeDescription[mode.id]}
</Typography>
<Typography variant="caption" sx={{ color: mode.selectable ? "success.main" : "text.secondary" }}>
{detail}
</Typography>
</Box>
<FormControlLabel
control={(
<Switch
checked={checked}
disabled={!mode.selectable && !checked}
onChange={(event) => this.updateNativeField(configKey, event.target.checked as never)}
/>
)}
label={checked ? (mode.selectable ? "Active" : "Selected but unavailable") : "Inactive"}
/>
</Stack>
</CardContent>
</Card>
);
})}
</Stack>
) : typeof native.strategyModbusInstance === "string" && native.strategyModbusInstance ? (
<Alert severity="warning">No SAX registers could be detected for the selected instance.</Alert>
) : null}
<TextField
select
fullWidth
label="Battery model"
value={typeof native.strategyBatteryModelId === "string" ? native.strategyBatteryModelId : ""}
onChange={(event) => this.updateNativeField("strategyBatteryModelId", event.target.value || undefined)}
error={hasStrategyIssue("batteryModelId")}
helperText="Technical power and capacity limits of the storage system"
>
<MenuItem value=""><em>Select a model</em></MenuItem>
<MenuItem value="home-5.8">SAX Power Home 5.8 kWh</MenuItem>
<MenuItem value="home-plus-7.7">SAX Power Home Plus 7.7 kWh</MenuItem>
</TextField>
<Grid container spacing={2}>
{[
{
key: "strategyMinimumStateOfChargePercent" as const,
field: "minimumStateOfChargePercent",
label: "Minimum SOC",
unit: "%",
min: 0,
max: 100,
},
{
key: "strategyMaximumStateOfChargePercent" as const,
field: "maximumStateOfChargePercent",
label: "Maximum SOC",
unit: "%",
min: 0,
max: 100,
},
{
key: "strategyMaximumChargePowerW" as const,
field: "maximumChargePowerW",
label: "Maximum charging power",
unit: "W",
min: 0,
},
{
key: "strategyMaximumDischargePowerW" as const,
field: "maximumDischargePowerW",
label: "Maximum discharge power",
unit: "W",
min: 0,
},
{
key: "strategyPvForecastReserveWh" as const,
field: "pvForecastReserveWh",
label: "PV forecast reserve",
unit: "Wh",
min: 0,
},
{
key: "strategyRequestedDischargePowerW" as const,
field: "requestedDischargePowerW",
label: "Daytime discharge power target",
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
label="Maximum forecast age"
value={strategyNumber(native.strategyMaximumForecastAgeMs, 60_000)}
onChange={(event) => this.updateOptionalNumberField(
"strategyMaximumForecastAgeMs", event.target.value, 60_000,
)}
error={hasStrategyIssue("maximumForecastAgeMs")}
slotProps={{
input: { endAdornment: <InputAdornment position="end">minutes</InputAdornment> },
htmlInput: { min: 0, step: 1 },
}}
/>
</Grid>
<Grid size={{ xs: 12, md: 6 }}>
<TextField
fullWidth
required
type="number"
label="Strategy interval"
value={strategyNumber(native.strategyIntervalMs, 1_000)}
onChange={(event) => this.updateOptionalNumberField(
"strategyIntervalMs", event.target.value, 1_000,
)}
error={hasStrategyIssue("intervalMs")}
slotProps={{
input: { endAdornment: <InputAdornment position="end">seconds</InputAdornment> },
htmlInput: { min: 1, step: 1 },
}}
/>
</Grid>
</Grid>
</Stack>
) : (
<Alert severity="info" sx={{ marginTop: 2 }}>
When disabled, no strategy objects are created, no timers are started and no Modbus registers are written.
</Alert>
)}
</CardContent>
</Card>

<Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
<CardContent>
<Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 1 }}>
<BatteryFull color="primary" />
<Typography variant="h6" sx={{ fontWeight: 700 }}>Configure storage systems</Typography>
</Stack>
<Typography variant="body2" sx={{ color: "text.secondary", marginBottom: 2 }}>
Select the appropriate model for each automatically detected storage system. The configured nominal capacity is the basis for the documented full-cycle calculation.
</Typography>
<Stack spacing={2}>
{batteries.length === 0 ? (
<Alert severity="info">No storage system has been detected yet. After a successful login, it will appear here automatically.</Alert>
) : batteries.map((battery, index) => (
<Card key={battery.serialNumber} variant="outlined" sx={{ borderRadius: 2 }}>
<CardContent>
<Typography variant="subtitle1" sx={{ fontWeight: 700, marginBottom: 1.5 }}>
Storage system {index + 1}
</Typography>
<TextField
select
fullWidth
label="Model"
value={native.batteryModels?.[battery.serialNumber] ?? ""}
onChange={(event) => this.updateBatteryModel(battery.serialNumber, event.target.value)}
>
<MenuItem value=""><em>Select a model</em></MenuItem>
<MenuItem value="home-5.8">SAX Power Home 5.8 kWh — 5.76 kWh nominal / 5.20 kWh usable</MenuItem>
<MenuItem value="home-plus-7.7">SAX Power Home Plus 7.7 kWh — 7.68 kWh nominal / 7.00 kWh usable</MenuItem>
</TextField>
</CardContent>
</Card>
))}
<Alert severity="info">Estimated battery health: Not yet available. The adapter first collects a reliable data set and does not produce an unverified percentage.</Alert>
</Stack>
</CardContent>
</Card>
</Stack>
);
}

private formatCycles(value: number | null): string {
return value === null ? "Not available" : value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

private formatBatteryHealth(status: string): string {
const labels: Record<string, string> = {
notAvailable: "Not yet available",
collectingData: "Collecting baseline data",
insufficientData: "No reliable measurements yet",
available: "Available",
};
return labels[status] ?? status;
}

private formatHealthValue(value: number | null, status: string): string {
return value === null ? this.formatBatteryHealth(status) : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}% (estimated)`;
}

private renderBatteryStatus(): React.JSX.Element {
const { batteries, aggregateBattery } = this.state.runtimeStatus;
const cycleRows = [
{ label: "Today", key: "dayCycles" as const },
{ label: "Month", key: "monthCycles" as const },
{ label: "Year", key: "yearCycles" as const },
{ label: "Total", key: "totalCycles" as const },
];

return (
<Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
<CardContent>
<Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
<BatteryFull color="primary" />
<Typography variant="h6" sx={{ fontWeight: 700 }}>Battery health & full cycles</Typography>
</Stack>
{batteries.length === 0 ? (
<Alert severity="info">No battery data is available yet.</Alert>
) : (
<Grid container spacing={2}>
{batteries.map((battery, index) => (
<Grid key={battery.serialNumber} size={{ xs: 12, lg: batteries.length > 1 ? 6 : 12 }}>
<Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
<CardContent>
<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
Storage system {index + 1}: {battery.serialNumber}
</Typography>
<Typography variant="body2" sx={{ color: "text.secondary", marginBottom: 2 }}>
{battery.model === "notConfigured" ? "Model not selected yet" : battery.model}
</Typography>
<Grid container spacing={1.5}>
<Grid size={{ xs: 12, sm: 6 }}>
<Typography variant="caption" color="text.secondary">Reported by the storage system</Typography>
<Typography variant="h6">{this.formatCycles(battery.reportedCycles)} cycles</Typography>
</Grid>
<Grid size={{ xs: 12, sm: 6 }}>
<Typography variant="caption" color="text.secondary">Battery health</Typography>
<Typography variant="h6">{this.formatHealthValue(battery.healthValue, battery.healthStatus)}</Typography>
<Typography variant="body2" color="text.secondary">
{battery.healthStatus === "available"
? translate(
"Battery health calculated",
)
: translate(
"Battery health is being calculated · %s of %s qualified runs collected",
battery.validRuns,
battery.requiredRuns,
)}
</Typography>
{battery.healthStatus === "available" ? (
<Typography variant="body2" color="text.secondary">
{translate(
"Next update: %s of %s qualified runs",
battery.validRuns,
battery.requiredRuns,
)}
</Typography>
) : null}
{battery.activeRun === "active" ? (
<Typography variant="body2" color="text.secondary">
Current: {battery.activeRunDirection === "discharging" ? "Discharging" : "Charging"} · SOC {battery.activeRunSocStart ?? "–"}% → {battery.activeRunSocCurrent ?? "–"}% · {battery.activeRunEnergy?.toLocaleString(undefined, { maximumFractionDigits: 3 }) ?? "–"} kWh
</Typography>
) : (
<Typography variant="body2" color="text.secondary">Current measurement run: none</Typography>
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
<Typography variant="subtitle1" sx={{ fontWeight: 700, marginBottom: 1.5 }}>Combined system</Typography>
<Grid container spacing={1.5}>
{cycleRows.map((row) => (
<Grid key={row.key} size={{ xs: 6, sm: 2.4 }}>
<Typography variant="caption" color="text.secondary">{row.label}</Typography>
<Typography sx={{ fontWeight: 700 }}>{this.formatCycles(aggregateBattery[row.key])}</Typography>
</Grid>
))}
<Grid size={{ xs: 12, sm: 2.4 }}>
<Typography variant="caption" color="text.secondary">Battery health</Typography>
<Typography sx={{ fontWeight: 700 }}>{this.formatHealthValue(aggregateBattery.healthValue, aggregateBattery.healthStatus)}</Typography>
<Typography variant="body2" color="text.secondary">{aggregateBattery.validRuns} of {aggregateBattery.requiredRuns} valid · {aggregateBattery.rejectedRuns} rejected</Typography>
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
        "Cloud connection",
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
        "Storage systems",
        value:
        status.deviceCount ??
        "–",
        icon: <Storage />,
        color:
        "primary.main",
        },
        {
        title:
        "Statistics source",
        value:
        pending
        ? "Not active yet"
        : status.statisticsSource,
        icon: <Timeline />,
        color:
        pending
        ? "warning.main"
        : "success.main",
        },
        {
        title:
        "Last poll",
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
        Historical statistics
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
        Historical retrieval is not implemented yet
        </Typography>

        <Typography
        variant="body2"
        sx={{
        marginTop: 0.5,
        }}
        >
        The statistics objects have already been prepared. The value
        {" "}
        <strong>
        pending-history-discovery
        </strong>
        {" "}
        does not mean that an automated process is waiting.
        Dashboard or CSV history will be implemented in a future development phase.
        </Typography>
        </Alert>
        )
        : (
        <Alert severity="success">
        Historical statistics are active.
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
        First measurement
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
        Last statistics update
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
        Last adapter error:
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
"Source code and project development",
url:
"https://github.com/GodHunter/ioBroker.sax-power",
icon: <GitHub />,
},
{
title:
"Documentation",
description:
"Objects, API, architecture and statistics",
url:
"https://github.com/GodHunter/ioBroker.sax-power/tree/main/docs",
icon:
<Description />,
},
{
title:
"Report an issue",
description:
"Report a bug or suggest a feature",
url:
"https://github.com/GodHunter/ioBroker.sax-power/issues",
icon:
<SupportAgent />,
},
{
title:
"MIT license",
description:
"Project license terms",
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
        Project & help
        </Typography>

        <Typography
            variant="body2"
            sx={{
                color: "text.secondary",
                marginTop: 0.5,
                marginBottom: 2
            }}>
        The SAX Power adapter is an independent open-source community project.
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
        SAX Power and the SAX Power logo are protected trademarks or trademark elements of SAX Power GmbH. This project is not officially affiliated with SAX Power GmbH.
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
        Support development
        </Typography>
        </Stack>

        <Typography
            variant="body2"
            sx={{
                color: "text.secondary",
                marginTop: 1,
                marginBottom: 2
            }}>
        The SAX Power adapter is developed entirely in my spare time. If you like it and find it useful, you can support its continued development with a voluntary donation. Thank you!
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
        Donate with PayPal
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
        Planned features
        </Typography>

        <Stack
        spacing={1}
        sx={{
        marginTop: 1.5,
        }}
        >
        {
        [
        "Smart charging algorithms",
        "Custom time periods",
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
        <LocalizedContent>
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
	label="Login"
        />

        <Tab
	value="settings"
        icon={
        <Settings />
        }
        iconPosition="start"
	label="Settings"
        />

        <Tab
        value="status"
        icon={
        <Timeline />
        }
        iconPosition="start"
        label="Status & statistics"
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
        </LocalizedContent>
    </ThemeProvider>
);
}
}
