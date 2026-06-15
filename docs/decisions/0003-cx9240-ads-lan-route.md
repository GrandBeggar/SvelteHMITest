# Decision: Use CX LAN Route Identity For Node ADS

## Decision

For the first CX9240 target, run the Node ADS gateway with the LAN route identity that was proven onsite:

```text
ADS_TARGET_AMS=5.168.37.183.1.1
ADS_TARGET_PORT=851
ADS_ROUTER_ADDRESS=192.168.1.100
ADS_LOCAL_ADDRESS=192.168.1.100
ADS_LOCAL_AMS=192.168.1.100.1.1
ADS_LOCAL_PORT=32750
```

Keep the corresponding non-secure route in `/etc/TwinCAT/3.1/Target/StaticRoutes.xml`:

```xml
<Route>
        <Name>LocalNodeGatewayLan</Name>
        <Address>192.168.1.100</Address>
        <NetId>192.168.1.100.1.1</NetId>
        <Type>TCP_IP</Type>
        <Flags>0</Flags>
</Route>
```

## Rationale

Loopback route attempts using `127.0.0.1.1.1` could register a local ADS port but did not receive responses from PLC runtime `851`. The LAN route identity returned PLC state `Run` and supported live read/subscribe/write testing.

## Consequences

- This is target-specific until machine variants and IP/AMS assignment strategy are defined.
- `ADS_LOCAL_PORT=32750` should be treated as reserved for SvelteHMI on this CX unless a later decision changes it.
- The temporary incorrect loopback route `LocalNodeGateway` should be removed from the CX if still present.

## Rules Out

- Assuming `127.0.0.1.1.1` loopback works on this Beckhoff RT Linux target.
- Using Secure ADS password authentication from `ads-client`; this library does not expose that handshake.

