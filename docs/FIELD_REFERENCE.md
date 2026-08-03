# SAX Power Field Reference

This document describes the SAX Power dashboard fields currently known to the adapter.

The reference distinguishes between:

- the original SAX Power API field,
- the normalized internal model,
- the ioBroker state,
- the physical source,
- units and sign conventions,
- and fields whose meaning is not yet fully verified.

No undocumented meaning is invented. Unknown or partially understood values remain explicitly marked as such.

## Live measurement fields

### `sn`

| Property | Value |
|---|---|
| Source | SAX Power storage system |
| Type | string |
| Internal model | `info.serialNumber` |
| ioBroker state | `devices.<serial>.info.serialNumber` |
| Description | Serial number reported by the storage device |

The serial number is used as the stable device identifier below `devices`.

---

### `data_time`

| Property | Value |
|---|---|
| Source | SAX Power dashboard |
| Type | string |
| Internal model | `info.sourceTimestamp` |
| ioBroker state | `devices.<serial>.info.sourceTimestamp` |
| Description | Timestamp assigned to the measurement by SAX Power |

This value is kept separately from the adapter receive timestamp.

---

### `grid_voltage`

| Property | Value |
|---|---|
| Source | Smart meter |
| Type | number |
| Unit | V |
| Internal model | `live.gridVoltage` |
| ioBroker state | `devices.<serial>.live.gridVoltage` |
| Description | Current grid voltage |

---

### `grid_power`

| Property | Value |
|---|---|
| Source | Smart meter |
| Type | number |
| Unit | W |
| Internal model | `live.gridPower` |
| ioBroker state | `devices.<serial>.live.gridPower` |
| Negative value | Export to the public grid |
| Positive value | Import from the public grid |
| Zero | No measurable grid flow |

Derived states:

- `live.gridImportPower`
- `live.gridExportPower`
- `live.gridDirection`

The original signed value is preserved unchanged.

---

### `battery_power`

| Property | Value |
|---|---|
| Source | Battery |
| Type | number |
| Unit | W |
| Internal model | `live.batteryPower` |
| ioBroker state | `devices.<serial>.live.batteryPower` |
| Negative value | Battery charging |
| Positive value | Battery discharging |
| Zero | No measurable battery flow |

Derived states:

- `live.batteryChargePower`
- `live.batteryDischargePower`
- `live.batteryDirection`

The original signed value is preserved unchanged.

---

### `SOC`

| Property | Value |
|---|---|
| Source | Battery |
| Type | number |
| Unit | % |
| Internal model | `live.soc` |
| ioBroker state | `devices.<serial>.live.soc` |
| Description | Current battery state of charge |

---

### `PV_power`

| Property | Value |
|---|---|
| Source | PV integration, if available |
| Type | number or null |
| Unit | W |
| Internal model | `live.pvPower` |
| ioBroker state | `devices.<serial>.live.pvPower` |
| Description | PV power reported by SAX Power |

A `null` value means unavailable. It must not be converted to zero.

## Control-related dashboard fields

### `charge_energy`

Despite its API name, this field represents a power target rather than accumulated energy.

| Property | Value |
|---|---|
| Source | Battery control |
| Type | number |
| Unit | W |
| Internal model | `control.targetChargePower` |
| ioBroker state | `devices.<serial>.control.targetChargePower` |
| Description | Currently requested charging power |
| Typical sign | Negative while charging is requested |

The adapter exposes this dashboard value read-only. Optional Modbus control is configured separately.

---

### `discharge_energy`

Despite its API name, this field represents a power target rather than accumulated energy.

| Property | Value |
|---|---|
| Source | Battery control |
| Type | number |
| Unit | W |
| Internal model | `control.targetDischargePower` |
| ioBroker state | `devices.<serial>.control.targetDischargePower` |
| Description | Currently requested discharging power |

The adapter exposes this dashboard value read-only. Optional Modbus control is configured separately.

## General status fields

### `data_connected`

| Property | Value |
|---|---|
| Type | numeric flag |
| `1` | Connected |
| `0` | Not connected |
| Internal model | `status.connected` |
| ioBroker state | `devices.<serial>.status.connected` |

---

### `data_on`

| Property | Value |
|---|---|
| Type | numeric flag |
| `1` | Device on |
| `0` | Device off |
| Internal model | `status.on` |
| ioBroker state | `devices.<serial>.status.on` |

---

### `data_standby`

| Property | Value |
|---|---|
| Type | numeric flag |
| `1` | Standby |
| `0` | Not in standby |
| Internal model | `status.standby` |
| ioBroker state | `devices.<serial>.status.standby` |

---

### `data_calibration`

| Property | Value |
|---|---|
| Type | numeric flag |
| Internal model | `status.calibration` |
| Description | Calibration status reported by the device |

---

### `data_hw`

| Property | Value |
|---|---|
| Type | numeric flag |
| Internal model | `status.hardwareError` |
| Description | Hardware status or hardware error indication |

The exact semantics of non-zero values must still be verified.

---

### `data_bat`

| Property | Value |
|---|---|
| Type | numeric flag |
| Internal model | `status.batteryError` |
| Description | Battery status or battery error indication |

The exact semantics of non-zero values must still be verified.

---

### `data_relay`

| Property | Value |
|---|---|
| Type | numeric flag |
| Internal model | `status.relayError` |
| Description | Relay status or relay error indication |

The exact semantics of non-zero values must still be verified.

---

### `data_na_schutz`

| Property | Value |
|---|---|
| Type | string |
| Internal model | `status.naProtection` |
| Description | Grid and system protection status reported by SAX Power |

An empty string means that no text status was supplied.

---

### `battery_status`

| Property | Value |
|---|---|
| Type | number |
| Internal model | `status.batteryStatusCode` |
| ioBroker state | `devices.<serial>.status.batteryStatusCode` |
| Description | Unmodified SAX Power battery status code |

No textual interpretation is provided until the code mapping has been verified.

## Additional known fields

The following fields are preserved in diagnostics but are not yet mapped to stable public states:

- `data_m8`
- `data_cycle`
- `data_sm2`
- `data_sm1`
- `data_i2`
- `data_i1`
- `data_i`
- `data_m`
- `data_u`
- `data_wait60`
- `data_sm_test`
- `message1`
- `message2`
- `last_messages`
- `last_online_from`
- `phase`

Fields are promoted to documented states only after their semantics have been verified.

## Diagnostic preservation

The complete device payload is stored as JSON under:

```text
devices.<serial>.diagnostics.raw
```

During development, the complete API envelope is additionally available under:

```text
diagnostics.rawLiveData
```
