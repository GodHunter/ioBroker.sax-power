# ioBroker SAX Power Adapter

[![Test and Release](https://github.com/GodHunter/ioBroker.sax-power/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/GodHunter/ioBroker.sax-power/actions/workflows/test-and-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![ioBroker](https://img.shields.io/badge/ioBroker-adapter-3399CC)](https://www.iobroker.net/)

The SAX Power adapter connects ioBroker to the SAX Power cloud and provides device information, live measurements, historical battery-energy statistics, and an aggregated live-energy view.

> This is an independent open-source community project. It is not affiliated with, endorsed by, or maintained by SAX Power GmbH.

## Features

- SAX Power cloud authentication
- Automatic discovery of all storage devices assigned to the account
- Live values for every detected storage device
- Aggregated live values under the adapter root
- Historical charged and discharged energy for:
  - today
  - current week
  - current month
  - current year
  - total history
- Aggregated statistics across all detected storage devices
- Responsive React-based administration interface
- Automatic light and dark theme support through ioBroker
- Minimum cloud polling interval of 60 seconds
- No additional SAX Power cloud requests from the live dashboard

## Installation

Install the adapter from the ioBroker repository or directly from GitHub during development.

After installation, open the instance configuration and enter:

- SAX Power cloud API URL
- SAX Power username or email address
- SAX Power password
- Polling interval

The minimum supported polling interval is **60 seconds**. Shorter intervals are rejected to avoid unnecessary load on the SAX Power cloud service.

## Object structure

```text
sax-power.0
├── info
├── live
├── devices
│   └── <serialNumber>
│       ├── info
│       ├── live
│       └── statistics
└── statistics
```

The root `live` and `statistics` trees contain values aggregated across all detected storage devices. Device-specific values remain available below `devices.<serialNumber>`.

See [docs/OBJECTS.md](docs/OBJECTS.md) for the complete structure.

## Live dashboard

The administration interface displays:

- PV power
- House consumption
- Grid power and direction
- Battery power and direction
- State of charge

The dashboard reads only ioBroker states. It does not trigger additional SAX Power cloud requests.

Some installations do not expose a PV value through the SAX Power cloud API. In that case, PV power and calculated house consumption are displayed as **Not available**.

## Statistics

Historical battery-energy values are provided for every storage device and as a combined total.

Each period contains:

- `chargedEnergy`
- `dischargedEnergy`
- `firstTimestamp`
- `lastTimestamp`

Technical metadata such as sample count, internal source identifiers, and calculated completeness is intentionally not exposed as public period states.

See [docs/STATISTICS.md](docs/STATISTICS.md).

## Security and privacy

- Credentials are stored in the ioBroker instance configuration.
- Authentication tokens are held only in memory.
- Passwords and tokens are not written to adapter logs.
- Cloud communication uses HTTPS.
- The adapter performs read-only SAX Power cloud requests.
- Modbus control is not enabled in version 1.0.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Cloud API](docs/API.md)
- [Object structure](docs/OBJECTS.md)
- [Field reference](docs/FIELD_REFERENCE.md)
- [Statistics](docs/STATISTICS.md)
- [Modbus roadmap](docs/MODBUS.md)
- [Branding and trademarks](docs/BRANDING.md)

## Planned features

The following features are intentionally outside the version 1.0 scope:

- Optional Modbus control
- Intelligent charging algorithms
- User-defined statistical periods
- Battery analysis and diagnostics
- Notifications and alarms
- Additional integrations

## Support development

The SAX Power adapter is developed entirely in my free time. If you like it and it helps you in everyday use, you can support its continued development with a voluntary donation. Thank you!

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Security issues should be reported according to [SECURITY.md](SECURITY.md).

## License

MIT License. See [LICENSE](LICENSE).

SAX Power and the SAX Power logo are protected trademarks or trademark assets of SAX Power GmbH. See [docs/BRANDING.md](docs/BRANDING.md).
