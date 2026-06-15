# CX9240 SvelteHMI Rollout

## Phase 0: Install Node On The CX9240

Goal: make the CX9240 build/run its own Linux ARM-compatible Node dependency tree. Do not copy `node_modules` from the Windows laptop.

Known target baseline from prior site notes:

- Beckhoff RT Linux on Debian 13 "Trixie"
- arm64 / AArch64, CX9240 Cortex-A53
- Kernel observed as `6.17.7-rt5-bhf1`
- Beckhoff package markers observed: `bhf-meta-default`, `bhfinfo`, `os-release-bhf`
- Repos observed as `trixie-stable`
- Minor `os-release-bhf` version drift may exist between units

1. SSH or open a local shell on the CX.

2. Confirm OS/CPU details:

   ```sh
   uname -a
   uname -m
   cat /etc/os-release
   ```

   Expected CPU is ARM64/AArch64 class. The retrofit TMC target is `TwinCAT OS (ARMV8-A)`. If the OS details differ from the known Debian 13/Trixie baseline above, pause before installing packages.

3. Check whether Node is already installed:

   ```sh
   node --version
   npm --version
   ```

4. If Node is missing, install Node.js LTS using the package/source appropriate for the Beckhoff OS image at site.

   Preferred order:

   - Debian/Beckhoff package manager if the configured `trixie-stable` repos provide a suitable Node.js LTS package.
   - Official Node.js Linux ARM64/AArch64 LTS binary tarball.
   - Site-approved offline package/tarball copied from the laptop.

   Avoid unofficial architecture builds unless there is no other option.

   Useful package-manager checks:

   ```sh
   apt-cache policy nodejs npm
   apt-cache madison nodejs
   ```

   If using apt:

   ```sh
   sudo apt update
   sudo apt install nodejs npm
   node --version
   npm --version
   ```

5. Install/check git tooling.

   Git is needed for the preferred rollout path. GitHub CLI (`gh`) is optional; install it only if you want authenticated GitHub operations from the CX instead of using a token, SSH key, or bundle.

   ```sh
   git --version
   gh --version
   ```

   If missing and apt packages are available:

   ```sh
   sudo apt update
   sudo apt install git
   ```

   Optional GitHub CLI check/install:

   ```sh
   apt-cache policy gh
   sudo apt install gh
   gh auth login
   ```

   If `gh` is not available in Beckhoff/Debian repos, skip it and use one of:

   - HTTPS clone with a GitHub token.
   - SSH clone with a deploy key.
   - Git bundle copied from the laptop.

6. Create the app directory:

   ```sh
   sudo mkdir -p /opt/sveltehmi
   sudo chown "$USER":"$USER" /opt/sveltehmi
   ```

7. Preferred transfer path: use git so the CX receives source, not Windows dependencies.

   If the CX has access to the repository:

   ```sh
   cd /opt
   git clone <repo-url> sveltehmi
   cd /opt/sveltehmi
   ```

   If the CX cannot reach the remote but can reach the laptop, use a temporary LAN git remote from the laptop or create a git bundle:

   ```powershell
   cd D:\dev\TwinCAT\SvelteHMI
   git bundle create sveltehmi.bundle --all
   ```

   Copy `sveltehmi.bundle` to the CX, then:

   ```sh
   cd /opt
   git clone /path/to/sveltehmi.bundle sveltehmi
   cd /opt/sveltehmi
   ```

   If this workspace is not in git yet, initialize it on the laptop before going onsite:

   ```powershell
   cd D:\dev\TwinCAT\SvelteHMI
   git init
   git add .
   git commit -m "Initial SvelteHMI rollout test"
   git bundle create sveltehmi.bundle --all
   ```

8. Manual copy fallback: copy the project source to `/opt/sveltehmi`, excluding Windows dependencies/build output:

   ```text
   copy these:
   package.json
   package-lock.json
   index.html
   server.js
   svelte.config.js
   vite.config.js
   src/
   docs/
   systemd/

   do not copy:
   node_modules/
   dist/
   ```

9. Install dependencies on the CX:

   ```sh
   cd /opt/sveltehmi
   npm ci
   ```

   This installs the Linux/ARM-compatible dependency tree on the CX. The current runtime dependencies are pure JS (`ads-client` and `ws`), but the build toolchain can still include platform-specific optional packages, so installing on the CX is the cleanest route.

10. Build on the CX:

   ```sh
   npm run build
   ```

11. Run the server smoke check:

   ```sh
   npm run smoke
   ```

   Or run the full first-run helper:

   ```sh
   chmod +x scripts/cx-first-run.sh
   HMI_MODE=mock PORT=3001 APP_DIR=/opt/sveltehmi scripts/cx-first-run.sh
   ```

If internet is poor on site, prepare an offline npm cache or package tarball ahead of time, but still install/extract it on the CX so the final dependency tree is Linux/ARM, not Windows.

## Phase 1: Roadblock Test

Goal: prove the CX can run a Node-served Svelte app and expose it over the machine intranet before touching the existing HMI setup.

This phase should not disturb the existing TF1200/TF2000 path. Run the SvelteHMI server manually on a separate port such as `3001`, leave TF2000 running on its existing ports, and do not change the TF1200 `startUrl` until the laptop/browser tests pass.

1. Run without ADS first:

   ```sh
   cd /opt/sveltehmi
   HMI_MODE=mock PORT=3001 node server.js
   ```

