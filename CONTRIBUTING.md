# Contributing

Thank you for helping improve the ioBroker SAX Power adapter.

## Before opening an issue

Please check:

- whether the problem still occurs with the latest version
- whether the adapter instance is connected
- whether the SAX Power cloud account works in the official dashboard
- whether the issue has already been reported

Do not publish passwords, bearer tokens, private email addresses, complete serial numbers, or other sensitive information.

## Bug reports

A useful bug report includes:

- adapter version
- ioBroker js-controller version
- Node.js version
- operating system or container environment
- number of detected storage devices
- relevant adapter log messages
- steps to reproduce the issue
- expected and actual behavior

Use the provided GitHub bug report template.

## Feature requests

Describe:

- the problem the feature would solve
- the expected behavior
- whether additional cloud or Modbus access would be required
- any safety implications for writable functionality

## Development setup

Install dependencies and run the quality checks:

```bash
npm ci
npm run check
npm run test:package
npm pack --dry-run
```

The React administration interface has its own dependency tree under `src-admin`.

## Pull requests

Pull requests should:

- have a focused scope
- preserve the read-only version 1.0 behavior unless explicitly changing it
- include tests where practical
- pass all existing checks
- update documentation when public behavior changes
- avoid unrelated formatting or refactoring

## Commit messages

Use short conventional-style commit messages where practical, for example:

```text
feat: add device diagnostic state
fix: handle missing PV power
docs: clarify history aggregation
test: cover multiple storage devices
```
