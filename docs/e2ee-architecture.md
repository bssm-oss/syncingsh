# E2EE Architecture Design Spike

Issue: #40

## Goal

Add a realistic path to end-to-end encryption for collaborative rooms without claiming security properties the current architecture does not provide.

The important distinction is:

- **Local-at-rest encryption** protects the browser's local recovery copy.
- **Collaborative E2EE** means document data leaves the browser only as ciphertext, including through the relay/sync provider.

The current app can add local-at-rest encryption incrementally, but true collaborative E2EE requires replacing the plaintext Liveblocks Yjs sync boundary.

## Current Architecture

The room page owns document lifecycle, provider connection, local recovery, same-browser fallback sync, presence setup, and room controls.

```text
Tiptap Editor
  -> plaintext Y.XmlFragment
  -> plaintext Y.Doc
  -> Liveblocks Yjs provider
  -> Liveblocks room transport/storage

Y.Doc
  -> Y.encodeStateAsUpdate(doc)
  -> base64
  -> localStorage

Y.Doc update
  -> base64
  -> BroadcastChannel(syncingsh:<roomId>)
```

Relevant seams:

- `src/routes/room/[roomId]/+page.svelte`
  - `onMount()` creates the `Y.Doc`, connects Liveblocks, swaps to `provider.getYDoc()`, and sets presence metadata.
  - `restoreLocalDoc()` reads the local recovery snapshot and applies it with `Y.applyUpdate()`.
  - `persistLocalDoc()` writes `Y.encodeStateAsUpdate(doc)` to `localStorage` as base64.
  - `connectLocalFallback()` sends Yjs updates over `BroadcastChannel` as base64 and applies peer updates with `Y.applyUpdate()`.
  - `copyReadonlyLink()` creates `?readonly=1`, which is UI read-only only.
  - `exportCurrentTab()` exports visible editor text as `.txt`.
- `src/lib/components/Editor.svelte`
  - `Collaboration.configure({ fragment })` binds Tiptap to a plaintext `Y.XmlFragment`.
  - `editable` prevents editor input in read-only mode.
- `src/lib/components/Presence.svelte`
  - Renders Liveblocks/Yjs awareness state.
  - The room page sends `{ name, color }` as plaintext awareness metadata.

Base64 in the current implementation is transport encoding, not encryption.

## Threat Model

### In Scope

- A relay/storage provider must not read document contents.
- Local recovery data should not reveal document contents if browser storage is copied.
- Same-browser fallback messages should not expose document contents to other scripts listening on the same channel.
- Late joiners must recover a document from encrypted state without requiring the provider to decrypt it.

### Explicitly Out Of Scope For The First E2EE Pass

- Hiding room IDs from the relay.
- Hiding IP addresses, timing, message sizes, and connection metadata.
- Protecting against a compromised browser, malicious extension, or XSS. If attacker code runs in the page, it can read the plaintext in-memory `Y.Doc` and keys.
- Cryptographically enforced read-only links. The current `?readonly=1` link is UI-only and can be bypassed by a modified client.

### Open Product Decision

Presence and cursor metadata can leak names, colors, online state, and approximate activity. The first E2EE version should either:

1. keep presence plaintext and document that only content is encrypted, or
2. move presence to a separate encrypted channel and accept more implementation complexity.

## Recommended Design

Keep Tiptap and Yjs plaintext in memory. Encrypt only at the boundary where updates or snapshots leave the browser.

```text
Tiptap Editor
  -> plaintext local Y.Doc
  -> doc.on('update')
  -> encrypt(update)
  -> relay/storage sees ciphertext
  -> peer decrypts(update)
  -> Y.applyUpdate(peerDoc, update)
```

Use browser Web Crypto with an authenticated encryption primitive such as AES-GCM. Every encrypted payload needs a unique IV/nonce and must include enough metadata to identify the room, key version, payload type, and ordering.

Payload types:

- `snapshot`: encrypted `Y.encodeStateAsUpdate(doc)` for late join and compaction.
- `update`: encrypted incremental Yjs update from `doc.on('update')`.
- `sync-request`: asks peers or storage for the latest encrypted snapshot/update chain.
- `presence` optional: encrypted awareness metadata if presence is in scope.

Late join flow:

1. Client obtains the room key from the URL hash, passphrase flow, or invitation capability.
2. Client fetches the newest encrypted snapshot.
3. Client decrypts and applies it with `Y.applyUpdate(doc, snapshot)`.
4. Client decrypts and applies encrypted updates newer than the snapshot.
5. Client starts sending encrypted incremental updates.

The relay/storage layer can store and forward ciphertext, but it cannot merge or diff encrypted Yjs updates unless it has the key. Compaction therefore happens on a trusted client, which periodically writes a new encrypted snapshot.