2. From the laptop on the wired connection, open:

   ```text
   http://192.168.1.100:3001
   ```

3. Confirm the page shows `Gateway` online and `mock` mode.

## Phase 2: ADS Bridge Test

1. Stop the mock server.

2. Start ADS mode locally on the CX:

   ```sh
   HMI_MODE=ads \
   ADS_TARGET_AMS=5.168.37.183.1.1 \
   ADS_TARGET_PORT=851 \
   ADS_ROUTER_ADDRESS=192.168.1.100 \
   ADS_LOCAL_ADDRESS=192.168.1.100 \
   ADS_LOCAL_AMS=192.168.1.100.1.1 \
   ADS_LOCAL_PORT=32750 \
   PORT=3001 \
   node server.js
   ```

3. Confirm the app shows `ADS` online.

4. If ADS does not connect, check:

   - PLC runtime is in RUN.
   - The target AMS NetId matches the local runtime. On the first CX9240 rollout unit, TwinCAT Shell reported `5.168.37.183.1.1`.
   - `/etc/TwinCAT/3.1/Target/StaticRoutes.xml` contains a non-secure local Node route for the CX LAN identity:

     ```xml
     <Route>
             <Name>LocalNodeGatewayLan</Name>
             <Address>192.168.1.100</Address>
             <NetId>192.168.1.100.1.1</NetId>
             <Type>TCP_IP</Type>
             <Flags>0</Flags>
     </Route>
     ```

     Reload routes with TwinCAT Config -> Run or `sudo systemctl restart TcSystemServiceUm` while the machine is in a safe state.
   - The PLC exposes the retrofit symbols listed in `src/lib/connections.js`.
   - Secure ADS requirements for this runtime. `ads-client` exposes standard AMS/TCP settings; secure ADS may require a different route/auth strategy.

5. Start with read-only symbols. Use the guarded write section only when the machine is in a known safe state. The current write test uses existing HMI-facing tags:

   - `MF.HMI.bDryCycleEnable`
   - `MF.HMI.Recipe.nSelectedIndex`
   - `MF.HMI.nPatternIndex`

   These are not motion outputs, but they can still change retained HMI/operator state. Record their original values before writing so they can be restored immediately.

## Phase 3: TF1200 Kiosk Test

Keep TF2000 installed and reversible for this test.

1. Find the TF1200 UI Client config that contains `startUrl`.
2. Record the original URL and make a timestamped copy of the config file.
3. Set `startUrl` to:

   ```text
   http://localhost:3001
   ```

4. Set `autoUpdateConfig` to `false` if the config has that option.
5. Restart the kiosk/session.
6. Confirm local display, touch/mouse input, and fullscreen behavior.

This step affects only what the local kiosk client displays. It does not replace the PLC runtime and does not need to stop TF2000. If the test fails, restore the original config and restart the kiosk/session.

## Phase 4: Service Install

Copy `systemd/sveltehmi.service` to `/etc/systemd/system/sveltehmi.service`, then adjust:

- `User`
- `WorkingDirectory`
- `ExecStart`
- ADS environment variables
- `After=` dependency if the TwinCAT runtime service name differs

Enable and start:

```sh
sudo systemctl daemon-reload
sudo systemctl enable sveltehmi
sudo systemctl start sveltehmi
sudo systemctl status sveltehmi
```

Watch logs:

```sh
journalctl -u sveltehmi -f
```

## Rollback

1. Stop the service:

   ```sh
   sudo systemctl stop sveltehmi
   ```

2. Put TF1200 `startUrl` back to the original TF2000 URL.
3. Restart the kiosk/session.

For today's tests, if the server was started manually instead of as a service, rollback is simply:

```sh
pkill -f "/opt/sveltehmi/server.js"
```

Then restore the original TF1200 config if it was changed.

If using git, rollback the test app source to the last known-good commit:

```sh
cd /opt/sveltehmi
git log --oneline -5
git checkout <known-good-commit>
npm ci
npm run build
```

## Risk Controls For Idle Production Testing

- Start with `HMI_MODE=mock`; this touches no ADS symbols.
- Run the Node server on port `3001`; this avoids TF2000's existing HTTP/HTTPS ports.
- Do read-only ADS validation before any write test.
- Do not stop or uninstall TF2000 during today's tests.
- Do not enable the `sveltehmi` systemd service until you are ready for a persistent test.
- Back up the TF1200 config before changing `startUrl`.
- Use guarded writes only for HMI-facing fields and restore original values afterward.
- Keep the original TF1200 URL available for immediate rollback.

## Notes For Final HMI

- Keep `src/lib/connections.js` as the IO map boundary for 1054, 1270, and 1336 variants.
- Add a machine-variant selector via environment/config instead of hard-coding retrofit differences into components.
- Keep PLC subscriptions notification-based. Polling should be reserved for low-rate diagnostics.
- Native Node modules should be avoided on the CX unless they are truly needed, because cross-architecture deployment gets more fragile.
- Preload/static-cache the small HMI build in the Node gateway and keep the browser app as a small SPA.
- Keep reactive values in a central store, but avoid subscribing every high-rate diagnostic value all the time. Subscribe global status continuously and page-specific/high-rate values only when visible.
- Consider adding final HMI service tags after testing, not before it:
  - HMI heartbeat/watchdog counter.
  - HMI connected/session-active flag.
  - PLC build/version string exposed for the HMI.
  - Explicit command handshake fields for safety-sensitive actions.
