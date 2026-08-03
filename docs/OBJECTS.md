# Object Reference

This document describes every ioBroker object created by the adapter.

## Root

``` text
sax-power.0
├── info
├── statistics
└── devices
```

## Devices

Each detected storage system creates:

``` text
devices.<serial>
├── live
├── battery
├── grid
├── pv
├── messages
└── statistics
```

Every object will be documented with:

-   ID
-   Type
-   Unit
-   Role
-   Read/Write
-   Source
-   Description
