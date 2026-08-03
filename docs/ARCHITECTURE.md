# Adapter Architecture

The adapter uses a layered architecture to keep cloud access, parsing, ioBroker state management, statistics, and optional control independent.

## Data flow

```text
SAX Power dashboard
        │
        ▼
SaxPowerApiClient
        │
        ▼
SaxPowerParser
        │
        ▼
SaxPowerDevice model
        │
        ├──────────────► SaxPowerStateEngine
        │                       │
        │                       ▼
        │                 ioBroker objects
        │
        ├──────────────► StatisticsEngine
        │                       │
        │                       ▼
        │                 energy statistics
        │
        └──────────────► Optional ModbusControl
                                │
                                ▼
                         foreign Modbus states
```

## API client

File:

```text
src/lib/saxPowerApiClient.ts
```

Responsibilities:

- HTTP requests
- login
- token handling
- timeout handling
- retry after HTTP 401
- response parsing
- API-specific errors

The API client does not create ioBroker objects.

## Parser

File:

```text
src/lib/saxPowerParser.ts
```

Responsibilities:

- validate the API envelope
- detect devices by serial number
- normalize field names
- preserve null values
- preserve original signed power values
- derive import/export and charge/discharge directions
- create the internal device model

The parser does not access ioBroker.

## Device model

File:

```text
src/lib/saxPowerDevice.ts
```

The internal model groups values into:

```text
info
live
control
status
diagnostics
```

The rest of the adapter does not need to know the original dashboard field layout.

## State definitions

File:

```text
src/lib/stateDefinitions.ts
```

This file is the central metadata source for public ioBroker states.

Each definition contains:

- state ID
- model path
- original API field
- type
- role
- unit
- name
- description
- category
- read/write access
- value accessor

The same metadata is intended to support:

- object creation,
- runtime value updates,
- documentation,
- and tests.

## State engine

File:

```text
src/lib/stateEngine.ts
```

Responsibilities:

- create dynamic device objects
- create category channels
- create states from state definitions
- write acknowledged values
- preserve per-device raw diagnostics
- support more than one storage device

The state engine depends only on a minimal adapter contract:

- `extendObjectAsync`
- `setStateAsync`

It does not depend on a specific adapter-core class return type.

## Modbus discovery

File:

```text
src/lib/modbusDiscovery.ts
```

Responsibilities:

- normalize selected Modbus instance IDs
- read states below the selected instance
- filter exact instance prefixes
- filter numeric writable states
- prefer registers 43 and 44
- return Admin dropdown options

## Statistics engine

Planned file:

```text
src/lib/statisticsEngine.ts
```

Responsibilities:

- retrieve or receive historical measurements
- calculate day, week, month, year, and total values
- calculate per-device statistics
- aggregate all detected devices
- persist results and metadata
- avoid duplicate processing

## Future control engine

Planned after version 1.0:

```text
src/lib/controlEngine.ts
```

The control engine will remain optional and separate from cloud retrieval and statistics.

Possible dependencies include:

- battery SOC
- current load
- PV production
- grid import/export
- time windows
- power limits
- safety conditions
- data freshness
- Modbus availability
- communication errors

## Design rules

1. Cloud retrieval must work without Modbus.
2. Statistics must work without control features.
3. Public states must be documented.
4. Unknown API fields must not be assigned guessed meanings.
5. Null must not silently become zero.
6. Signed original values must remain available.
7. New API fields should require changes in as few layers as possible.
8. Sensitive data must never be written to logs or diagnostics.
