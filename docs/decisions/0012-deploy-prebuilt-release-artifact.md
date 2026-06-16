# Decision: Deploy A Pre-Built Release Artifact, Not An On-Device Build Chain

Date: 2026-06-16

## Status

Accepted (operator direction for the next CX test stage).

## Context

The CX9240 should not run the full dev toolchain to serve the HMI. A normal `npm ci` pulls `vite`, `svelte`, `svelte-check`, `vitest`, `@playwright/test`, `jsdom`, `prettier`, etc., and `npm run build` runs Vite — heavy and slow on the controller. The runtime only needs Node plus a small static-serving gateway.

Runtime footprint (what `server.js` actually uses):

```text
dist/                              (built static app)
server.js
src/lib/contractRuntime.js         (imported by server.js)
src/lib/machine-contract.json      (read by server.js)
runtime deps: ads-client, ws       (only these two)
```

`@lucide/svelte` is build-only — it is bundled into `dist/` and never imported by `server.js`; it is currently miscategorized under `dependencies` and should move to `devDependencies` so a production install stays lean.

## Decision

The CX is deployed from a **pre-built release artifact**, not by building on the device. A packaging step produces a self-contained bundle that runs with only Node present — no Vite, no dev dependencies, no build step on the controller.

The bundle contains: `dist/`, `server.js`, `src/lib/contractRuntime.js`, `src/lib/machine-contract.json`, a runtime-only `package.json` (deps: `ads-client`, `ws`), production `node_modules` (or a documented `npm ci --omit=dev` against the trimmed manifest), the `systemd/sveltehmi.service` unit, and a short run/rollback note.

The bundle must stay OS-portable (Windows + Linux per decision 0007); the runtime deps are pure JS, so a single bundle works on the CX (Linux) and a Windows test host.

## Consequences

- A `Release Packaging` phase is added before Service Deployment; Service Deployment installs and supervises the artifact rather than building from source on the CX.
- The build/test toolchain stays in this repo and runs on dev/CI machines only; the controller receives only the artifact.
- Move `@lucide/svelte` to `devDependencies` so the runtime install is just `ads-client` + `ws`.

## Future direction (not this phase)

Once the design is settled and the deployed app is built, the operator intends to split the deployable app into a **separate git repository**. This decision keeps the packaging boundary clean (a self-contained artifact) so that split is straightforward later. No repo split happens yet.

## Rules Out

- Running `npm ci` (full) or `vite build` on the CX as part of normal deployment.
- Shipping dev dependencies or the test/build toolchain to the controller.
- Baking machine-specific absolute paths into the artifact (it must run wherever Node + the ADS env are present).
