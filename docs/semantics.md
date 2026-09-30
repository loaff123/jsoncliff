# Semantics and diagnostic contract

## Observation, not an alternate runtime

JSONCliff validates strict JSON and builds a source tree before calling the actual native `JSON.parse(source)` and `JSON.stringify(parsed, null, 2)`. Numbers are compared as exact decimal text values across that round trip, not against the infinitely precise internal value of every binary floating-point operation. `0.1` round-trips to `0.1`, so it has no finding. Whitespace, object property ordering, and escape-spelling changes in strings are out of scope.

Decimal normalization stores a sign, nonzero significant digits, and a BigInt power-of-ten exponent. Leading/trailing zeros are normalized without constructing 10 raised to a giant exponent. Equivalent source and emitted decimal forms compare equal, including giant-exponent zero. This does not make native arithmetic exact.

## Findings

- `precision-loss` / change: finite native output has a different exact decimal value
- `overflow` / change: finite decimal JSON token becomes Infinity or -Infinity internally, then null
- `underflow` / change: nonzero source decimal becomes zero, including negative underflow
- `negative-zero` / change: exact negative zero is accepted as -0, then its sign is erased by stringify
- `duplicate-key` / change: an earlier decoded-equivalent property occurrence is overwritten, even if the later value is equal
- `unsafe-integer` / risk: exact round-trip decimal value is preserved, but native value is an integer outside Number's safe integer range
- `representation` / info: exact decimal value is equal but numeric token spelling changes; may coexist with unsafe-integer

Negative underflow is underflow, not intentional negative zero. Huge integer-valued numbers may carry an unsafe-integer risk; the definition is `Number.isInteger(value) && !Number.isSafeInteger(value)`, not merely integer-looking source syntax.

## Duplicates and paths

The syntax tree uses Maps and property arrays, never dynamically assigned user keys on a plain object. `__proto__`, `constructor`, and escaped property names remain data. Native JSON.parse creates its usual own properties.

Each overwritten occurrence gets a finding covering the original key-through-value span. Numbers inside discarded property values are not separately reported, because they do not contribute to final output. Duplicate findings inside discarded ancestors remain visible and explain their ancestor was overwritten. For duplicate findings, `before` and `after` are source previews of the overwritten and winning values; `after` is not a claim that the winning source spelling survives numeric conversion. Previews over 1,024 characters are visibly truncated; exact text remains in `source` and the span. Numeric before/after values are untruncated within the numeric-token limit.

JSON Pointer follows RFC 6901 escapes (~ becomes ~0; / becomes ~1). The root pointer is the empty string. Pointer alone is ambiguous for duplicates. `occurrence` identifies a key's one-based occurrence in its own containing object; an array item gets 1. Distinct ancestors can share pointer/occurrence. The `id` and source span uniquely identify the finding within that report.

`survives` is false for overwritten occurrences. Other findings apply to surviving numeric nodes. Source offsets index JavaScript UTF-16 code units, zero-based with an exclusive end; line/column are one-based, with column measured in UTF-16 code units. LF advances the line; CR-only input is counted as a column character for display. Offsets remain authoritative for every accepted JSON string.

## Strict acceptance and limits

No comments, trailing commas, NaN, Infinity literals, leading +, leading-zero numbers, invalid escapes, or unescaped control characters. An overflowing numeric token such as `1e400` is valid JSON. Empty input is invalid. Escaped/unescaped unpaired surrogates in JavaScript strings follow native JSON.parse behavior. File/CLI byte input is decoded with a fatal UTF-8 decoder, rejecting invalid byte sequences, and preserves a BOM so the strict JSON parser rejects it. JavaScript string API input has no byte-encoding provenance; its byte count uses TextEncoder semantics.

Limits: 1,048,576 UTF-8 bytes; 60,000 punctuation/literal/key/value tokens; 20,000 total object properties and array items; nesting depth 128 (root has depth 0, each contained value adds one); 4,096 characters in a numeric token. Any budget failure stops analysis before parsing the full source with JSON.parse. For a source string already longer than the byte budget in UTF-16 units, `stats.bytes` is a bounded prefix byte count (a lower bound); no full encoding is allocated. Normal accepted inputs have an exact byte count.

Failed input has `valid: false`, `output: null`, empty findings, and a structured error. A resource cap is not a syntax judgment. Parser acceptance is compared with native JSON for the supported, valid-UTF8, within-budget corpus; over-limit corpus cases and invalid bytes are explicitly separate.

## Exports

Diagnostic schema `1.0` is JSON with source, native pretty output, ordered findings, stats, limits, and optional error. No timestamp or filename is included. Findings are source-ordered. HTML is standalone, escaped, contains no executable script, and denies external resources via CSP. Reproducers encode every source UTF-16 code unit as a Unicode escape inside a string literal; execution applies only native JSON.parse/stringify. Original JSON is never evaluated as JavaScript.

These files can expose input data when shared. This is an evidence tool, not a data-exfiltration scanner, schema validator, or automatic remediation engine.
