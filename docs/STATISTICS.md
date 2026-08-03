# Statistics Architecture

Statistics are a standard adapter feature and require no configuration.

The adapter deliberately does not calculate:

- electricity prices,
- feed-in tariffs,
- monetary savings,
- revenue,
- amortization,
- or profitability.

Users can derive financial calculations from the provided energy values in ioBroker, Grafana, or another system.

## Data source

The preferred source is the historical SAX Power dashboard data or its CSV export.

Using the dashboard history instead of only integrating live power values allows statistics to remain complete when:

- ioBroker is temporarily unavailable,
- the adapter is stopped,
- the host is restarted,
- individual polling intervals are missed,
- or the adapter is newly installed.

## Per-device statistics

Each detected storage device receives:

```text
devices.<serial>.statistics
├── day
│   ├── chargedEnergy
│   └── dischargedEnergy
├── week
│   ├── chargedEnergy
│   └── dischargedEnergy
├── month
│   ├── chargedEnergy
│   └── dischargedEnergy
├── year
│   ├── chargedEnergy
│   └── dischargedEnergy
├── total
│   ├── chargedEnergy
│   └── dischargedEnergy
└── info
    ├── firstMeasurement
    ├── lastUpdate
    └── source
```

## Combined statistics

The instance root receives values aggregated across all detected storage devices:

```text
statistics
├── day
│   ├── chargedEnergy
│   └── dischargedEnergy
├── week
│   ├── chargedEnergy
│   └── dischargedEnergy
├── month
│   ├── chargedEnergy
│   └── dischargedEnergy
├── year
│   ├── chargedEnergy
│   └── dischargedEnergy
├── total
│   ├── chargedEnergy
│   └── dischargedEnergy
└── info
    ├── deviceCount
    ├── firstMeasurement
    ├── lastUpdate
    └── source
```

## Period definitions

### Day

The current local calendar day.

### Week

The current ISO week:

- starts Monday,
- ends Sunday.

### Month

The current calendar month.

### Year

The current calendar year.

### Total

All available measurements since the earliest historical data point returned by SAX Power.

## State properties

All charged and discharged energy states use:

| Property | Value |
|---|---|
| Type | `number` |
| Unit | `kWh` |
| Role | `value.energy` |
| Read | `true` |
| Write | `false` |

## Aggregation

Root statistics are calculated as the sum of all currently recognized storage devices for the same period.

Example:

```text
Device A day chargedEnergy: 4.20 kWh
Device B day chargedEnergy: 3.10 kWh
Root day chargedEnergy:     7.30 kWh
```

A storage device is never silently merged with another serial number.

## Persistence

Statistics must survive:

- adapter restarts,
- ioBroker restarts,
- container restarts,
- and host restarts.

Historical source timestamps and adapter receive timestamps must remain separate.

## Custom interval

A later optional feature may allow users to request an arbitrary date range supported by the SAX Power dashboard.

Example:

```text
From: 2026-07-01
To:   2026-07-31
```

Possible output:

```text
Charged energy:    123.45 kWh
Discharged energy:  98.76 kWh
```

This feature is not required for the standard statistics and does not need a permanent Admin tab in version 1.0.
