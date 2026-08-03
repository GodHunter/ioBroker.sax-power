# Security policy

## Supported versions

Security fixes are provided for the latest published version of the adapter.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in a public GitHub issue.

Contact the maintainer privately through the contact information associated with the GitHub account or repository. Include:

- affected adapter version
- impact
- reproduction steps
- relevant logs with secrets removed
- suggested mitigation, when known

Please do not include:

- SAX Power passwords
- bearer tokens
- private email addresses
- complete storage serial numbers
- private network information

## Security model

Version 1.0:

- performs read-only SAX Power cloud requests
- stores credentials in the ioBroker instance configuration
- keeps authentication tokens in memory
- does not write credentials or tokens to logs
- does not expose writable Modbus control states
- does not perform cloud configuration changes

No software can be guaranteed to be free of security defects. Responsible reports are appreciated.
