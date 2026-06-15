# Implementer Handoff

Use this repo state as the source of truth. Also load the project rollout bootstrap before starting implementation.

## Roles

- Planner/coordinator: current planning thread.
- Implementer: fresh Codex instance on a phase branch.
- Auditor/gatekeeper: independent agent, currently Claude.
- Operator: Kevin.

The implementer must not gate its own work.

## Current Status

- CX9240 Node/Svelte/ADS proof succeeded.
- Mock mode, ADS read/subscribe, and one guarded write were proven onsite.
- Working ADS route details are recorded in `docs/decisions/0003-cx9240-ads-lan-route.md`.
- The temporary incorrect loopback route cleanup is recorded in `docs/CX9240-rollout.md`.
- The app plan is in `docs/plan.md`.
- Claude's plan audit is in `docs/audits/2026-06-14-plan-cross-review.md`.

## Start Here

First implementation phase:

```text
Phase: Gate Harness
Branch: phase/gate-harness
```

Do not start Machine Contract Inventory until `PLC Source Pin` is complete. The PLC source tree is currently known to be dirty and must be committed/pinned first.

## Gate Harness Scope

Add the missing project gate scripts and minimal tests:

- `npm run check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run smoke`

Keep the phase small. This phase is about installing a reliable verification harness, not redesigning the HMI.

Expected implementation work:

- Add Svelte checking.
- Add lint/format policy.
- Add a test runner.
- Add at least one browser/store/component test.
- Add at least one server smoke/health test.
- Update docs if the full gate commands change.

Avoid in this phase:

- Rewriting `src/lib/connections.js` into the final contract.
- Implementing recipe command logic.
- Implementing coil force controls.
- Touching PLC source.
- Installing `systemd` service changes on the CX.

## Important Planning Constraints

- `src/lib/connections.js` is currently a commissioning subset, not the production contract.
- Recipe is a PLC command protocol using `E_RecipeCommand`; `nSelectedIndex` alone is not a recipe load.
- Coil control must write `MF.Coils.<coil>.eForce` and read back `eStatus`/`bOut`; production HMI must not write `MF.Coils.*.bOut`.
- One symbol contract across 1054/1270/1336 is provisional until clean committed PLC trees prove the variants are identical at the GVL/DUT/POU layer.
- Contract direction/type/bounds must come from PLC source and pinned `.tmc`, not HMI guesses.

## Handoff Checklist

Before asking for an audit:

```sh
git status --short
npm ci
npm run check
npm run lint
npm test
npm run build
npm run smoke
git commit
```

The PR/commit message should name the phase and paste the phase DoD from `docs/plan.md`.

