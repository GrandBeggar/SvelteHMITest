# SvelteHMI Project Plan

This plan follows the planner / implementer / auditor loop from `projectrolloutbootstrap.md`.

## Current Proven Baseline

- The repo builds and smokes locally with `npm run build` and `npm run smoke`.
- The CX9240 served the SvelteHMI mock app on `PORT=3001`.
- The CX9240 ADS bridge connected to PLC runtime `851` using the LAN route identity:
  - `ADS_TARGET_AMS=5.168.37.183.1.1`
  - `ADS_ROUTER_ADDRESS=192.168.1.100`
  - `ADS_LOCAL_ADDRESS=192.168.1.100`
  - `ADS_LOCAL_AMS=192.168.1.100.1.1`
  - `ADS_LOCAL_PORT=32750`
- Read, subscribe, and guarded write paths worked against the live PLC.
- The first write test changed `MF.HMI.nPatternIndex` from `2` to `1`.
- Existing TF1200/TF2000 operation and machine running were not impacted.
- Cleanup remains on the CX: remove the temporary incorrect `LocalNodeGateway` loopback route if still present.
- Planning redirect from `docs/audits/2026-06-14-plan-cross-review.md`: the PLC source tree that contains the proven symbols is dirty and must be committed before it can be used as the HMI contract authority.

## Full Gate

Until the gate-harness phase adds missing scripts, the full gate is:

```sh
npm ci
npm run build
npm run smoke
```

After the gate-harness phase, the full gate becomes:

```sh
npm ci
npm run check
npm run lint
npm test
npm run build
npm run smoke
```

Each phase may add a stricter phase-specific gate. The auditor must run the full gate from a clean checkout of the phase branch, then run the phase-specific gate.

## Phase: Gate Harness

Goal: add the project checks that make later phases auditable instead of vibes-based.

Depends on: none.

Brief:
- Add Svelte checking, lint/format policy, and a test runner.
- Add at least one component/store test and one server smoke/health test.
- Keep the scripts lightweight enough to run on the laptop and optionally on the CX.

DoD:
- `npm run check` exists and passes.
- `npm run lint` exists and passes.
- `npm test` exists and passes.
- `npm run build` passes.
- `npm run smoke` passes.
- Auditor verifies the scripts fail on a deliberate syntax/type/test failure in a scratch checkout or by inspecting that each script invokes a real tool, not a no-op.

## Phase: PLC Source Pin

Goal: create a clean, reviewable PLC source authority before any HMI contract work depends on it.

Depends on: none.

Brief:
- Commit the PLC project state that matches the symbols proven on the CX9240.
- Confirm whether the `Outputs.TcGVL` deletion and modified `MultiFormPLC.tmc` are intentional.
- Record the PLC repo path, variant SHAs, and authoritative `.tmc` artifacts in decision 0004.
- Re-run the cross-variant comparison only against clean committed trees.

DoD:
- All three relevant PLC variant trees are clean after commit.
- The 1054, 1270, and 1336 PLC commit SHAs that represent the contract symbol surface are recorded in `docs/decisions/0004-machine-contract-source.md`.
- The authoritative `MultiFormPLC.tmc` path and hash are recorded for each variant or the plan states why one artifact is sufficient.
- A fresh cross-variant diff of `GVLs/`, `DUTs/`, and `POUs/` is captured from the clean committed trees.
- If the clean cross-variant diff is identical, decision 0005 remains valid; if differences exist, they are recorded and decision 0005 is updated before Machine Contract Inventory begins.
- A command transcript or audit note shows `git status --short` is clean for each PLC source tree before contract extraction starts.
- Auditor verifies the recorded SHAs exist, all three source trees are clean, and the cross-variant comparison was run against those recorded SHAs.

## Phase: Machine Contract Inventory

Goal: turn PLC/HMI symbol use into a reviewed contract before building the operator UI.

Depends on: Gate Harness, PLC Source Pin.

Brief:
- Extract the current TF2000-facing symbols and the retrofit PLC symbols needed by the first production app from the committed PLC source and pinned `.tmc`.
- Classify every symbol by page, read/write direction, update rate, type, safety level, and write confirmation requirement.
- Keep mock values adjacent to the contract, but do not let mock-only symbols count as contract proof.
- Treat `src/lib/connections.js` as a commissioning subset only until this phase replaces it with the contract-backed map.
- Use one symbol contract across 1054/1270/1336 unless the clean committed comparison contradicts decision 0005.

