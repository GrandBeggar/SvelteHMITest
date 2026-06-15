# 0009 - Alarm/Event Contract Gap

Date: 2026-06-15

## Status

Accepted.

## Context

The current HMI contract does not contain native PLC alarm, event, acknowledge, reset, alarm-id, severity, timestamp, or history symbols. The available safety-related symbols are observe-only inputs such as `Inputs.bControlPower` and `Inputs.bSafetyCircuitOK`, plus existing runtime and material status bits.

The Alarm And Event Surface phase requires the UI to avoid inventing semantics the PLC does not support. In particular, the UI must not imply that an operator can acknowledge, reset, clear, or silence a PLC alarm unless a future PLC contract explicitly exposes that command and its confirmation readback.

## Decision

The current Events page is a read-only status-derived condition surface, not a native alarm manager.

It may display active conditions derived from real contract symbols, including:

- gateway/ADS connection state,
- `runtime.initialized`,
- `safety.controlPower`,
- `safety.circuitOk`,
- `input.hopperNotEmpty`,
- `input.outfeedSensor`.

It must not include acknowledge, reset, clear, silence, or alarm-history controls in this phase.

## Proposed PLC Additions

Before this app presents native alarm/event behavior, add an explicit PLC contract for at least:

- active alarm/event list or current alarm structure,
- alarm/event id,
- severity,
- active/cleared state,
- timestamp or monotonic sequence number,
- operator message text or message code,
- acknowledge command if supported,
- acknowledge confirmation/readback if supported,
- reset/clear command only if the PLC actually supports that action safely.

## Consequences

- The current Events page can satisfy the phase by showing real status-backed conditions and the documented PLC gap.
- The UI remains honest and reversible: it does not create a false operator workflow around alarms that the controller cannot honor.
- A future PLC contract update can replace or augment the status-derived condition rows with native alarm/event rows.
