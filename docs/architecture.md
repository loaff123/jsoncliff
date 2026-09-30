# Architecture

- `src/index.ts`: exported report types, fixed budgets, strict source scanner, exact-decimal normalizer, native-roundtrip analyzer, HTML/reproducer exporters
- `src/cli.ts`: bounded streaming file/stdin reader, strict UTF-8 decoding, deterministic formats and exit policy
- `web/app.ts`: DOM-only view; never parses source into UI markup; cancels stale asynchronous file imports; invalidates stale results on edit; renders 100 findings/page
- `web/style.css`: responsive workbench, system fonts, visible keyboard focus
- `scripts/standalone.mjs`: embeds built CSS/JS as a portable offline HTML app
- `tests/`: core, CLI, differential, and built-artifact DOM regression tests

The core has no runtime dependencies. TypeScript and Vite produce browser and Node builds. Happy DOM is test-only; its evaluation feature runs our own compiled application code, never input JSON. The hosted app serves static files and has no input endpoints. Native behavior comes from the browser or Node version executing it.

Limits bound syntax-tree size, traversal depth, exponent arithmetic, and DOM rendering. The scanner is a source-awareness layer, not a preservation parser. Production payload handling belongs to a parser/type strategy chosen by the application owner.
