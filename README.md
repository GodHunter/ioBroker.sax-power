# ioBroker.sax-power

[![NPM version](https://img.shields.io/npm/v/iobroker.sax-power.svg)](https://www.npmjs.com/package/iobroker.sax-power)
[![Downloads](https://img.shields.io/npm/dm/iobroker.sax-power.svg)](https://www.npmjs.com/package/iobroker.sax-power)
[![Test and Release](https://github.com/GodHunter/ioBroker.sax-power/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/GodHunter/ioBroker.sax-power/actions/workflows/test-and-release.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-brightgreen.svg)](https://nodejs.org/)

ioBroker adapter for SAX Power battery storage systems.

This independent community adapter connects ioBroker to the SAX Power cloud and provides live measurements, device information and historical energy statistics. It supports automatic device discovery and aggregates values across all detected storage systems.

> This project is not affiliated with, endorsed by or maintained by SAX Power GmbH.

## Features

- SAX Power cloud authentication
- Automatic discovery of all storage systems assigned to the account
- Live values for photovoltaic generation, house consumption, grid power, battery power and state of charge
- Historical energy statistics for today, week, month, year and total
- Aggregated live values and statistics across multiple storage systems
- Responsive React-based administration interface
- Optional Modbus configuration prepared for future control functions
- Minimum supported polling interval of **60 seconds** to avoid unnecessary load on the SAX Power service
- Documented object model, API integration and statistics processing

## Requirements

- ioBroker with Admin **7.8.23 or newer**
- Node.js **22 or newer**
- A SAX Power account with access to the SAX Power dashboard

## Installation

The adapter can be installed from npm:

```bash
npm install iobroker.sax-power
```

During the testing phase it can also be installed from GitHub using the ioBroker expert installation dialog:

```text
https://github.com/GodHunter/ioBroker.sax-power
```

## Configuration

Open the adapter configuration in ioBroker Admin and enter:

- the SAX Power dashboard email address
- the corresponding password
- the SAX Power API base URL, unless the default must be changed
- the polling interval

The minimum polling interval is **60 seconds**.

The password is stored using ioBroker's encrypted and protected native configuration mechanisms.

## Live dashboard

The administration interface displays aggregated live cards for:

- PV power
- House consumption
- Grid power
- Battery power
- State of charge

The dashboard reads only ioBroker states. It does not perform additional cloud requests.

## Object structure

The adapter creates separate object trees for every detected SAX Power storage system and an additional aggregated statistics tree.

Typical structure:

```text
sax-power.0
├── info
├── devices
│   └── <device-id>
│       ├── info
│       ├── live
│       └── statistics
└── statistics
    ├── info
    ├── today
    ├── week
    ├── month
    ├── year
    └── total
```

Detailed references are available in:

- [Object reference](docs/OBJECTS.md)
- [Field reference](docs/FIELD_REFERENCE.md)
- [Statistics](docs/STATISTICS.md)

## Statistics

Historical values are retrieved from the SAX Power energy chart endpoint and mapped into ioBroker states.

Supported periods:

- today
- week
- month
- year
- total

For accounts with multiple storage systems, the adapter also calculates aggregated statistics.

Further details are documented in [docs/STATISTICS.md](docs/STATISTICS.md).

## Modbus

Modbus configuration is optional and independent of the SAX Power cloud connection.

Version 1.0.x does not expose active Modbus control functions. The existing configuration provides the technical foundation for later releases without changing the read-only cloud integration.

See [docs/MODBUS.md](docs/MODBUS.md).

## Documentation

- [API integration](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Branding and project independence](docs/BRANDING.md)
- [Field reference](docs/FIELD_REFERENCE.md)
- [Modbus](docs/MODBUS.md)
- [Object structure](docs/OBJECTS.md)
- [Statistics](docs/STATISTICS.md)

## Support and feedback

Please use GitHub Issues for bug reports and feature requests:

- [Report a bug](https://github.com/GodHunter/ioBroker.sax-power/issues)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

Feedback from users operating multiple SAX Power storage systems is especially valuable because it helps validate discovery, aggregation and multi-device behavior under real-world conditions.

## Development

Install dependencies:

```bash
npm ci
npm --prefix src-admin ci
```

Run the complete project check:

```bash
npm run check
```

Run history tests:

```bash
npm run test:history
```

Run package validation:

```bash
npm run test:package
```

## Changelog

### 1.1.2 (2026-08-05)

- Updated the public project identity and maintainer contact.
- Corrected the donation address shown in the administration interface.
- Aligned the Node.js 22 TypeScript dependency declaration with ioBroker repository requirements.


### 1.1.1 (2026-08-05)

- Added detailed SAX Power Cloud connection states and HTTP status reporting.
- Improved authentication error messages, including guidance to re-enter and save the password after upgrading from an older adapter version.
- Updated the React admin interface with clear connection, authentication, timeout, network and server status messages.
- Updated `@tsconfig/node22` to 22.0.5 and removed the remaining backend ESLint warning.

### 1.1.0 (2026-08-05)

- Update the TypeScript configuration from `@tsconfig/node20` to `@tsconfig/node22`
- Commit the compiled backend to support direct GitHub installations
- Remove the unsupported `common.noGit` property
- Optimize the build workflow so admin dependencies are installed only once per full check
- Clean up conflicting and malformed `.gitignore` rules
- Keep runtime behavior and the existing SAX Power functionality unchanged


### 1.0.1 (2026-08-04)

- Require Node.js 22 or newer
- Raise the required ioBroker Admin version
- Align package metadata with current ioBroker repository requirements
- Modernize GitHub Actions and Dependabot configuration
- Replace the deprecated Dependabot auto-merge action
- Configure npm dependency cooldown and include the separate admin project
- Correct encrypted and protected native password declarations
- Remove unused template translations and obsolete `jsonConfig.json`
- Mark generated build files correctly for GitHub installations
- Replace the plain API request timer with `AbortSignal.timeout()`
- Keep the existing React administration interface and runtime behavior unchanged

### 1.0.0 (2026-08-03)

- Initial public release
- Automatic discovery of SAX Power systems
- Live monitoring
- Historical energy statistics
- Aggregated values across multiple systems
- Responsive React-based admin interface
- Optional Modbus configuration
- Comprehensive project documentation

## License

Copyright (c) 2026 GodHunter godhunter@posteo.de

MIT License

See [LICENSE](LICENSE) for the complete license text.
