# Plan Cross-Review — SvelteHMI Rollout

- **Role:** Auditor / Gatekeeper (independent of planner and implementer)
- **Artifact under review:** `docs/plan.md` (+ `docs/architecture.md`, `docs/decisions/0001..0003`, `src/lib/connections.js`)
- **Stage:** §8 plan cross-review, before any phase code
- **Date:** 2026-06-14
- **Verdict:** **REDIRECT** (2 critical, 4 major, 3 minor; one earlier auditor defect withdrawn)

---

## 1. Method

Per gate protocol §4, findings were **re-derived, not trusted**. The plan was checked against the *actual* PLC program, not against the HMI repo alone — the first pass reviewed only the HMI repo and was materially incomplete (recorded as a process miss; this revision corrects it).

Evidence base read for this review:

- HMI repo: `docs/plan.md`, `docs/architecture.md`, `docs/decisions/0001-0003`, `package.json`, `server.js`, `src/lib/connections.js`.
- PLC program: `C:\Dev\TwinCAT\KITA Ipak Retrofit\KITA Ipak Retrofit {1054,1270,1336}\PLC\MultiFormPLC\`
  - GVLs: `MF.TcGVL`, `Inputs.TcGVL`, `C.TcGVL`
  - DUTs: `HMIStructure.TcDUT` (`ST_HMI`), `ST_RecipeHMI.TcDUT`, `E_RecipeCommand.TcDUT`, `ST_Metrics`
  - POUs: `FB_CoilManager.TcPOU`, `FB_Coil.TcPOU`

Verified by re-derivation:
- `npm run build`/`npm run smoke` exist; `check`/`lint`/`test` do not (consistent with Gate Harness being first). `package.json`.
- `/api/health` returns `{mode, ads}` — Service Deployment DoD is satisfiable. `server.js:137`.
- `systemd/sveltehmi.service` env matches decision 0003 exactly.
- Variant source trees: `GVLs/`, `DUTs/`, `POUs/` are **byte-identical** across 1054/1270/1336; only `MultiFormPLC.tmc` differs.

---

## 2. Verdict summary

| ID | Severity | Finding | Required action |
|----|----------|---------|-----------------|
| F1 | Major | PLC working tree is the live truth but uncommitted — no SHA to pin as a reproducible contract artifact | Commit/snapshot the live state to freeze provenance |
| F2 | Critical | Recipe is a command handshake, not a bounded numeric write | Rewrite Recipe phase DoD + contract to model `E_RecipeCommand` |
| F3 | Critical | Coil "writes" target a scan-driven `%Q*` output member; wrong symbol | Bind `eForce` (input) + read `eStatus`/`bOut`; fix `connections.js` |
| F4 | Major | Plan/decisions never link the PLC source or pin a symbol artifact | Add decision record pinning PLC repo + commit + `.tmc` |
| F5 | Major | Write-direction re-curated instead of derived from PLC; `%I*`-in-RETAIN trap | Derive direction from PLC; add validator guard |
| F6 | Major | Variant selection over-modeled — one symbol contract serves all three | Add decision record: one contract across IO variants |
| F7 | Minor | Numeric bounds duplicated between PLC constants and JS | Source bounds from `C.` constants |
| F8 | Minor | Contract type fidelity too coarse (INT/UINT/UDINT/REAL collapsed to number) | Capture PLC scalar types in contract |
| F9 | Minor | `connections.js` omits real symbols (`eCommand`, `bHasUnsavedChanges`, `nLastCycleTimeMs`, most coils) | Reconcile contract to PLC during Contract Inventory |
| — | Withdrawn | Earlier "E-stop strict gate" defect | Safety is observe-only; plan instinct was correct |

---

## 3. Critical findings

### F2 — Recipe is a command protocol, not a single bounded write

`ST_RecipeHMI` (`ST_RecipeHMI.TcDUT`) is explicitly directional, and the command is an enum:

```
// HMI -> PLC
eCommand       : E_RecipeCommand;   // (None, Load, Save, Discard)
nSelectedIndex : UINT;
// PLC -> HMI
nActiveIndex       : UINT;
bHasUnsavedChanges : BOOL;
```

`E_RecipeCommand.TcDUT`: `(None, Load, Save, Discard)`.

**Impact.** Plan phase **Recipe And Pattern Controls** and `src/lib/connections.js` model recipe as a bounded write to `nSelectedIndex` (`writeTestSymbols`, min 0 / max 20). Writing `nSelectedIndex` alone does not load/save a recipe — that requires issuing `eCommand`. `selectedIndex` (HMI→PLC intent) vs `nActiveIndex` (PLC→HMI truth) is a two-value pattern the UI must show distinctly, plus `bHasUnsavedChanges`. The current model would produce a UI that appears to change recipes but does not.

**Required action.** Rewrite the Recipe phase DoD around the command handshake: select → command (Load/Save/Discard) → confirm via `nActiveIndex`/`bHasUnsavedChanges`. Add `eCommand`, `nActiveIndex`, `bHasUnsavedChanges` to the contract with correct directions.

### F3 — Coil "writes" target a scan-driven output; the override is `eForce`, not `bOut`

`FB_Coil` (`FB_Coil.TcPOU`):

```
VAR_OUTPUT
    bOut    AT %Q*  : BOOL;      // physical output
    eStatus         : E_ForceStatus;
