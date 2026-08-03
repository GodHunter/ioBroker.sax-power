# ioBroker SAX Power Adapter

> Community adapter for integrating SAX Power battery storage systems
> into ioBroker.

> **Status:** Early development (pre-1.0)

## Features

### Version 1.0

-   Cloud connection to the SAX Power dashboard
-   Automatic discovery of one or more battery systems
-   Live values (PV, Grid, Battery, SOC, Messages)
-   Dynamic ioBroker object creation
-   Optional Modbus integration for charge/discharge control
-   Statistics for:
    -   Today
    -   Week
    -   Month
    -   Year
    -   Total
-   Aggregated statistics across all detected storage systems

## Planned Versions

### Version 1.1

-   Improved Admin UI
-   Diagnostics page
-   API connectivity test
-   Additional dashboard information

### Version 2.0

-   Intelligent charging/discharging engine
-   Configurable control strategies
-   Advanced automation

## Documentation

Detailed documentation is provided in:

-   docs/OBJECTS.md
-   docs/FIELD_REFERENCE.md
-   docs/API.md
-   docs/STATISTICS.md
-   docs/MODBUS.md
-   docs/ARCHITECTURE.md

## Optional Modbus Support

The adapter works without Modbus.

If enabled, writable Modbus states are detected automatically and can be
assigned from the Admin UI.

## Statistics

The adapter calculates:

-   Per storage system
-   Overall totals

for:

-   Day
-   Week
-   Month
-   Year
-   Total

Energy values are provided in **kWh**.

No electricity price or profitability calculations are included.

## Support

A voluntary PayPal donation button is available in the Admin UI.

## Trademark Notice

SAX Power and the SAX Power logo are trademarks or protected brand
assets of SAX Power GmbH.

This adapter is an independent community project and is not affiliated
with, endorsed by, or maintained by SAX Power GmbH.