## Key Model Options

### Option A: URL Hash Room Key

The room URL contains the key in the hash fragment, for example `/room/abc#key=...`. Hash fragments are not sent in HTTP requests.

Pros:

- Simple no-login sharing UX.
- Fits the current link-based product.
- No account or backend key service required.

Cons:

- Anyone with the full link can read and write unless capability keys are added.
- Link previews, screenshots, browser history, and copy/paste tools can leak the key.
- Key rotation is awkward.

### Option B: Passphrase-Derived Key

Users enter a shared passphrase and the app derives a key with PBKDF2 or a stronger KDF.

Pros:

- The room URL does not contain the raw key.
- Users can share the room code and passphrase separately.

Cons:

- More friction.
- Weak passphrases weaken the whole room.
- Requires careful UX for forgotten passphrases because the app cannot recover them.

### Option C: Read/Write Capabilities

Use separate read and write capabilities. Readers can decrypt, writers can also produce accepted signed updates.

Pros:

- Turns read-only links into a real security boundary.
- Better long-term model for public sharing.

Cons:

- Requires signatures or another write authorization mechanism.
- More state and protocol design.
- Should not be bundled into the first implementation unless read-only security is a hard requirement.

## Migration Plan

### Phase 1: Honest Local Encryption

Encrypt only local recovery data and BroadcastChannel fallback payloads.

Changes:

- Add key derivation/import utilities around Web Crypto.
- Replace base64 local recovery values with encrypted envelopes.
- Encrypt BroadcastChannel update payloads.
- Keep Liveblocks Yjs provider unchanged.
- Label the feature as local recovery encryption, not E2EE.

This is useful, small, and testable, but Liveblocks still sees plaintext document updates.

### Phase 2: Encrypted Transport Prototype

Build a custom encrypted Yjs transport instead of using `getYjsProviderForRoom()` as the document sync boundary.

Changes:

- Keep local `Y.Doc` creation in the room page.
- Listen to `doc.on('update')` and encrypt outgoing updates.
- Send ciphertext through a relay channel.
- Decrypt incoming payloads and apply them with `Y.applyUpdate()`.
- Add encrypted snapshot fetch/write paths for late joiners.

The relay may be Liveblocks events/storage or a separate minimal relay, but it must only see ciphertext if the feature is called E2EE.

### Phase 3: Snapshot And Recovery

Add encrypted snapshots so late joiners do not need every update since room creation.

Changes:

- Store encrypted snapshots with monotonically increasing version metadata.
- Store encrypted updates after the latest snapshot.
- Compact update logs by writing a fresh encrypted snapshot from a trusted client.
- Handle key rotation by writing a new snapshot under the new key version.

### Phase 4: Capability Links

Upgrade `?readonly=1` from UI-only to a cryptographic capability if required.

Changes:

- Separate read capability from write authorization.
- Reject unsigned or unauthorized writes.
- Keep UI read-only as a convenience, but do not rely on it for security.

## Testing Strategy

Unit tests:

- Encryption envelope round trip.
- Wrong key fails decryption.
- Tampered ciphertext fails decryption.
- Snapshot/update ordering logic.

E2E tests:

- Reload recovery works with encrypted local storage.
- BroadcastChannel sync works with encrypted messages.
- Cross-browser encrypted sync works through the relay.
- Late joiner loads encrypted snapshot and catches up with later updates.
- A read-only UI link still blocks editing.
- If capability links are implemented, a read-only client cannot produce accepted writes.

Manual QA:

- Inspect localStorage and confirm document text is not visible.
- Inspect BroadcastChannel/WebSocket payloads and confirm document text is not visible.
- Join with a wrong key and confirm the document does not decrypt.
- Join with the correct key and confirm collaborative editing still works.

## Risks

- Claiming E2EE while still using the plaintext Liveblocks Yjs provider would be security theater.
- Encrypted ciphertext cannot be merged by an untrusted server, so snapshot compaction must happen on a trusted client.
- Presence metadata may remain visible unless explicitly encrypted.
- XSS defeats client-side E2EE by reading plaintext state or keys in the page.
- URL hash keys are convenient but easy to leak through user behavior.
- The current read-only link is not a security boundary.

## Recommendation

Implement Phase 1 first only if the product copy clearly says local recovery encryption. For real room E2EE, start with Phase 2 as a prototype behind a separate branch or flag and do not market it as complete until encrypted late-join recovery is working.

The redesign is mostly in the sync/provider layer. The Svelte room UI, Tiptap editor, tab model, and export behavior can mostly stay. The Liveblocks Yjs provider cannot remain the document sync provider for real E2EE unless Liveblocks provides a verified E2EE mode or the app wraps all document data before it reaches Liveblocks.
