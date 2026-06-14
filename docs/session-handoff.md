# Session Handoff

This repo was created from the Codex desktop thread for the CX9240 SvelteHMI rollout test.

## Repo

- GitHub: <https://github.com/GrandBeggar/SvelteHMITest>
- Owner: `GrandBeggar`
- Branch: `main`
- Local source path during setup: `D:\dev\TwinCAT\SvelteHMI`

## Current Goal

Prove a Svelte + Node HMI can run alongside the existing Beckhoff TF1200/TF2000 stack on a CX9240 without disturbing the production HMI path.

The test app:

- Serves a Svelte SPA from a Node process on port `3001`.
- Exposes a JSON WebSocket bridge at `/api/ws`.
- Supports `HMI_MODE=mock` for network/kiosk/display testing.
- Supports `HMI_MODE=ads` for live TwinCAT ADS read/write/subscribe testing.
- Uses existing retrofit PLC symbols rather than temporary test PLC tags.

## Target System Notes

Expected CX9240 baseline from prior commissioning notes:

- Beckhoff RT Linux on Debian 13 "Trixie"
- arm64 / AArch64, CX9240 Cortex-A53
- Kernel observed as `6.17.7-rt5-bhf1`
- Beckhoff package markers: `bhf-meta-default`, `bhfinfo`, `os-release-bhf`
- Repos observed as `trixie-stable`

Important deployment rule:

- Install Node dependencies on the CX itself.
- Do not copy Windows `node_modules` to Linux.

## Existing HMI Risk Posture

Initial testing should be reversible:

- Leave TF2000 running.
- Leave TF1200 pointed at TF2000 until laptop/browser tests pass.
- Run SvelteHMI separately on `PORT=3001`.
- Use `HMI_MODE=mock` first.
- Use `HMI_MODE=ads` read-only values next.
- Only then optionally change TF1200 `startUrl` to `http://localhost:3001`.

Rollback is stopping the Node server and restoring the original TF1200 `startUrl` if it was changed.

## Key Files

- `README.md`: quick start.
- `docs/CX9240-rollout.md`: onsite rollout steps.
- `docs/architecture.md`: architecture and load-reduction notes.
- `src/lib/connections.js`: retrofit PLC symbol map.
- `server.js`: Node static server + WebSocket/ADS gateway.
- `scripts/cx-first-run.sh`: helper for CX first run.
- `systemd/sveltehmi.service`: later service template, not needed for first reversible tests.

## Laptop Clone

On the second machine:

```sh
git clone https://github.com/GrandBeggar/SvelteHMITest.git
cd SvelteHMITest
npm ci
npm run build
npm run smoke
```

Run local mock mode:

```sh
HMI_MODE=mock PORT=3001 node server.js
```

Open:

```text
http://localhost:3001
```

## CX First Run

On the CX:

```sh
cd /opt
git clone https://github.com/GrandBeggar/SvelteHMITest.git sveltehmi
cd /opt/sveltehmi
npm ci
npm run build
npm run smoke
HMI_MODE=mock PORT=3001 node server.js
```

Then from the laptop on the machine network:

```text
http://192.168.1.100:3001
```

Switch to ADS mode only after mock mode works:

```sh
HMI_MODE=ads ADS_TARGET_AMS=127.0.0.1.1.1 ADS_TARGET_PORT=851 PORT=3001 node server.js
```

## Notes For Final HMI

Potential PLC additions after the test stack is proven:

- HMI heartbeat/watchdog counter.
- HMI connected/session-active flag.
- PLC build/version string exposed for HMI display.
- Explicit command handshake fields for safety-sensitive actions.

The test does not require these tags.
