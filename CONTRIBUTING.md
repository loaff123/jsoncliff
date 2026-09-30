# Contributing

Use Node.js 22 or 24 and `npm ci`. Run `npm test`, `npm run check`, and `npm run test:package` before proposing a change. The package smoke test creates a tarball, installs it in a temporary directory without fetching dependencies, invokes its actual executable, and imports its ESM API.

Add a regression fixture before changing number semantics or parser behavior. For numerical bugs provide the original number token, expected native output, and expected category. Do not report ordinary binary approximation as corruption if the decimal text survives.

Use synthetic payloads only. Never commit credentials, personal data, local absolute paths, generated exports from real payloads, or node_modules. Changes to report shape need schema-compatibility consideration. Keep UI imports local and offline-compatible.

Optional external corpus check:

```sh
git clone https://github.com/nst/JSONTestSuite.git /tmp/JSONTestSuite
node scripts/corpus-check.mjs /tmp/JSONTestSuite/test_parsing
```

The corpus has its own MIT license. It is not vendored in this project. Record the exact corpus commit, runtime, compared count, invalid-UTF8 rejections, and limit rejections; do not call a filtered result complete RFC conformance.

Public source is maintained on GitHub. Keep `private: true` to prevent accidental npm registry publication; a registry release needs separate maintainer approval.
