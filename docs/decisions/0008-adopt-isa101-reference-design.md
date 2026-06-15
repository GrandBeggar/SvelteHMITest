# Decision: Adopt The KITA ISA-101 Reference Design Language

## Decision

The operator HMI adopts the visual design language prototyped in the scratch-pad test app as its target look and feel. The design is dark-surface, ISA-101-aligned, touch-first, and chip-based.

Adoption is **incremental, per screen phase** — not a big-bang redesign. A small `Design System Foundation` phase ports the shared substrate (tokens + core components) first; each subsequent screen phase is built on it and uses the matching reference screen as its visual spec.

## Reference Source (reference-only)

```text
App:         D:\dev\TwinCAT Scratch Pad\ADSTest\hmi
Mockups:     D:\dev\TwinCAT Scratch Pad\ADSTest\SVGLayout\*.png
```

This is a prototype, not authority. It is referenced for design direction only; its code is ported selectively, not imported. Reference screens:

- `Screenshot 2026-03-25 182431.png` — Home: Machine States / Safety / Faults / Performance chips + bottom status strip. Maps to Overview & Run and Alarm & Event.
- `Screenshot 2026-04-06 165506.png` — Recipes: RecipeHeader, sub-nav tabs, param grid with Start/Stop fields. Maps to Recipe & Pattern Controls.
- `Settings Motors.png` — Settings/motor params (still a sketch; light-themed).

## Design System

Token system from the reference `app.css` (`--kita-*`): dark navy surfaces and an ISA-101 semantic chip palette — inactive, waiting, transitioning, ready, running, paused, soft-fault, faulted — each with paired fg/bg. These tokens are the foundation; components reference tokens, never hard-coded colors.

Components to port (presentation-only, touch-first): `NumPad`, `Keyboard`, `Modal`/`ConfirmDialog`, `ParamInput`/`ParamRow`, `StateMachineChip`, `StatusBanner`, `Sensor`, `ValueDisplay`, `NavButton`/`SubNavButton`, `TrendChart`.

## Visuals, Not Data Layer

The reference predates the contract-gateway architecture: its `connections.js` and `SymbolBrowser` use raw ADS symbol strings — the exact pattern removed in the Gateway Contract Layer phase. Port presentation only. Every ported component is re-wired to contract keys through the gateway store; no raw-symbol access, no `SymbolBrowser`, no reference `ads.svelte.js`.

## Open Design Questions (resolve in-phase, do not block)

- Light vs dark: the reference mixes a light Settings screen with dark Home/Recipe. Standardize on the dark ISA-101 palette (a light panel glares on the shop floor) unless the operator rules otherwise.
- Settings/motor-params layout (carousel arrows, placeholder tabs) is unfinished; treat as a sketch when the relevant phase arrives.

## Consequences

- A `Design System Foundation` phase is added before Overview & Run; the screen phases (Overview & Run, Recipe & Pattern Controls, Manual & IO Diagnostics, Alarm & Event) depend on it.
- The HMI Shell (PR #4) is not retrofitted for this; token adoption folds into Design System Foundation and Overview & Run.
- Chip state semantics must map to real contract symbols, not invented states (consistent with the Alarm phase's no-faked-semantics rule).

## Rules Out

- Importing the reference's raw-symbol data layer or `SymbolBrowser`.
- A separate big-bang redesign phase that bypasses keystone discipline.
- Hard-coded colors in components instead of `--kita-*` tokens.
- Treating the prototype's unfinished screens as authoritative layouts.
