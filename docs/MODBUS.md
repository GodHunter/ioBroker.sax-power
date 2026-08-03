# Optional Modbus Integration

Modbus support is an optional adapter feature.

The SAX Power cloud connection, device discovery, live values, and statistics continue to work when Modbus control is disabled or no Modbus adapter is installed.

## Purpose

The integration links SAX Power control states to writable ioBroker states exposed by an ioBroker Modbus adapter instance.

The adapter stores full ioBroker object IDs and does not depend on:

- a fixed Modbus instance number,
- a fixed state name,
- or a particular language used in state names.

## Instance selection

Supported examples:

```text
modbus.0
modbus.1
modbus.2
system.adapter.modbus.1
```

The long instance form is normalized internally.

The selected instance is never hard-coded.

## State discovery

The Admin UI requests writable numeric states below the selected Modbus instance.

The discovery filters for:

| Property | Required value |
|---|---|
| Object type | `state` |
| `common.type` | `number` |
| `common.write` | `true` |
| Object ID prefix | Exact selected instance |

States from similar instance names are excluded.

Example:

```text
Selected: modbus.1
Included: modbus.1.*
Excluded: modbus.0.*, modbus.10.*, javascript.0.*
```

## SAX Power registers

### Register 44

Charging power limit.

The Admin UI prefers a state whose state name starts with register number `44`.

Example:

```text
modbus.1.holdingRegisters.44_Leistungsgrenzwert_für_Ladung
```

### Register 43

Discharging power limit.

The Admin UI prefers a state whose state name starts with register number `43`.

Example:

```text
modbus.1.holdingRegisters.43_Leistungsgrenzwert_für_Entladung
```

The discharge register remains optional because it may not yet be configured in every ioBroker Modbus instance.

## Safety requirements

Before writing, the control module must verify:

- Modbus control is enabled,
- the configured object exists,
- the object belongs to the selected Modbus instance,
- the object is a numeric state,
- the object is writable,
- the value is finite,
- and the value is inside the supported range.

The adapter must never write to an automatically guessed state without saving the selected full object ID in the instance configuration.

## Separation of concerns

The planned modules are:

```text
modbusDiscovery.ts
├── normalize instance IDs
├── discover writable states
├── filter exact instance prefix
└── prefer registers 43 and 44

modbusControl.ts
├── validate configured states
├── validate requested values
├── write values
└── report errors
```

The later intelligent charging and discharging logic is planned as a separate feature after version 1.0.
