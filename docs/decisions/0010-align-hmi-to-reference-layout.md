# Decision: Align The HMI To The Reference Layout (Redesign Before Deployment)

Date: 2026-06-16

## Status

Accepted (operator direction after comparing the running app against the reference prototype).

## Context

The merged app is functional and contract-correct but its screen layout diverges from the reference prototype at `D:\dev\TwinCAT Scratch Pad\ADSTest` (mockups in `SVGLayout\*.png`). After a side-by-side comparison, the operator confirmed the reference is the target layout, with specific adjustments.

## Decision

Redesign the screens to the reference layout **before** the deployment phases (Service Deployment / TF1200 / trial). The per-station recipe parameters in the reference screens already exist in the retrofit PLC, so this is a contract-mapping job, not a PLC-addition one.

### Recipe screens — adopt the Gluing/Forming layout
- Header: recipe name field + `Select` dropdown + save/cancel icons.
- Body: two-column groups of **Start/Stop ms** parameter fields.
- **Station sub-nav** (reference: glue heads `LH3 LH2 LH1 RH1 RH2 RH3`; recipe tabs `Blank Drive / Blank Picker / Blank Puller / Gluing / Forming`), paged with the `‹ ›` arrows. Only the tabs/stations applicable to the retrofit are kept.
- **Forming:** same layout but **drop the positional setpoints** (the "Start Position / Counts" field).
- All station/parameter **names map to the retrofit PLC symbols**, not the reference placeholders.

### Main page
- Show **machine state** (the retrofit has only a few states) and **tray demand**.
- A **header bar with menu** and a **footer bar with state / event status**.
- **No machine animation** (the reference front-screen animation is dropped).

### Out of scope / dropped
- The machine animation on the front screen.
- Reference screens/tabs that do not apply to the retrofit.
- Forming positional setpoints.

## Source-of-truth rules (unchanged)
- New recipe/state/tray-demand symbols are derived from the committed PLC source and pinned `.tmc` (decision 0004), with direction/type/bounds from source — not guessed. Same discipline as Machine Contract Inventory.
- Adopt visuals only; never the reference's raw-symbol data layer or `SymbolBrowser` (decision 0008). All bindings go through contract keys and the gateway.

## Consequences
- The plan gains three phases before Service Deployment: **Reference Recipe Parameter Contract Extension**, **Main Page Redesign**, and **Recipe Screen Redesign**. Service Deployment now depends on the redesign.
- The contract extension is a prerequisite: the Glue/Forming param screens and tray-demand main page cannot be built until those symbols are mapped into `machine-contract.json` and validated against the pinned `.tmc`.

## Rules Out
- Deploying the current layout to the TF1200 as the final operator UI.
- Building the Glue/Forming screens against invented or placeholder parameter names.
- Carrying the machine animation or Forming positional setpoints into the retrofit HMI.
