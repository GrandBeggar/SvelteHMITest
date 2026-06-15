# Decision: Pin PLC Source Before HMI Contract Extraction

## Decision

The HMI machine contract must be derived from a committed PLC source tree and pinned `.tmc` symbol artifact, not from an uncommitted TwinCAT working tree.

Current status: pending. The PLC source observed during the first plan audit is dirty and cannot yet serve as the final contract authority.

Observed PLC source during audit:

```text
Path: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1270\PLC
HEAD: c5255f83677b4ded3d074ecc9b3400cfc0c4da21
Status: dirty
Authoritative symbol artifact candidate: MultiFormPLC/MultiFormPLC.tmc
```

Before Machine Contract Inventory starts, replace the pending fields below with committed evidence:

```text
1270 PLC commit: PENDING
1054 PLC commit: PENDING
1336 PLC commit: PENDING
Pinned symbol artifact(s): PENDING
Artifact hash(es): PENDING
Clean status proof: PENDING
Clean cross-variant GVL/DUT/POU diff proof: PENDING
```

## Rationale

The onsite HMI ADS test proved real symbols, but the matching PLC source currently exists in an uncommitted working tree. A contract derived from dirty source cannot be re-derived by an auditor, compared across variants, or safely used as the basis for gateway write enforcement.

## Consequences

- Machine Contract Inventory depends on a committed PLC source pin.
- Contract validation must compare against the pinned `.tmc` artifact or a generated symbol export from that pinned source.
- Decision 0005 depends on the clean cross-variant comparison recorded here; dirty-tree comparisons are not enough.
- Any later PLC symbol change that affects HMI must update this decision or create a successor decision.

## Rules Out

- Treating the current PLC working tree as a stable contract authority.
- Deriving HMI write permissions from chat notes or commissioning behavior alone.
- Starting contract implementation before the PLC source is clean and pinned.
