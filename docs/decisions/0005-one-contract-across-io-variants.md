# Decision: Use One HMI Symbol Contract Across IO Variants

## Decision

Use one HMI symbol contract across the 1054, 1270, and 1336 machine variants unless a clean committed PLC comparison later proves the symbol layer differs.

## Rationale

The plan audit found the PLC `GVLs/`, `DUTs/`, and `POUs/` byte-identical across the variants it inspected; the variant difference is in `MultiFormPLC.tmc` and physical IO mapping below the ADS symbol layer. The HMI should bind to the logical PLC/HMI contract, not to machine-specific physical IO wiring.

## Consequences

- Machine Contract Inventory should not spend effort designing variant-specific symbol maps before a committed comparison proves a need.
- The contract validator should compare pinned variant artifacts and fail if a symbol used by the HMI differs by type, direction, or availability.
- Runtime machine-variant config can still exist for labels, options, recipes, layout preferences, or commissioning metadata, but not for divergent ADS symbol names unless a later decision changes this.

## Rules Out

- Creating separate 1054/1270/1336 HMI symbol contracts by default.
- Hard-coding physical IO mapping assumptions into Svelte components.
- Treating `.tmc` physical mapping differences as UI symbol differences without contract evidence.

