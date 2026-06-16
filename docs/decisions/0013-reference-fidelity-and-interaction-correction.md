# Decision: Match The Live Reference App, Correct The Interaction Model And Resolution

Date: 2026-06-16

## Status

Accepted (operator review of the running app).

## Context

The redesign (decisions 0010/0011, PRs #14/#15) followed the static `SVGLayout/*.png` mockups instead of the **live reference app** (`D:\dev\TwinCAT Scratch Pad\ADSTest\hmi`), which is a cleaner, more minimalist dark design. Results: look/feel drifts page to page (no standardized components), the recipe/glue screen is messy, every button press raises a confirmation prompt, and the layout targets the wrong resolution.

## Decision

### Visual fidelity
- Copy the **live reference app's** minimalist layout and styling, not the mockups. Port its actual components and reuse them across every page so the look/feel is consistent: header menu + status dot, optional alert banner, `RecipeHeader` (name + Select + save/cancel icons), `SubNavButton` station tabs, `ParamRow`/`ParamInput`, and the compact footer status pills.
- Standardized components are mandatory — no per-page bespoke styling.

### Interaction model (remove over-prompting)
- **No per-action confirmation dialogs.** The only recipe commit surface is **Save / Cancel** (maps to `E_RecipeCommand.Save` / `Discard`); parameters are edited freely and `bHasUnsavedChanges` drives the Save/Cancel state. No per-field confirm.
- **Manual (Diagnostics) controls are ungated and direct** — no Service Enable gate, no confirm modal (operator standard practice).
- **Glue gun controls are momentary** (press-and-hold): force on while held, return to Auto/Off on release, so a gun cannot be left forced by a single tap.

### Resolution
- Retrofit panels (this app) target **800x480**, fixed resolution, **no scrollbars** — content must fit the viewport (use compact density and the station tab / `‹ ›` paging; the reference itself scrolls at 800x480 and we must not).
- KITA MultiForm (future, separate app) targets **1024x600** — busier panel with more state machines, settings, and servo parameters. Not in scope now; recorded so component/layout choices stay compatible.
- Viewport tests retarget to 800x480 and assert no horizontal **or vertical** overflow (no scrollbars).

## Safety invariants (unchanged — UX change only)

Removing UI gates and prompts does **not** relax any contract/gateway guarantee. These remain and the auditor will re-verify them on the rework:

- All writes route through the gateway contract write-guard; the browser cannot write undeclared or read-only keys.
- Coil force writes `MF.Coils.<coil>.eForce` only; no code path writes `.out` / `.bOut`.
- Type and bounds coercion at the gateway; stale/offline/unknown value handling preserved.

## Consequences

- A corrective rework precedes Release Packaging. It supersedes the mockup-following UX of the merged Main Page / Recipe / Diagnostics work (the Service Enable gate and per-action confirms are removed; the recipe screen is rebuilt to the live layout).
- Decisions 0010/0011 stand for *which* contract symbols and screens exist; this decision overrides *how they look and behave*.

## Rules Out

- Following the `SVGLayout` mockups as the visual source.
- Per-action confirmation dialogs anywhere except recipe Save/Cancel.
- Targeting 1024x768 / 1280x720 for the retrofit, or any scrollbar at the fixed panel resolution.
- Removing the gateway write-guard, the `.eForce`-only rule, or bounds/stale handling as part of "removing gates".
