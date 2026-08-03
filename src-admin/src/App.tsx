import React from "react";

import {
Box,
CircularProgress,
Typography,
} from "@mui/material";

import {
GenericApp,
type GenericAppProps,
type GenericAppState,
} from "@iobroker/adapter-react-v5";

import type {
SaxPowerNativeConfig,
} from "./types";

interface SaxPowerAdminState
extends GenericAppState {
selectedTab: "cloud" | "support";
}

export default class App
extends GenericApp<
GenericAppProps,
SaxPowerAdminState
> {
public constructor(
props: GenericAppProps,
) {
const extendedProps: GenericAppProps = {
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
};
}

public render(): JSX.Element {
if (!this.state.loaded) {
return (
<Box
sx={{
display: "flex",
alignItems: "center",
justifyContent: "center",
minHeight: "100vh",
}}
>
<CircularProgress />
</Box>
);
}

const native =
this.state.native as
unknown as SaxPowerNativeConfig;

return (
<Box
sx={{
minHeight: "100vh",
backgroundColor:
"background.default",
color: "text.primary",
padding: 3,
}}
>
<Typography
variant="h4"
component="h1"
gutterBottom
>
SAX Power
</Typography>

<Typography>
React Admin foundation loaded.
</Typography>

<Typography
variant="body2"
sx={{
marginTop: 2,
}}
>
API URL: {native.apiUrl}
</Typography>
</Box>
);
}
}
