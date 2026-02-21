# Remote Signaling Protocol (PoC)

Transport: JSON over WebSocket at `/ws`.

## Client -> Server

- `join`
    - `{ "type": "join", "roomId": "okami-room", "role": "host" | "viewer" }`
- `offer`
    - `{ "type": "offer", "targetId": "client-id", "sdp": { ... } }`
- `answer`
    - `{ "type": "answer", "targetId": "client-id", "sdp": { ... } }`
- `ice-candidate`
    - `{ "type": "ice-candidate", "targetId": "client-id", "candidate": { ... } }`
- `input`
    - `{ "type": "input", "targetId": "host-id", "event": { ... } }`
- `leave`
    - `{ "type": "leave" }`

## Server -> Client

- `hello`
    - `{ "type": "hello", "clientId": "..." }`
- `joined` (host)
    - `{ "type": "joined", "clientId": "...", "roomId": "...", "role": "host", "viewerIds": [] }`
- `joined` (viewer)
    - `{ "type": "joined", "clientId": "...", "roomId": "...", "role": "viewer", "hostId": "..." }`
- `host-online`
    - `{ "type": "host-online", "hostId": "...", "roomId": "..." }`
- `host-offline`
    - `{ "type": "host-offline", "roomId": "..." }`
- `viewer-joined`
    - `{ "type": "viewer-joined", "viewerId": "...", "roomId": "..." }`
- `viewer-left`
    - `{ "type": "viewer-left", "viewerId": "...", "roomId": "..." }`
- Relay payloads:
    - `offer`, `answer`, `ice-candidate`, `input` include `fromId`.
- `error`
    - `{ "type": "error", "message": "..." }`
