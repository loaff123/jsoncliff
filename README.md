# JSONCliff

**Catch the data that falls off a JSON → JavaScript → JSON round trip.**

A local-first debugger for API developers. Paste the original JSON response and get clickable, source-linked evidence for rounded IDs, numeric overflow/underflow, negative zero and overwritten duplicate keys. Export a diagnostic JSON file, a self-contained HTML report, or a runnable Node.js reproducer.

[中文说明](README.zh-CN.md) · [Semantics](docs/semantics.md) · [Architecture](docs/architecture.md) · [Validation](docs/validation.md)

## 30-second demo

[Try the public demo](https://jsoncliff.lyczz.chatgpt.site), or run `npm ci && npm run build` and open `dist/standalone.html` in a modern browser. The offline app needs no server or account.

```json
{
  "id": 9007199254740993,
  "status": "pending",
  "status": "paid",
  "balance": 1e400,
  "offset": -0,
  "price": 1.2300,
  "ordinaryDecimal": 0.1
}
```

The native output contains ID `9007199254740992`, only the later status, `balance: null`, and `offset: 0`. JSONCliff reports four material changes. `1.2300 → 1.23` is separately marked as spelling only; **ordinary `0.1` is not called corrupted**.

Click a finding to select its exact source span. Filter Changes, Risks, or Spelling. “Number edges” includes `9007199254740992`, an unsafe integer that is nevertheless preserved in this round trip.

## Run locally

Node.js 22 or 24; npm. These are the supported CI targets. Linux Node 24 was executed for this release; Windows and Node 22 jobs are configured, not yet run remotely.

```sh
npm ci
npm test
npm run dev
```

`npm test` builds the TypeScript core, browser app, and offline HTML before running the tests. `npm run build` writes `lib/` and `dist/`; no network is required to use those prebuilt artifacts. Source releases include them.

## CLI

```sh
node lib/cli.js examples/api-response.json
node lib/cli.js examples/api-response.json --format json > report.json
node lib/cli.js examples/api-response.json --format html > report.html
node lib/cli.js examples/api-response.json --format repro > reproduce.mjs
node reproduce.mjs
```

With no filename, or `-`, JSONCliff reads stdin. Input must be UTF-8. A UTF-8 BOM is rejected, matching `JSON.parse` on a string containing U+FEFF. CLI output is deterministic and contains no timestamps or machine paths.

Exit codes: **0** no observed material changes (risks/spelling may exist); **1** observed material changes; **2** invalid/over-limit input, invalid UTF-8, usage, or I/O error. All four output formats retain this exit-code policy; a successfully generated report can therefore exit 1.

Text-mode output escapes terminal control and bidirectional-formatting characters from input. JSON/HTML exports remain data-bearing artifacts. Never redirect output to the input filename: your shell can truncate it before JSONCliff starts.

No npm package has been publicly published. Test the local release package with:

```sh
npm run test:package
# In a separate consumer project, install the included tarball:
npm install /path/to/jsoncliff/release/jsoncliff-0.1.0.tgz
npx --no-install jsoncliff response.json
```

The package has zero runtime dependencies. `private: true` deliberately prevents accidental npm publication while distributing public source.

## Reusable TypeScript core

```ts
import { analyze, renderHtmlReport, createReproducer } from 'jsoncliff';
const report = analyze('{"id":9007199254740993}');
console.log(report.findings[0].code); // precision-loss
```

Use the source or installed tarball. ESM and generated TypeScript declarations are provided. Report `schemaVersion` is `"1.0"`, independent of the package version. Findings include JSON Pointer, occurrence number, unique ID, one-based line/column, and end-exclusive UTF-16 offsets.

## What this does (and does not) establish

- Compares exact decimal source values with decimal values emitted by native JSON serialization
- Preserves duplicate occurrences and escaped equivalent property names in the diagnostic source tree
- Distinguishes observed changes, unsafe-but-preserved integer risks, and representation-only changes
- Uses the actual browser/Node runtime; no simulated Python/Go/Java behavior
- Does not rewrite numbers into strings, infer a schema, fix your payload, validate business rules, or claim binary floating-point arithmetic is exact
- Does not report whitespace, string-escape spelling, or object-key ordering changes

This is a debugger and evidence UI, not a replacement production JSON parser. For preservation, consider [lossless-json](https://github.com/josdejong/lossless-json) or [json-bigint](https://github.com/sidorares/json-bigint), after reviewing their semantics and your application needs.

## Safety and limits

No app backend, analytics, external fonts, CDN resources, or input persistence. Input is handled in this tab/process. An already loaded app works without network; use `standalone.html` for reliable offline reopening. Hosting infrastructure may record ordinary page requests, never JSON input through application code.

Exports include original input. Review for credentials or private data before sharing. Input is never passed to `eval`, `Function`, or a shell; reproducer exports encode every UTF-16 code unit into a string literal. HTML reports escape input and have a restrictive content-security policy.

Limits: 1 MiB UTF-8, 60,000 tokens, 20,000 entries, nesting depth 128, 4,096 characters per numeric token. Over-limit inputs fail before full native parsing. The UI renders 100 findings per page to bound DOM work. See [semantics](docs/semantics.md) for exact boundaries.

## Verification and contributing

```sh
npm test
npm run check
npm run test:package
npm audit
```

See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [CHANGELOG](CHANGELOG.md), and [third-party notices](THIRD_PARTY_NOTICES.md). MIT licensed. Project/package naming is provisional: a registry lookup found no existing `jsoncliff` package on 2026-09-30; this is not a trademark search or a guarantee of future availability.
