# Decision: Pin PLC Source Before HMI Contract Extraction

## Decision

The HMI machine contract must be derived from a committed PLC source tree and pinned `.tmc` symbol artifact, not from an uncommitted TwinCAT working tree.

Current status: pinned from clean committed PLC trees on 2026-06-14.

PLC source roots:

```text
1054: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1054\PLC
1270: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1270\PLC
1336: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1336\PLC
```

Pinned evidence:

```text
1054 PLC commit: 99f3c75c1a84cd167004a6324a30ce98db280e96
1270 PLC commit: ecc8d7ac6a2df960af7e599d5358a6ad7e69362f
1336 PLC commit: 9ff5ceae8a2be3f63337b26d6b0f30942a82abb2

Pinned symbol artifacts:
1054: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1054\PLC\MultiFormPLC\MultiFormPLC.tmc
1270: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1270\PLC\MultiFormPLC\MultiFormPLC.tmc
1336: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1336\PLC\MultiFormPLC\MultiFormPLC.tmc

Artifact SHA256 hashes:
1054: 4A0ED0DFE5DFC59BF587DCABFCCAAA84B0F8591D01437BE1913F4162A18CD49E
1270: 6052347721A7EEC0B1812314FB39AAEAC136E877669CBB0D290D5D262848C1CD
1336: 1E25A4A2BB524829E1E648BBA352D236FB9A4FABF815A15F1E4BA93E98E0D22E

Clean status proof: docs/audits/2026-06-14-plc-source-pin.md
Clean cross-variant GVL/DUT/POU diff proof: docs/audits/2026-06-14-plc-source-pin.md
```

## Rationale

The onsite HMI ADS test proved real symbols, but the matching PLC source initially existed in uncommitted working trees. A contract derived from dirty source cannot be re-derived by an auditor, compared across variants, or safely used as the basis for gateway write enforcement. The pinned commits above freeze the source and `.tmc` artifacts that Machine Contract Inventory must validate against.

## Consequences

- Machine Contract Inventory depends on a committed PLC source pin.
- Contract validation must compare against the pinned `.tmc` artifact or a generated symbol export from that pinned source.
- Decision 0005 depends on the clean cross-variant comparison recorded here; dirty-tree comparisons are not enough.
- Any later PLC symbol change that affects HMI must update this decision or create a successor decision.

## Rules Out

- Treating the current PLC working tree as a stable contract authority.
- Deriving HMI write permissions from chat notes or commissioning behavior alone.
- Starting contract implementation before the PLC source is clean and pinned.
