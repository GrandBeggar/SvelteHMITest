# Implementer Handoff

Use this repo state as the source of truth. Also load the project rollout bootstrap before starting implementation.

## Roles

- Planner/coordinator: current planning thread.
- Implementer: fresh Codex instance on a phase branch.
- Auditor/gatekeeper: independent agent, currently Claude.
- Operator: Kevin.

The implementer must not gate its own work.

## How Gate Verdicts Reach You (read this first)

After you open a PR, the auditor posts a **PASS or REDIRECT** verdict as a comment on that PR, and records any blocking item under `Open Gate Redirects` below.

- Read the auditor verdict on your PR before treating a phase as done.
- A REDIRECT means the phase is **not accepted** and must not be merged until its named fix lands.
- Do not rely on a verbal "ok to proceed" — confirm against the PR verdict and the `Open Gate Redirects` list. (A prior REDIRECT was missed exactly this way.)

## Open Gate Redirects (blocking — clear before the next UI phase merges)

- **Committed browser/viewport test — REQUIRED.** Raised by the PR #4 (HMI Shell) and PR #6 (Design System Foundation) gates; operator decision 2026-06-15: **enforce**. The DoD calls for an automated browser test and only manual checks were done. jsdom does not count — it has no layout engine. Add a real browser test (Playwright or vitest browser mode) that:
  - loads the shell at 1280x720 and 1024x768,
  - asserts no horizontal overflow at both viewports,
  - asserts a nav target switches the page outlet.

  Backfill it for the existing shell, wire it into the gate, and keep it green for every later UI phase.

## Current Status

- Merged to main: Gate Harness, PLC Source Pin, Machine Contract Inventory, Gateway Contract Layer, HMI Shell.
- PR #6 Design System Foundation: gated **PASS on substance, pending the committed viewport test above**.
- The gateway enforces contract-key access; the browser never sends raw ADS symbols (Gateway Contract Layer / decision 0002).
- Design language: ISA-101 reference adopted per decision 0008; `--kita-*` tokens and core touch components (NumPad, Keyboard, Modal, ParamInput, StateMachineChip, StatusBanner) live in `src/`.
- CX9240 ADS route and field proof: decision 0003, `docs/CX9240-rollout.md`.
- Plan: `docs/plan.md`. Decisions: `docs/decisions/`.

## Start Here

```text
1. Land the required browser/viewport test (see Open Gate Redirects).
2. Phase: Overview And Run Screen   (depends on HMI Shell, Design System Foundation)
```

Build screen phases on the contract keys plus the design-system components. Use the matching reference screen in `D:\dev\TwinCAT Scratch Pad\ADSTest\SVGLayout` as the visual spec (decision 0008). Port visuals only — never the reference's raw-symbol data layer or `SymbolBrowser`.

## Important Planning Constraints

- `src/lib/connections.js` is a commissioning subset, not the production contract; the contract authority is `src/lib/machine-contract.json`.
- Recipe is a PLC command protocol using `E_RecipeCommand`; `nSelectedIndex` alone is not a recipe load (decision 0006).
- Coil control must write `MF.Coils.<coil>.eForce` and read back `eStatus`/`bOut`; production HMI must not write `MF.Coils.*.bOut`.
- One symbol contract across 1054/1270/1336 is provisional until clean committed PLC trees prove the variants identical at the GVL/DUT/POU layer (decision 0005).
- Contract direction/type/bounds come from PLC source and the pinned `.tmc`, not HMI guesses.
- Components must use `--kita-*` tokens (no hard-coded colors; `npm run design:tokens` enforces). Re-wire any ported component to contract keys, never raw ADS symbols.

## Handoff Checklist

Before asking for an audit:

```sh
git status --short
npm ci
npm run check
npm run lint
npm run design:tokens
npm test
npm run contract:validate
npm run build
npm run smoke
git commit
```

The PR/commit message should name the phase and paste the phase DoD from `docs/plan.md`. After opening the PR, wait for and read the auditor verdict; resolve any REDIRECT before the operator merges.
