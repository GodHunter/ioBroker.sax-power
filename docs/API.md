# SAX Power Dashboard API

This document records the dashboard API behavior verified during adapter development.

The API is not documented as a public developer API by SAX Power. Endpoints and payloads may therefore change without notice.

## Base URL

Default:

```text
https://webserver.sax-power.net
```

## Authentication

### Token endpoint

```text
POST /api/auth/token/
```

### Content type

```text
application/x-www-form-urlencoded
```

### Form fields

| Field | Value |
|---|---|
| `email` | SAX Power dashboard email address |
| `password` | SAX Power dashboard password |
| `stayLoggedIn` | `false` |

The endpoint does not accept the original JSON body used by the generated adapter baseline.

## Live data

### Endpoint

```text
GET /api/auth/data/
```

The request uses the token obtained during login.

On HTTP 401, the API client performs one new login and retries the request.

## Example response envelope

```json
{
  "data": [
    {
      "1012401057": {
        "sn": "1012401057",
        "data_time": "2026-08-03 11:11:36.002006",
        "grid_voltage": 237.1,
        "grid_power": -3204,
        "battery_power": -456,
        "SOC": 50,
        "charge_energy": -450,
        "discharge_energy": 0
      }
    }
  ],
  "message3": {
    "1012401057": null
  },
  "message5": {
    "1012401057": null
  },
  "message6": {
    "1012401057": null
  }
}
```

## Device structure

Each object in the `data` array can contain one or more serial-number keys.

The parser therefore supports multiple storage systems:

```text
data[]
└── <serial>
    └── device payload
```

Invalid entries are ignored without aborting the complete response.

## Null handling

A `null` value means unavailable and is not converted to zero.

This is particularly relevant for:

```text
PV_power
```

## Error handling

The client distinguishes:

- authentication errors,
- HTTP errors,
- timeouts,
- invalid responses,
- and adapter configuration errors.

Passwords and tokens must never be written to logs or diagnostic states.

## History and CSV export

The dashboard provides a historical view and CSV export.

The exact history endpoint, request parameters, response format, and pagination behavior still need to be verified before implementing the statistics engine.

The implementation goal is to automate the same data retrieval that is available manually through the dashboard.
