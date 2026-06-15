# PLC Source Pin Evidence

- **Role:** Implementer evidence for independent audit
- **Phase:** PLC Source Pin
- **Date:** 2026-06-14
- **HMI branch:** `phase/plc-source-pin`

## PLC Commits

```text
1054: 99f3c75c1a84cd167004a6324a30ce98db280e96
1270: ecc8d7ac6a2df960af7e599d5358a6ad7e69362f
1336: 9ff5ceae8a2be3f63337b26d6b0f30942a82abb2
```

## Pinned Symbol Artifacts

```text
1054: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1054\PLC\MultiFormPLC\MultiFormPLC.tmc
      SHA256 4A0ED0DFE5DFC59BF587DCABFCCAAA84B0F8591D01437BE1913F4162A18CD49E

1270: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1270\PLC\MultiFormPLC\MultiFormPLC.tmc
      SHA256 6052347721A7EEC0B1812314FB39AAEAC136E877669CBB0D290D5D262848C1CD

1336: C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit 1336\PLC\MultiFormPLC\MultiFormPLC.tmc
      SHA256 1E25A4A2BB524829E1E648BBA352D236FB9A4FABF815A15F1E4BA93E98E0D22E
```

## Clean Status Proof

Command run in each variant PLC root:

```powershell
git status --porcelain=v1
```

Result:

```text
1054 clean
1270 clean
1336 clean
```

Branch status after pinning:

```text
1054: master...origin/master [ahead 1]
1270: master...origin/master [ahead 1]
1336: master...origin/master [ahead 2]
```

The working trees are clean; the `[ahead]` markers mean the pinned local commits have not been pushed to the PLC remotes.

## Cross-Variant Logical Source Comparison

Hash-based relative-path comparison of `MultiFormPLC/GVLs`, `MultiFormPLC/DUTs`, and `MultiFormPLC/POUs` from the clean committed worktrees, using 1270 as the baseline:

```text
GVLs: 1270 vs 1054 identical (3 files)
GVLs: 1270 vs 1336 identical (3 files)
DUTs: 1270 vs 1054 identical (26 files)
DUTs: 1270 vs 1336 identical (26 files)
POUs: 1270 vs 1054 identical (25 files)
POUs: 1270 vs 1336 identical (25 files)
```

This preserves decision 0005: one HMI symbol contract can cover 1054, 1270, and 1336 at the logical PLC symbol layer.
