# Durable Architecture Notes

The previous TF2000 rollout is useful history, but it should not lock this project into the same shape. For the retrofit SvelteHMI, the durable boundary is:

```text
Svelte UI -> JSON WebSocket protocol -> Node gateway -> ADS driver -> TwinCAT runtime
```

The UI should never import ADS-specific code. It should only know the gateway protocol and the current machine symbol map. That keeps the front end testable in mock mode and lets the gateway change underneath it if ADS routing, secure ADS, or deployment constraints force a different implementation.

## Decisions For The Test App

- Serve static `dist/` and `/api/ws` from one Node process.
- Preload the built `dist/` assets into Node memory at startup. The app is small, and this avoids repeated disk reads on the CX.
- Install dependencies and build on the CX for field testing so the dependency tree is Linux/ARM-compatible.
- Keep `HMI_MODE=mock` as a first-class mode for kiosk/display/network tests.
- Use `HMI_MODE=ads` only when testing live PLC access.
- Keep the browser protocol small: subscribe, read, write, status, value, error.
- Keep symbol names behind `src/lib/connections.js` until the machine-variant config is known.
- Use existing retrofit PLC symbols for rollout tests. Do not add temporary PLC tags just to prove the web stack.

## Things We Can Still Rethink

- Whether final machine maps live in JS, JSON, or are generated from PLC/TMC exports.
- Whether the gateway should stay Node or move to a smaller service if secure ADS becomes painful.
- Whether auth is needed at the gateway level for customer networks.
- Whether trends/history belong in this process or in a separate data logger.
- Whether 1054, 1270, and 1336 should be selected by env var, config file, or build artifact.
- Whether final HMI service tags should be added to the PLC contract after the stack is proven.

## Load-Reduction Plan

The final HMI should optimize for the CX and the TF1200 Chromium client, not just for laptop development.

- Keep the HMI as a small static SPA. For a few pages, prefer static imports so the full UI is loaded once instead of doing route-time dynamic imports.
- Serve built assets from memory in the Node gateway. This is already done in `server.js`.
- Keep one browser WebSocket connection and one ADS gateway process.
- Keep values reactive through a central symbol store. Page components should render from the store, not open their own ADS/WebSocket paths.
- Split subscriptions into rates/classes:
  - global status/safety: always subscribed, moderate rate.
  - visible page values: subscribed while the page is active.
  - diagnostics/trends/high-rate motion values: subscribed only when visible or explicitly requested.
- Use ADS notifications, not browser polling.
- Coalesce browser updates where needed. If many symbols update fast, the gateway can batch value messages every 50-100 ms while preserving reactivity at the UI store.
- Avoid heavy animations, large charts, and layout churn on the TF1200 client. The client-side Chromium process is likely the bigger CPU consumer than the Node server.
- Prefer primitive symbol reads for frequently changing values. Read large structs only when the whole struct is actually needed.

## Commissioning Test Ladder

1. **Mock server on laptop:** UI and gateway protocol work without PLC.
2. **Mock server on CX:** Node runtime, static serving, network access, and kiosk rendering work.
3. **ADS server on laptop:** gateway can reach a PLC over the network if routes allow it.
4. **ADS server on CX:** local ADS path works without laptop routing assumptions.
5. **TF1200 startUrl swap:** existing compositor/client renders this app.
6. **Real symbol map:** replace test symbols with retrofit map and verify write safety one subsystem at a time.

## Gateway Safety Rules

- Subscriptions are notification-based by default.
- ADS reconnect must recreate subscription handles; stale handles are discarded.
- Writes should eventually carry metadata for operator action, confirmation level, and expected type.
- The final HMI should fail visibly when the gateway is online but ADS is offline.
- The final HMI should avoid native Node modules unless the deployment process explicitly handles CX architecture builds.

## Linux Target Notes

The target PLC TMC for the customer CX is ARMV8-A. The production runtime path should stay friendly to that:

- Copy project source from the laptop without `node_modules/` or `dist/`.
- Run `npm ci` on the CX.
- Build Svelte/Vite on the CX with `npm run build`.
- Avoid relying on a Windows-built `node_modules` directory.
- Keep runtime dependencies pure JS unless there is a deliberate cross-architecture packaging step.
