# ioBroker object structure

## Root structure

```text
sax-power.0
├── info
├── live
├── devices
│   └── <serialNumber>
│       ├── info
│       ├── live
│       └── statistics
│           ├── day
│           ├── week
│           ├── month
│           ├── year
│           └── total
└── statistics
    ├── info
    ├── day
    ├── week
    ├── month
    ├── year
    └── total
```

## `info`

Adapter runtime information is stored below:

```text
info.*
```

The standard ioBroker connection state remains the primary indication of whether the adapter is connected.

Additional runtime information may include:

- last update
- last error
- diagnostic status

## Root `live`

The root live channel contains aggregated installation values:

```text
live
├── pvPower
├── houseConsumptionPower
├── gridPower
├── gridDirection
├── batteryPower
├── batteryDirection
├── soc
├── deviceCount
└── lastUpdate
```

These values are intended for:

- the adapter administration dashboard
- VIS
- scripts
- Grafana or other history/visualization adapters

## `devices`

Every discovered SAX Power storage device is represented by its serial number:

```text
devices.<serialNumber>
```

### Device information

```text
devices.<serialNumber>.info
```

Typical states include:

- `name`
- `type`
- `serialNumber`
- `firmware`
- `dataCycle`
- `lastUpdate`

### Device live values

```text
devices.<serialNumber>.live
```

States:

- `batteryChargePower`
- `batteryDischargePower`
- `batteryPower`
- `batteryDirection`
- `gridImportPower`
- `gridExportPower`
- `gridPower`
- `gridDirection`
- `gridVoltage`
- `pvPower`
- `soc`

Optional cloud fields remain `null` when unavailable.

## Device statistics

```text
devices.<serialNumber>.statistics.<period>
```

Periods:

- `day`
- `week`
- `month`
- `year`
- `total`

Each period contains:

```text
chargedEnergy
dischargedEnergy
firstTimestamp
lastTimestamp
```

## Aggregated statistics

```text
statistics.<period>
```

The root statistics tree uses the same period and state structure as each device. Energy values are summed across all detected storage devices.

## Statistics runtime information

```text
statistics.info
```

This channel contains operational metadata for the history subsystem, such as the current source, last update, and last error.

## Removed technical states

The following technical states are not exposed in the version 1.0 public period structure:

```text
samples
source
completeness
```

Existing objects from older development builds are removed automatically when the adapter initializes the period objects.

## Writable states

Version 1.0 does not create public writable SAX Power or Modbus control states.
