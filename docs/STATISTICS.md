# Statistics Architecture

Statistics are a standard adapter feature and require no configuration.

Version 1.0 creates statistics for:

- day,
- ISO week,
- month,
- year,
- total since the beginning of available measurements.

The structure exists per storage device and as an aggregate across all devices.

## Version 1.0 scope

The initial energy statistics are:

- charged energy,
- discharged energy.

The adapter deliberately does not calculate prices, tariffs, savings, revenue, amortization, or profitability.

## Object structure

```text
devices.<serial>.statistics
├── day
├── week
├── month
├── year
├── total
└── info

statistics
├── day
├── week
├── month
├── year
├── total
└── info
```

Each period contains:

- `chargedEnergy`
- `dischargedEnergy`
- `samples`
- `firstTimestamp`
- `lastTimestamp`
- `completeness`
- `source`

## State properties

| Property | Value |
|---|---|
| Energy type | `number` |
| Energy unit | `kWh` |
| Energy role | `value.energy` |
| Access | read-only |

Before historical data has been imported, energy values are `null`.

## Metadata

`samples` records the number of historical measurements used.

`firstTimestamp` and `lastTimestamp` describe the covered range.

`completeness` is an estimated percentage and is not used to extrapolate missing values.

Initial source:

```text
pending-history-discovery
```

Planned final sources:

```text
dashboard-history
dashboard-csv
```

## Data source

The preferred source is the historical SAX Power dashboard or CSV export, so statistics can remain complete during ioBroker or adapter downtime.

## Aggregation

Root statistics are sums of corresponding per-device values. Devices remain separated by serial number and are never silently merged.

## Persistence

Final statistics must survive adapter, ioBroker, container, and host restarts. Repeated imports must be idempotent.

## Future custom interval

A later optional feature may query an arbitrary dashboard-supported date range. This does not require a permanent Admin tab in version 1.0.
