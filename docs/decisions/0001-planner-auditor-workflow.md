# Decision: Use Planner / Implementer / Auditor Workflow

## Decision

Use `docs/plan.md`, decision records, branch-per-phase implementation, and independent auditing before merge.

## Rationale

The HMI touches a live machine and a PLC write path. The project needs small, auditable changes with repeatable gates rather than chat-only decisions or large unreviewable rewrites.

## Consequences

- The agent that implements a phase must not gate that same phase.
- Each phase must have a machine-checkable Definition of Done.
- Design rulings that affect later work need a decision record before implementation.

## Rules Out

- Treating chat history as the source of truth.
- Self-approving implementation work.
- Shipping phases whose only proof is "it looked right in the browser."