DoD:
- A machine contract file exists in the repo, either generated or manually curated.
- The contract contains no direct duplicate symbol names with conflicting type/direction metadata.
- A contract validation script exists and passes against the contract, running hermetically against repo-committed fixtures only.
- The committed gate does not read live PLC directories or require the pinned `MultiFormPLC.tmc` on disk; any contract-vs-artifact check uses a committed copy or symbol export (see decision 0007). Live PLC/ADS validation is deferred to operator-led app testing.
- Direction is derived from PLC source/artifact metadata, not guessed from HMI naming.
- Validator rejects marking any `AT %I*` symbol writable, including the known trap `ST_HMI.bStepEnable`.
- Contract captures PLC scalar/enum types such as `BOOL`, `INT`, `UINT`, `UDINT`, `REAL`, `E_RecipeCommand`, `E_ForceMode`, and `E_ForceStatus`.
- Bounds are sourced from PLC constants such as `C.nPATTERN_COUNT` and `C.nRECIPE_MAX_COUNT`, not duplicated manually in JS.
- At least the already-proven symbols from `src/lib/connections.js` are represented.
- Recipe command symbols `MF.HMI.Recipe.eCommand`, `MF.HMI.Recipe.nSelectedIndex`, `MF.HMI.Recipe.nActiveIndex`, and `MF.HMI.Recipe.bHasUnsavedChanges` are represented with correct direction.
- Coil symbols are represented as readback via `MF.Coils.<coil>.bOut` / `MF.Coils.<coil>.eStatus` and force writes via `MF.Coils.<coil>.eForce`.
- Auditor verifies at least one captured PLC symbol proof (committed fixture) is used, not only mock data; live ADS proof is deferred to operator-led app testing per decision 0007.

## Phase: Gateway Contract Layer

Goal: make the Node gateway enforce the HMI contract instead of passing arbitrary browser symbol strings to ADS.

Depends on: Machine Contract Inventory.

Brief:
- Replace ad hoc browser symbol access with contract-key access.
- Keep the JSON WebSocket protocol small, but move from raw symbol strings to stable HMI keys where practical.
- Type/coerce write values at the gateway before ADS writes.
- Fail loud on unknown keys, wrong write direction, stale ADS state, and malformed values.

DoD:
- Browser requests cannot write symbols that are not declared writable in the contract.
- Browser requests cannot subscribe/read unknown contract keys.
- Gateway tests cover unknown key, read-only write attempt, malformed value, ADS offline, and successful read/write.
- `npm test`, `npm run build`, and `npm run smoke` pass.
- Auditor verifies the old arbitrary-symbol write path is removed or fail-loud, not left as a fallback.

## Phase: HMI Shell

Goal: replace the commissioning panel with the real operator shell.

Depends on: Gateway Contract Layer.

Brief:
- Build the first real app frame for TF1200: top status bar, persistent machine state, navigation, alarm/status strip, gateway/ADS status, and page outlet.
- The first screen should be the usable overview/run screen, not a landing page.
- Keep layout touch-friendly and stable at the TF1200 display size and laptop browser sizes.

DoD:
- App has a shell with named navigation targets.
- The overview/run screen renders from contract-backed store values.
- Gateway disconnected and ADS disconnected states are visible and non-overlapping.
- Playwright or equivalent browser test verifies the shell at desktop and TF1200-sized viewport.
- `npm run build` and the full gate pass.
- Auditor verifies no text overlaps at the target viewport and no UI depends on mock-only symbols.

## Phase: Design System Foundation

Goal: establish the shared ISA-101 visual substrate (tokens + core touch components) so screen phases are built on it once, per decision 0008.

Depends on: HMI Shell.

Brief:
- Port the `--kita-*` token system and ISA-101 chip palette from the reference into `app.css`.
- Port the core touch components presentation-only, re-wired to contract keys: `NumPad`, `Keyboard`, `Modal`/`ConfirmDialog`, `StateMachineChip`, `StatusBanner`, `ParamInput`/`ParamRow`.
- Do not import the reference data layer (`connections.js` raw symbols, `SymbolBrowser`, reference `ads.svelte.js`).
- Standardize on the dark palette; leave unfinished reference screens (e.g. Settings layout) out of scope.

DoD:
- Token system lives in `app.css`; components reference `--kita-*` tokens, no hard-coded colors (lint/grep check).
- Ported components carry no raw ADS symbol strings; any data binding is via contract keys through the gateway store.
- `StateMachineChip` renders each ISA-101 state from a contract-backed value, not an invented state.
- Component tests cover `NumPad` entry/accept/cancel and chip state-to-class mapping.
- Browser/viewport test (per HMI Shell precedent) confirms no overflow at desktop and TF1200 with the new components mounted.
- Full gate passes.
- Auditor verifies no ported component reaches ADS without a contract key, and no `SymbolBrowser`/raw-symbol path was introduced.

## Phase: Overview And Run Screen

Goal: build the operator's primary running view.

Depends on: HMI Shell, Design System Foundation.

Brief:
- Show machine readiness, safety/control-power state, cycle/start state, key sensors, selected/active recipe or pattern, and production counters.
- Keep writes off this screen unless they are normal operator actions with clear confirmation rules.

DoD:
- Overview values map to contract keys, not raw symbol strings in the component.
- The page handles ADS offline, stale values, and unknown/null values visibly.
- Tests cover at least normal, ADS offline, and stale/unknown data states.
- Auditor verifies the visible values correspond to real contract symbols.

