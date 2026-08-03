# Changelog

All notable changes to this project will be documented in this file.

The project follows semantic versioning.

## [Unreleased]

### Planned

- Optional Modbus control
- User-defined statistical intervals
- Additional diagnostics and notifications
- Further community-requested integrations

## [1.0.0] - Unreleased

### Added

- SAX Power cloud authentication
- Automatic discovery of all storage devices assigned to an account
- Device-specific information and live measurements
- Historical charged and discharged battery energy for:
  - current day
  - current week
  - current month
  - current year
  - total available history
- Aggregated statistics across all detected storage devices
- Aggregated root live states for PV, house consumption, grid, battery, and state of charge
- Responsive React administration interface
- Live energy dashboard
- Automatic ioBroker light and dark theme support
- Support and project information page
- Complete architecture, API, object, field, statistics, branding, and Modbus roadmap documentation

### Changed

- Minimum SAX Power cloud polling interval set to 60 seconds
- Administration interface made scrollable on displays with limited height
- Adapter icon adapted for reliable visibility on light and dark backgrounds
- Technical statistics metadata removed from the public period object tree

### Security

- Read-only cloud access in version 1.0
- Credentials are not written to logs
- Bearer tokens are held only in memory
- No Modbus writes or public writable control states
