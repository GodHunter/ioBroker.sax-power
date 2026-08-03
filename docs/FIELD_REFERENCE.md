# Field reference

## General rules

- Power values use watts (`W`).
- Energy values use kilowatt-hours (`kWh`).
- State of charge uses percent (`%`).
- Timestamps are stored in ISO-compatible form.
- Missing optional measurements are represented as `null`.
- Unknown values are not converted to zero.

## Device information

Typical paths:

```text
devices.<serialNumber>.info.*
```

| State | Type | Description |
|---|---:|---|
| `name` | string | Device name reported by the cloud |
| `type` | string | Device or storage type |
| `serialNumber` | string | SAX Power serial number |
| `firmware` | string | Reported firmware version |
| `dataCycle` | number | Reported data cycle, when available |
| `lastUpdate` | string/date | Last update reported for the device |

The exact available information depends on the cloud response.

## Device live values

Typical paths:

```text
devices.<serialNumber>.live.*
```

| State | Unit | Meaning |
|---|---:|---|
| `batteryChargePower` | W | Positive magnitude of current battery charging power |
| `batteryDischargePower` | W | Positive magnitude of current battery discharging power |
| `batteryPower` | W | Signed battery power |
| `batteryDirection` | text | `charging`, `discharging`, or `idle` |
| `gridImportPower` | W | Positive magnitude of grid import |
| `gridExportPower` | W | Positive magnitude of grid export |
| `gridPower` | W | Signed grid power |
| `gridDirection` | text | `import`, `export`, or `idle` |
| `gridVoltage` | V | Grid voltage |
| `pvPower` | W | PV production, when provided by the cloud |
| `soc` | % | State of charge |

### Battery power sign

- negative: charging
- positive: discharging
- zero: idle

### Grid power sign

- negative: export
- positive: import
- zero: idle

## Aggregated root live values

Paths:

```text
live.*
```

| State | Unit | Meaning |
|---|---:|---|
| `pvPower` | W | First available installation-level PV value |
| `houseConsumptionPower` | W | Calculated house consumption |
| `gridPower` | W | First available installation-level grid value |
| `gridDirection` | text | `import`, `export`, or `idle` |
| `batteryPower` | W | Sum of all available storage battery power values |
| `batteryDirection` | text | Direction derived from combined battery power |
| `soc` | % | Arithmetic mean of available storage SOC values |
| `deviceCount` | number | Number of detected storage devices |
| `lastUpdate` | date/text | Last successful live aggregation |

## House consumption calculation

```text
houseConsumptionPower =
    pvPower + gridPower + batteryPower
```

The calculation is performed only if all three values are available.

When `pvPower` is unavailable:

- `live.pvPower` remains `null`
- `live.houseConsumptionPower` remains `null`
- the administration interface displays “Not available”

## Statistics

Period paths:

```text
statistics.<period>.*
devices.<serialNumber>.statistics.<period>.*
```

Supported period names:

- `day`
- `week`
- `month`
- `year`
- `total`

Public states:

| State | Unit | Meaning |
|---|---:|---|
| `chargedEnergy` | kWh | Battery energy charged in the period |
| `dischargedEnergy` | kWh | Battery energy discharged in the period |
| `firstTimestamp` | date | First included historical value |
| `lastTimestamp` | date | Last included historical value |

The following former technical fields are not part of the public version 1.0 object model:

- `samples`
- per-period `source`
- `completeness`

## Statistics information

The adapter may expose operational information under:

```text
statistics.info.*
```

This includes status information such as:

- active historical source
- last statistics update
- last history error

These states describe adapter operation and are separate from the public period values.
