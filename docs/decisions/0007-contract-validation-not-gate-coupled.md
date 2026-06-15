# Decision: Contract Validation Is Not Coupled To Live PLC Source In The Gate

## Decision

The committed gate (`npm test` and the default validation path) must not read the live PLC project directories or shell into their git repos. Gate/CI validation runs hermetically against repo-committed fixtures only.

Validation of the contract against live PLC symbols / a running ADS connection is deferred to operator-led app testing once the HMI app is ready. The operator will run a local instance of the app and test the ADS connection directly.

## Reference PLC Source

The PLC project trees are kept on dev workstations as source reference: they document which setpoints and state monitors the program requires. They are reference-only — not a test dependency, and not guaranteed present or identical across machines.

Known locations:

```text
Pinned authority (decision 0004): C:\Dev\TwinCAT\KITA Ipak Retrofit\...
Dev/reference copy (workstation): D:\dev\TwinCAT\KITA Ipak Retrofit\...
```

Reference copies may differ from the pinned artifacts. The local `1336` `.tmc` build differs in size and hash from the pin in decision 0004; the pin remains the authority. Such differences are expected for reference copies and are not gate failures.

## Cross-OS Requirement

The HMI app must run on both Windows and Linux. PLCs are deployed on both platforms (Windows TwinCAT runtimes and Linux CX controllers), so the gateway/app cannot assume a single host OS. ADS connectivity will be exercised on Windows via a local app instance and on Linux via the CX.

## Consequences

- Machine Contract Inventory's gate does not require live PLC or `.tmc` access. Any contract-vs-artifact check kept in the gate must run against a committed fixture (a copied `.tmc` or a captured symbol export), not a live absolute path.
- The Machine Contract Inventory DoD lines requiring the validator to compare against the on-disk pinned `.tmc` are relaxed accordingly.
- Live symbol proof becomes part of operator-led app/ADS testing, not the committed unit gate.
- Server/gateway code must stay OS-portable: no hardcoded absolute paths, handle path separators, no host-OS assumptions.

## Rules Out

- Committed tests that read absolute machine-specific PLC paths.
- Gating that fails on a machine which lacks the PLC source or its git repos.
- Assuming a single host OS for the gateway or ADS connectivity.
