# Object Reference

This document describes the public ioBroker objects created by the SAX Power adapter.

## Instance root

```text
sax-power.0
├── info
├── diagnostics
├── devices
└── statistics
```

## Devices

Each detected storage device creates:

```text
devices.<serial>
├── info
├── live
├── status
├── diagnostics
└── statistics
```

## Statistics per storage device

```text
devices.<serial>.statistics
├── day
├── week
├── month
├── year
├── total
└── info
```

Every period contains:

| Object | Type | Unit | Description |
|---|---|---|---|
| `chargedEnergy` | number/null | `kWh` | Charged battery energy in the period |
| `dischargedEnergy` | number/null | `kWh` | Discharged battery energy in the period |
| `samples` | number | — | Historical samples used |
| `firstTimestamp` | string/date | — | First included measurement |
| `lastTimestamp` | string/date | — | Last included measurement |
| `completeness` | number | `%` | Estimated period completeness |
| `source` | string | — | Statistics data source |

The `info` channel contains:

| Object | Type | Description |
|---|---|---|
| `firstMeasurement` | string/date | Earliest available device measurement |
| `lastUpdate` | string/date | Last statistics update |
| `source` | string | Statistics source |

## Aggregated statistics

```text
statistics
├── day
├── week
├── month
├── year
├── total
└── info
```

The same period states are provided across all detected storage devices. Root `statistics.info` additionally contains `deviceCount`.

Before historical import is implemented, energy values remain `null`; missing history is never represented as zero.

## Control states

Public control and Modbus states are intentionally not part of version 1.0. Control-related dashboard fields remain preserved in raw diagnostics for future releases.