VAR_INPUT
    eForce          : E_ForceMode;
```

`FB_Coil.Update()` recomputes `bOut` every scan from `eForce`:

```
CASE eForce OF
    E_ForceMode.On:  bOut := TRUE;  eStatus := ForcedOn;  RETURN;
    E_ForceMode.Off: bOut := FALSE; eStatus := ForcedOff; RETURN;
END_CASE
…
```

`FB_CoilManager` exposes 15 coils (`Vacuum, MotorForward, MotorReverse, OutfeedConveyor, BackStops, BottomStops, Rotary, SideAlign, Compression, GlueLH1/RH1/LH2/RH2/LH3/RH3`).

**Impact.** `src/lib/connections.js` maps outputs to `MF.Coils.Vacuum.bOut` (etc.). `bOut` is a `%Q*` output recomputed each scan, so a raw ADS write to it will be overwritten almost immediately — the HMI would appear to actuate nothing, or fight the PLC. The intended, PLC-supported override path is to **write `eForce` (`E_ForceMode`) and read back `eStatus`/`bOut`.** This is the highest-hazard write class (direct physical actuator) and belongs only in the service-gated Manual/IO phase.

**Required action.** Re-bind coil control to `MF.Coils.<coil>.eForce` for writes and `…eStatus`/`…bOut` for readback; correct `connections.js`. Treat coil force as a distinct, service-gated hazard class with explicit failing-path tests.

---

## 4. Major findings

### F1 — PLC working tree is the live truth, but uncommitted — no SHA to pin

`KITA Ipak Retrofit 1270/PLC` HEAD is `c5255f83…` (2026-03-06), and the working tree is dirty (`MF.TcGVL`, `MultiFormPLC.tmc` modified; `Outputs.TcGVL` deleted; etc.). Per the operator, **the working tree matches what is currently running on the PLC** — so the on-disk declarations cited in this report *are* authoritative for the live machine; the dirty state is not a correctness risk.

**Impact.** The symbols are trustworthy, but there is no committed SHA to pin as a stable, reproducible contract artifact. Contract validation needs a fixed reference; "current working tree" drifts and cannot be re-derived later. This is a provenance-capture gap, not a symbol-accuracy problem.

**Required action.** Commit the live state of each variant to a known SHA (or snapshot `MultiFormPLC.tmc`) so the contract has a reproducible authority to diff against. The `Outputs.TcGVL` deletion is part of the live program and is expected, not a defect.

### F4 — No link from plan/decisions to the PLC source or a symbol artifact

`docs/plan.md` and decisions 0001-0003 never state where the PLC program lives or which artifact is authoritative, yet Machine Contract Inventory's DoD requires comparing the contract "against a real PLC export or captured symbol table artifact." The artifact exists (`MultiFormPLC.tmc`) but is unreferenced and (per F1) uncommitted.

**Required action.** Add a decision record pinning: PLC repo path, the per-variant commit SHA (after F1), and `MultiFormPLC.tmc` as the captured symbol table the validator diffs against.

### F5 — Write-direction should be derived from the PLC, not re-curated; `%I*`-in-RETAIN trap

Direction is already authoritative in the PLC: directional comments in `ST_RecipeHMI`, and physical-mapping attributes. Critical trap: `ST_HMI.bStepEnable AT %I*` is a **physical input inside the otherwise-writable `MF.HMI` RETAIN struct**. A naive "`MF.HMI.*` is writable" rule (the struct is `VAR_GLOBAL PERSISTENT RETAIN`) would let the HMI write a physical input.

**Required action.** Contract Inventory must derive read/write direction from the PLC and the validator must reject writable-marking of any `AT %I*` member. Add a failing-path validator test using `ST_HMI.bStepEnable`.

### F6 — Variant selection is over-modeled

`architecture.md` lists as open: whether 1054/1270/1336 are selected by env/config/build. At the **symbol layer that question is moot** — GVLs/DUTs/POUs are identical across variants; only `MultiFormPLC.tmc` (physical IO mapping) differs. One HMI symbol contract serves all three machines; variant differences live below the ADS-symbol layer.

**Required action.** Record a decision: one symbol contract across IO variants; remove variant-parameterization from Contract Inventory scope. (Re-confirm after F1, since the comparison was against dirty trees.)

---

## 5. Minor findings

- **F7 — bounds duplicated.** `connections.js` hardcodes patternIndex max 8 / recipe max 20; the PLC owns these as `C.nPATTERN_COUNT := 8`, `C.nRECIPE_MAX_COUNT := 20`. Two sources of truth (§6). Source bounds from the `C.` constants.
- **F8 — type fidelity.** Contract collapses PLC scalars to `number`/`boolean`. The gateway needs real types for coercion: `nPatternIndex : INT` (signed, default 1), recipe indices `UINT`, metrics `UDINT`/`REAL` (`ST_Metrics`). Capture PLC types per key.
- **F9 — contract omissions.** `connections.js` omits symbols that exist and matter (`Recipe.eCommand`, `Recipe.bHasUnsavedChanges`, `Metrics.nLastCycleTimeMs`, 12 of 15 coils). Reconcile to the PLC during Contract Inventory rather than carrying the commissioning subset forward as the contract.

## 6. Withdrawn

- **E-stop / safety strict-gate defect (earlier pass).** The PLC has no E-stop/ack symbol; safety is `Inputs.bSafetyCircuitOK` / `bControlPower` from a separate safety controller — observe-only at the HMI. The plan's Alarm phase caution ("don't imply reset/ack the PLC doesn't support") is correct. Keep only a display failing-path test for a safety-drop; drop the "strict write gate" framing.

---

## 7. Required plan amendments (for the planner)

1. **Machine Contract Inventory** — depends on a committed PLC (F1); link PLC source + pin `.tmc` (F4); derive direction from PLC incl. `%I*` guard (F5); capture PLC scalar types (F8); reconcile omissions (F9); drop variant-parameterization (F6).
2. **Recipe And Pattern Controls** — rewrite DoD around `E_RecipeCommand` handshake + active/selected/unsaved (F2); bounds from `C.` constants (F7).
3. **Manual And IO Diagnostics** — coil control binds `eForce`/`eStatus`, not `.bOut`; treat as top hazard class (F3).
4. **`src/lib/connections.js`** — correct coil write member and recipe model; this file is currently a commissioning subset, not the contract.

## 8. Recommended decision records

- `0004-machine-contract-source.md` — PLC repo + pinned per-variant commit + `.tmc` as authoritative symbol table.
- `0005-one-contract-across-io-variants.md` — symbols identical across 1054/1270/1336; single contract.
- `0006-recipe-command-protocol.md` — model `E_RecipeCommand` + selected/active/unsaved in the HMI contract.

## 9. Limitations of this review

- All PLC declarations were read from working trees that (per operator) match the live PLC and are therefore authoritative, but are not yet committed to a pinnable SHA (F1).
- `E_ForceMode` / `E_ForceStatus` enum value sets were inferred from `FB_Coil.Update()`, not read in full.
- No live PLC was queried; the symbol-table comparison is source/`.tmc`-based, not an online `getSymbols()` dump.

---

## 10. Re-review (2026-06-14)

Re-derived all nine findings against the revised `docs/plan.md` and new decision records `0004`/`0005`/`0006`.

**Verdict: REDIRECT — one residual item (R1). All nine original findings resolved.**

| ID | Status | Evidence |
|----|--------|----------|
| F1 | Resolved | New **PLC Source Pin** phase (DoD: clean trees, SHA recorded in 0004, `.tmc` path+hash, clean `git status` transcript, auditor verifies SHA + clean tree). Contract Inventory now `depends_on` it. Decision 0004 created with explicit PENDING fields. |
| F2 | Resolved | Decision 0006 models the handshake; Recipe phase DoD now requires "`nSelectedIndex` alone insufficient; load command confirmed by `nActiveIndex`", plus save/discard `bHasUnsavedChanges` and ADS-rejected/ADS-drop-while-pending tests. Contract Inventory represents all four recipe symbols with direction. |
| F3 | Resolved | Manual/IO phase binds force to `MF.Coils.<coil>.eForce`, readback to `bOut`/`eStatus`, with DoD "auditor verifies no code path writes `MF.Coils.*.bOut`" and force on/off/auto/rejected/drop tests. |
| F4 | Resolved | Decision 0004 records PLC path/HEAD/`.tmc`; Contract Inventory extracts "from the committed PLC source and pinned `.tmc`". |
| F5 | Resolved | Contract Inventory DoD: direction derived from PLC metadata; validator rejects writable `AT %I*` incl. `ST_HMI.bStepEnable`. |
| F6 | Resolved (see R1) | Decision 0005 created; plan references it. |
| F7 | Resolved | Contract Inventory + Recipe DoD source bounds from `C.nPATTERN_COUNT` / `C.nRECIPE_MAX_COUNT`. |
| F8 | Resolved | Contract Inventory DoD captures `BOOL/INT/UINT/UDINT/REAL/E_RecipeCommand/E_ForceMode/E_ForceStatus`. |
| F9 | Resolved | Contract Inventory represents recipe-command and coil `eForce`/`eStatus` symbols; `connections.js` explicitly demoted to "commissioning subset only". |

### R1 (Major) — Decision 0005 has no machine-checkable proof on clean trees

Decision 0005 ("one contract across variants") rests on the byte-identical GVL/DUT/POU comparison — but that was run on **dirty** trees (audit §3/F1). 0005 itself rules out separate contracts *"unless a clean committed comparison contradicts"*, and the PLC Source Pin brief says to "re-run the cross-variant comparison only against clean committed trees" — yet no DoD enforces it. PLC Source Pin's DoD records only the **1270** SHA and verifies a single tree; there is no checkable item that all three variants are committed and re-diffed clean. So the assumption scoping the entire contract effort would ride permanently on dirty-tree evidence.

**Required fix.** Add to **PLC Source Pin** DoD: "All three variant trees (1054/1270/1336) are committed and clean, their SHAs recorded in 0004, and a fresh diff of `GVLs/`, `DUTs/`, `POUs/` across the pinned commits is captured — identical, or differences recorded and 0005 updated." This converts 0005 from a dirty-tree assumption into a re-derivable fact.

### Calibration note (§4.6)

This is not a 100%-accept: nine findings landed clean, R1 is a genuine missing proof, not a nitpick. Once R1 is folded into the PLC Source Pin DoD, the plan is **ready to enter the loop** (Gate Harness and PLC Source Pin are the two `depends_on: none` entry phases and can run in parallel).
