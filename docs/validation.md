# Validation record — 2026-09-30

Executed locally on Linux with Node.js v24.19.0 and npm 11.9.0:

- `npm test`: **35 tests passed**, 0 failed. This rebuilds the TypeScript core, browser bundle and standalone app first
- `npm run check`: passed
- `npm run test:package`: passed. Actual `npm pack`, offline local tarball install in a fresh temporary project, installed CLI exit/report behavior, executable bin entry, and ESM package import
- `npm audit`: 0 reported vulnerabilities across the installed dependency graph at check time
- CLI text-mode terminal-control and bidi escaping regression passes; machine-readable source remains unchanged
- Reproducer injection test actually launches the generated `.mjs` with Node, validates output, and confirms input resembling executable code remains text
- UI DOM regressions run the compiled standalone app: initial demo, source selection, severity filters, stale-output invalidation, malformed input, HTML-like input, presets, clear, keyboard shortcut, fatal UTF-8 import, racing file reads, absent storage/external assets, and 100-finding pagination
- 1,000 generated valid JSON values plus 3,000 mutations agree with native acceptance

## External parser corpus

[JSONTestSuite](https://github.com/nst/JSONTestSuite), commit `1ef36fa01286573e846ac449e8683f8833c5b26a`, MIT licensed, not vendored.

Of 318 `test_parsing` fixtures:

- 290 valid-UTF8 within-budget inputs compared with native `JSON.parse`: **0 acceptance mismatches**
- 25 invalid-UTF8 inputs rejected at the file boundary
- 3 over-limit inputs rejected by explicit resource caps

This is native-acceptance agreement for that supported corpus, not a claim of complete JSON/RFC conformance for every possible implementation or encoding. Run `node scripts/corpus-check.mjs PATH/JSONTestSuite/test_parsing` after building to repeat.

## Bounded-work smoke measurements

Single uncalibrated run on this Linux execution environment; these are not portable performance promises:

- Array of 20,000 changed numbers: 170.7 ms, 20,000 findings
- Object containing 20,000 repeated keys: 79.0 ms, stopped at the token limit
- JSON string containing 1,000,000 ASCII characters: 128.2 ms, no findings

## Explicitly not verified

- Real browser desktop/mobile rendering, touch layout, 200% zoom and screen-reader behavior. The cloud browser explicitly rejected the local `file://` preview under its security policy. The restriction was not bypassed. No screenshot or visual-pass claim is made
- Windows or Node 22 execution. CI matrix is configured for Windows/Linux × Node 22/24 but has not run on a public remote
- Public npm installation, public repository release, or community adoption

Happy DOM evaluates only this project's trusted built application code for UI testing and prints its VM-isolation warning. Untrusted JSON input is never evaluated. DOM tests are not a replacement for real-browser visual/accessibility testing.
