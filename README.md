# SvelteHMI

Small Svelte + Node gateway scaffold for testing a TF2000 replacement path on TwinCAT systems while keeping the TF1200 kiosk/browser layer. The old rollout is treated as context, not a fixed architecture; see `docs/architecture.md`.

## Local Run

```powershell
npm install
npm run build
$env:HMI_MODE="mock"; npm run serve
```

Open `http://localhost:3001`. On the CX9240, use `http://192.168.1.100:3001` from the laptop once the server is running and the interface address is correct.

## ADS Mode

```powershell
$env:HMI_MODE="ads"
$env:ADS_TARGET_AMS="127.0.0.1.1.1"
$env:ADS_TARGET_PORT="851"
npm run serve
```

Useful optional settings:

- `PORT`: HTTP/WebSocket server port, default `3001`
- `ADS_ROUTER_ADDRESS`: router or PLC IP when not connecting locally
- `ADS_ROUTER_TCP_PORT`: ADS router TCP port, default from `ads-client`
- `ADS_LOCAL_AMS`: local AMS NetId when connecting without a local router
- `ADS_LOCAL_PORT`: local ADS port
- `ADS_TIMEOUT_MS`: ADS command timeout, default `5000`
- `ADS_RECONNECT_MS`: reconnect interval, default `3000`

The browser protocol is intentionally small JSON over `/api/ws`:

- `{ "type": "subscribe", "symbol": "MAIN.Symbol", "cycleTime": 250 }`
- `{ "type": "read", "symbol": "MAIN.Symbol" }`
- `{ "type": "write", "symbol": "MAIN.Symbol", "value": 123 }`

## Install/Build On CX

For the CX9240 rollout, install Node and dependencies on the CX itself. Do not copy a Windows `node_modules` folder to the Linux target.

Preferred transfer is git clone/pull or a git bundle. The CX needs `git`; `gh` is optional. Copy the project source to `/opt/sveltehmi`, excluding `node_modules/` and `dist/`, then run on the CX:

```sh
cd /opt/sveltehmi
npm ci
npm run build
npm run smoke
```

The helper script wraps those first-run steps:

```sh
chmod +x scripts/cx-first-run.sh
HMI_MODE=mock PORT=3001 APP_DIR=/opt/sveltehmi scripts/cx-first-run.sh
```

For the first test, run in mock mode:

```sh
cd /opt/sveltehmi
HMI_MODE=mock PORT=3001 node server.js
```

Then switch to ADS mode:

```sh
HMI_MODE=ads ADS_TARGET_AMS=127.0.0.1.1.1 ADS_TARGET_PORT=851 PORT=3001 node server.js
```

## Current Intent

This is phase 1 commissioning scaffolding, not the final retrofit HMI. The first target is proving:

1. Node can run on the CX9240.
2. The Node server can be reached from the laptop over `192.168.1.100`.
3. TF1200 can render the Svelte app when its `startUrl` points at this server.
4. The Node gateway can read/write/subscribe to PLC symbols.

The commissioning screen now uses existing symbols from the retrofit `MultiFormPLC` project, so no temporary PLC tags are required for the first ADS test. Write checks are guarded in the UI and use existing `MF.HMI` fields.

For the Linux CX target, install dependencies and build on the CX. Avoid copying a Windows `node_modules` folder as the deployment artifact.

The Node gateway preloads the built Svelte assets into memory at startup. Live values remain reactive through the WebSocket/ADS symbol store; static preloading does not freeze PLC values.
