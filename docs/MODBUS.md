# Modbus integration roadmap

## Version 1.0 status

Modbus control is intentionally not exposed in version 1.0.

Version 1.0 provides:

- SAX Power cloud connection
- device discovery
- live measurements
- historical statistics
- aggregated live values

It does not provide writable charging or discharging control.

## Planned design

A later release may optionally forward control commands to writable states of an installed ioBroker Modbus adapter.

The design should remain independent of a fixed Modbus instance number. Users will select the required Modbus instance, and the adapter will discover writable numeric states below that instance.

## Known SAX Power register information

Based on the SAX Power documentation reviewed during development:

- Register 44 is used for the charging power limit.
- Register 43 is intended for the discharging power limit.

Register 43 may not be present in every existing ioBroker Modbus configuration.

The adapter must not assume that the Modbus instance is `modbus.1`.

## Safety requirements

Before Modbus control is released, the implementation must include:

- explicit opt-in
- validation of writable target states
- value range validation
- clear units
- safe startup behavior
- no automatic writes after installation
- dependency and availability checks
- error recovery
- audit-friendly logging without sensitive data
- tests for missing or stale states

## Intelligent charging

A later control feature may integrate user-defined charging logic. That feature is separate from basic Modbus forwarding and must account for dependencies such as:

- PV availability
- house consumption
- grid direction
- battery SOC
- configured limits
- stale measurements
- communication failure
- multiple storage devices
- manual override
- fallback behavior

No control algorithm is part of version 1.0.
