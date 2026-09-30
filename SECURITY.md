# Security

This is a pre-1.0 local diagnostic tool. Do not paste production secrets into any tool without reviewing its code and your organization's rules. The app sends no input over the network and uses no persistent browser storage. Hosted infrastructure may log ordinary page loads.

Reports and reproducers intentionally contain the complete input. Treat them as sensitive if their input is sensitive. HTML output escapes user content; reproducer output encodes every UTF-16 code unit. Do not replace either exporter with string interpolation of raw input.

Input limits and strict grammar run before native parsing. File decoding rejects invalid UTF-8. The source tree stores untrusted property names in Maps/arrays to avoid prototype pollution. No input is evaluated, shell-executed, or loaded as a module. This does not protect you against malicious browser extensions, compromised devices, or changes to the build toolchain.

No dedicated security mailbox is provided. Do not post live secrets or private payloads in public issues. Use a minimal synthetic reproducer for ordinary bug reports. For sensitive issues, request a private contact channel from the maintainer without disclosing exploit details.

Before release: run tests, inspect dependency changes, audit installed packages, test actual tarball installation, and verify HTML/reproducer injection regression tests. No guarantee is made that these checks detect every vulnerability.
