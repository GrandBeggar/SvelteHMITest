# Decision: Keep ADS Behind The Node Gateway

## Decision

The Svelte UI communicates with the Node gateway over the small JSON WebSocket protocol. The UI does not import ADS libraries or send arbitrary PLC access outside the gateway.

## Rationale

This boundary was proven on the CX9240 and keeps the UI testable in mock mode. It also gives one place to enforce PLC contract keys, write permissions, value coercion, ADS reconnect behavior, and route configuration.

## Consequences

- Components should render from the central browser store.
- PLC symbols should be declared in a contract or machine map, not scattered through components.
- The gateway must fail loud on unknown or unsafe requests.

## Rules Out

- Direct browser-to-ADS access.
- Component-level ADS clients.
- Arbitrary raw symbol writes from the browser in production UI.