## Phase: Recipe And Pattern Controls

Goal: implement retained recipe/pattern controls through the PLC recipe command protocol.

Depends on: Gateway Contract Layer, HMI Shell, Design System Foundation.

Brief:
- Implement selected recipe and pattern index controls.
- Model recipe actions as a command handshake: select index, issue `E_RecipeCommand.Load` / `Save` / `Discard`, then confirm via `nActiveIndex` and `bHasUnsavedChanges`.
- Require confirmation for retained/operator-state writes.
- Show current value, pending value, write success, write failure, and restore path.

DoD:
- Writes are blocked unless the contract marks the key writable.
- Numeric bounds are enforced in UI and gateway.
- Recipe load tests verify `nSelectedIndex` alone is insufficient; a load command is required and success is confirmed by `nActiveIndex`.
- Save/discard tests verify `bHasUnsavedChanges` behavior where the PLC contract supports it.
- Tests cover valid command, out-of-range selected index, ADS rejected command, and ADS drop during pending command.
- Live CX validation repeats the proven pattern write with original value recorded and restored.
- Auditor verifies there is no unguarded direct ADS write path.

## Phase: Manual And IO Diagnostics

Goal: provide service diagnostics without turning diagnostics into normal operator controls.

Depends on: Gateway Contract Layer, HMI Shell, Design System Foundation.

Brief:
- Build read-first IO diagnostics for inputs, outputs, and service metrics.
- Bind coil readback to `MF.Coils.<coil>.bOut` and `MF.Coils.<coil>.eStatus`.
- Bind coil force controls only to `MF.Coils.<coil>.eForce`, never to `%Q*` output member `.bOut`.
- Any output/manual write must be service-gated and clearly separated from passive diagnostics.

DoD:
- Diagnostic subscriptions are active only while the diagnostics view is visible or explicitly pinned.
- High-rate values are not subscribed globally.
- Tests verify entering/leaving the page sends expected subscribe/unsubscribe intent or equivalent gateway behavior.
- Any write on this page has explicit service gating and gateway enforcement.
- Tests cover forcing a coil on, forcing it off, returning to auto, ADS rejected force write, and ADS drop while a force is active.
- Auditor verifies no code path writes `MF.Coils.*.bOut`.

## Phase: Alarm And Event Surface

Goal: show actionable machine state and faults without inventing unsupported alarm semantics.

Depends on: Machine Contract Inventory, HMI Shell, Design System Foundation.

Brief:
- Use existing PLC alarm/status symbols if available.
- If PLC alarm contract is insufficient, document the gap and proposed PLC additions instead of faking an alarm system in the UI.

DoD:
- Alarm/event display is backed by real contract symbols or a documented PLC-gap decision.
- Tests cover no alarm, active alarm, ADS offline, and stale alarm data.
- Auditor verifies the UI does not imply reset/ack behavior that the PLC contract does not support.

## Phase: Service Deployment

Goal: move from manual `nohup` testing to a reversible supervised service.

Depends on: Gateway Contract Layer, HMI Shell, Overview And Run Screen.

Brief:
- Install `systemd/sveltehmi.service` with the working ADS LAN route environment.
- Keep TF2000 installed.
- Do not change TF1200 `startUrl` in this phase.

DoD:
- `systemctl status sveltehmi` reports active after reboot or service restart.
- `/api/health` reports `mode:"ads"` and `ads:true`.
- Logs show ADS reconnect behavior after `TcSystemServiceUm` restart.
- Rollback command is documented and tested.
- Auditor verifies TF2000 remains installed and active.

## Phase: TF1200 StartUrl Trial

Goal: prove TF1200 can render the SvelteHMI app locally with a reversible redirect.

Depends on: Service Deployment.

Brief:
- Back up the existing TF1200 config.
- Change only the UI client start URL to `http://localhost:3001`.
- Verify local display, touch/mouse input, fullscreen behavior, and rollback.

DoD:
- Original TF1200 start URL is recorded in the repo or site notes.
- Config backup exists on the CX.
- TF1200 displays the SvelteHMI shell from `localhost:3001`.
- Rollback to original TF2000 URL is tested.
- Auditor verifies no TF2000 uninstall/disable was required.

## Phase: Supervised Production Trial

Goal: run the SvelteHMI alongside the machine long enough to discover operational issues.

Depends on: TF1200 StartUrl Trial, Recipe And Pattern Controls, Manual And IO Diagnostics, Alarm And Event Surface.

Brief:
- Run a timed supervised trial while recording gateway logs, ADS reconnects, UI responsiveness, operator workflow gaps, and PLC/HMI contract gaps.

DoD:
- Trial duration and machine conditions are recorded.
- No unresolved critical ADS/gateway/UI errors occurred, or each error has a filed follow-up.
- Operator workflow gaps are captured as issues or plan updates.
- Any PLC contract additions are documented as decisions before implementation.
