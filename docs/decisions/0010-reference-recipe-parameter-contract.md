# 0010 - Reference Recipe Parameter Contract

Date: 2026-06-16

## Status

Accepted.

## Context

The reference recipe/parameter UI uses placeholder station names and sample bindings. Before redesigning that UI, the HMI contract needs the retrofit PLC's real recipe timing, glue timing, machine-state, and tray-demand symbols.

The pinned 1270 TMC hash available in the local reference copy matches decision 0004:

```text
6052347721A7EEC0B1812314FB39AAEAC136E877669CBB0D290D5D262848C1CD
```

## Decision

Extend `src/lib/machine-contract.json` with the retrofit's real names and symbols:

- Forming recipe windows under `MF.Recipes[0].Forming`: `BackStop`, `BottomStop`, `Rotary`, `SideAlign`, `Compression`.
- Vacuum recipe timing under `MF.Recipes[0].Vacuum`: `VacuumOn` and `VerifyTimer`.
- Current glue pattern under `MF.HMI.CurrentPattern`: `Leading`, `Trailing`, and guns `LH1`, `LH2`, `LH3`, `RH1`, `RH2`, `RH3`.
- Glue gun offsets under `MF.Parameters.Gluing`: `nLH1Offset`, `nLH2Offset`, `nLH3Offset`, `nRH1Offset`, `nRH2Offset`, `nRH3Offset`.
- Machine/tray state readbacks under `MF.States.*` and `MF.TrayPosition.*`.
- Tray demand under `MF.Parameters`: `nTrayDemandTarget`, `nTrayDemandActual`, `bTrayDemandEnabled`.

The active editable recipe is `MF.Recipes[0]`. `FB_RecipeManager` loads selected persisted recipe slots into `MF.Recipes[0]`, saves `MF.Recipes[0]` back through the existing `E_RecipeCommand.Save` handshake, and syncs `MF.HMI.CurrentPattern` to the selected pattern index.

## Consequences

- The redesign can bind to contract keys instead of reference placeholders.
- Recipe Save/Load/Discard semantics remain the existing `E_RecipeCommand` handshake; this phase only extends the available contract keys.
- `contract:validate` remains hermetic through an updated committed TMC/source proof fixture.
- Writable retained roots are explicit: `MF.Parameters`, `MF.Recipes[0]`, and `MF.HMI.CurrentPattern`. Other retained data, such as metrics, is not automatically writable.
