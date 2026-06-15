# Decision: Model Recipe Changes As A PLC Command Protocol

## Decision

Recipe controls must model the PLC recipe handshake:

```text
HMI -> PLC:
  MF.HMI.Recipe.nSelectedIndex
  MF.HMI.Recipe.eCommand = E_RecipeCommand.Load | Save | Discard

PLC -> HMI:
  MF.HMI.Recipe.nActiveIndex
  MF.HMI.Recipe.bHasUnsavedChanges
```

The HMI must not present `nSelectedIndex` alone as a completed recipe change.

## Rationale

The PLC uses `E_RecipeCommand` and separates selected index intent from active recipe truth. Writing `nSelectedIndex` alone does not load a recipe. The UI must show selected, active, unsaved, pending, success, and failure states in a way that matches the PLC protocol.

## Consequences

- Recipe UI writes are command writes, not simple bounded numeric writes.
- Gateway tests must cover command success, command rejection, ADS drop while pending, and stale/unchanged active index after a command.
- Bounds for recipe selection come from PLC constants such as `C.nRECIPE_MAX_COUNT`.
- `MF.HMI.Recipe.bHasUnsavedChanges` is part of the visible recipe state.

## Rules Out

- Treating `MF.HMI.Recipe.nSelectedIndex` as the active recipe.
- Offering Load/Save/Discard UI without sending and confirming `E_RecipeCommand`.
- Mock behavior that marks a recipe loaded without exercising the command handshake.

