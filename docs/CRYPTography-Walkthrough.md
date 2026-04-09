# ACN-2 Secure Social Media: Cryptography Walkthrough

This document explains the important technical aspects of the project, with emphasis on cryptography and key management because that is the main marking focus.

## 1. Project Goal and Security Objective

The app demonstrates secure group messaging where only authorized group members can decrypt messages.

Core objective:

- Keep message content encrypted while in transport/storage.
- Allow group membership changes and enforce access rules for future messages.
- Make encryption visible for assessment (plaintext + ciphertext in UI and ciphertext in server logs).

Requirements source:

- [Assignment.md](../Assignment.md)

## 2. Architecture at a Glance

High-level components:

- Client orchestration and UI: [app/page.tsx](../app/page.tsx)
- API routes (auth/groups/messages): [app/api](../app/api)
- Session boundary helper: [lib/server/http.ts](../lib/server/http.ts)
- Security model and business logic: [lib/server/store.ts](../lib/server/store.ts)
- Crypto primitives and security helpers: [lib/server/store-helpers.ts](../lib/server/store-helpers.ts)
- Domain types: [lib/server/store-types.ts](../lib/server/store-types.ts)

The backend uses an in-memory store for demo simplicity. This is intentionally non-production and was a locked scope decision in [Assignment.md](../Assignment.md).

## 3. Data Model (Security-Relevant)

Defined in [lib/server/store-types.ts](../lib/server/store-types.ts):

- `Certificate`: user identity + public key + CA signature.
- `User`: username, salted password hash, keypair, certificate.
- `Group`: `keyVersion` + per-user membership timeline.
- `Membership`: `joinedAtVersion`, `removedAtVersion`.
- `Message`: encrypted payload + wrapped keys per recipient + message `keyVersion`.
- `Store`: in-memory root state (users, sessions, groups, messages, CA keys).

Why this matters:

- The `keyVersion` and membership timeline are central to “remove user affects future messages only”.

## 4. Cryptography Design

### 4.1 CA and User Keypairs

Key generation is centralized in [lib/server/store-helpers.ts](../lib/server/store-helpers.ts):

- `createKeyPairPem()` generates RSA-2048 keypairs.

Usage:

- App startup creates a single in-app CA keypair in `makeStore()` at [lib/server/store.ts](../lib/server/store.ts).
- User registration creates a per-user keypair in `register()` at [lib/server/store.ts](../lib/server/store.ts).

### 4.2 Certificate Signing and Verification

Helpers in [lib/server/store-helpers.ts](../lib/server/store-helpers.ts):

- `signCertificate(...)`
- `certificateIsValid(...)`

Certificate payload includes:

- `userId`, `username`, `publicKeyPem`, `issuedAt`

Where used:

- On registration, CA signs the user certificate in `register()` at [lib/server/store.ts](../lib/server/store.ts).
- On secure operations, sender cert is verified before send/read paths in [lib/server/store.ts](../lib/server/store.ts).

Assessment point:

- This demonstrates public-key certificate usage and trust chain (in-app CA -> user certificate).

### 4.3 Password Security

In [lib/server/store-helpers.ts](../lib/server/store-helpers.ts):

- `hashPassword(...)` uses scrypt with random salt.
- `passwordsMatch(...)` uses timing-safe comparison.

Flow:

- Register: create random salt, hash password, store hash + salt.
- Login: recompute hash from provided password + stored salt, compare securely.

### 4.4 Message Encryption and Key Wrapping

In [lib/server/store-helpers.ts](../lib/server/store-helpers.ts):

- `encryptForRecipients(...)`
- `decryptForUser(...)`

Algorithm strategy:

- Per message, generate fresh AES-256-GCM symmetric key.
- Encrypt plaintext -> ciphertext + IV + auth tag.
- For each recipient, wrap (encrypt) the message key with that recipient’s RSA public key using RSA-OAEP (SHA-256).

Why this design is good for assessment:

- Shows hybrid cryptography clearly:
  - Symmetric crypto for message body efficiency.
  - Asymmetric crypto for key distribution to recipients.
- Supports variable recipient sets per message.

## 5. Membership and Access Control Semantics

Membership logic in [lib/server/store-helpers.ts](../lib/server/store-helpers.ts):

- `canAccessVersion(...)`
- `currentMemberIds(...)`

Group updates in [lib/server/store.ts](../lib/server/store.ts):

- `addMember(...)`
- `removeMember(...)`

Important behavior:

- Group has a `keyVersion`.
- Membership changes increment `keyVersion`.
- Member join/removal stores version boundaries.
- Message stores the group version at send time.
- Read access checks if user membership covered that message version.

This implements the required semantics:

- Removed users cannot decrypt future messages.
- Historical messages remain readable if they had access at send time.

## 6. End-to-End Crypto Flow

### 6.1 Registration

Route:

- [app/api/auth/register/route.ts](../app/api/auth/register/route.ts)

Service path:

- `storeService.register(...)` in [lib/server/store.ts](../lib/server/store.ts)

What happens:

1. Username normalized.
2. Password salted and hashed.
3. User keypair generated.
4. Certificate created and signed by CA.
5. User stored in-memory.

### 6.2 Login and Session

Routes:

- [app/api/auth/login/route.ts](../app/api/auth/login/route.ts)
- [app/api/auth/logout/route.ts](../app/api/auth/logout/route.ts)

Session boundary:

- `readSessionToken(...)` and `requireSessionUser(...)` in [lib/server/http.ts](../lib/server/http.ts)

Client token behavior:

- Stored per tab in `sessionStorage` from [app/page.tsx](../app/page.tsx).

### 6.3 Send Encrypted Group Message

Route:

- [app/api/groups/[groupId]/messages/route.ts](../app/api/groups/[groupId]/messages/route.ts)

Service path:

- `storeService.sendGroupMessage(...)` in [lib/server/store.ts](../lib/server/store.ts)

What happens:

1. Validate sender is current member.
2. Verify sender certificate.
3. Build recipient set from current members.
4. Encrypt plaintext with AES-GCM.
5. Wrap message key for each recipient.
6. Store encrypted message with version metadata.
7. Log ciphertext payload on server for transport visibility.

### 6.4 Read and Decrypt Messages

Route:

- [app/api/groups/[groupId]/messages/route.ts](../app/api/groups/[groupId]/messages/route.ts)

Service path:

- `storeService.listGroupMessages(...)` in [lib/server/store.ts](../lib/server/store.ts)

What happens:

1. Filter messages by membership/version access.
2. Verify sender certificate.
3. Unwrap viewer’s message key with viewer private key.
4. AES-GCM decrypt + auth tag verification.
5. Return both plaintext and encrypted fields for demo visibility.

## 7. Ciphertext Visibility (Assessment Requirement)

Server-side logs:

- Encrypted transport payload logged in `sendGroupMessage(...)` at [lib/server/store.ts](../lib/server/store.ts).

UI visibility:

- Message rendering includes plaintext + ciphertext + IV + auth tag + wrapped key in [components/demo/messages-panel.tsx](../components/demo/messages-panel.tsx).

This directly supports the requirement to show that data remains encrypted in transport/storage.

## 8. API Security Boundaries

Public routes:

- Register/login/logout.

Protected routes:

- Session, users, groups, membership changes, messages.

Protection mechanism:

- All protected routes call `requireSessionUser(...)` from [lib/server/http.ts](../lib/server/http.ts).
- This enforces token-based session validation before business logic.

## 9. User Stories to Code Traceability

### Story: Create account with username/password

- Route: [app/api/auth/register/route.ts](../app/api/auth/register/route.ts)
- Logic: `register(...)` in [lib/server/store.ts](../lib/server/store.ts)
- Security: salted scrypt password hash + keypair + certificate.

### Story: Sign in with different account in each tab

- UI/state: [app/page.tsx](../app/page.tsx)
- Mechanism: tab-scoped `sessionStorage` token.

### Story: See/create groups

- Route: [app/api/groups/route.ts](../app/api/groups/route.ts)
- Logic: `listGroups(...)`, `createGroup(...)` in [lib/server/store.ts](../lib/server/store.ts)

### Story: Add/remove group users

- Route: [app/api/groups/[groupId]/members/route.ts](../app/api/groups/[groupId]/members/route.ts)
- Logic: `addMember(...)`, `removeMember(...)` in [lib/server/store.ts](../lib/server/store.ts)
- Security: membership version boundaries.

### Story: Group message decryption for authorized users

- Route: [app/api/groups/[groupId]/messages/route.ts](../app/api/groups/[groupId]/messages/route.ts)
- Logic: `sendGroupMessage(...)`, `listGroupMessages(...)` in [lib/server/store.ts](../lib/server/store.ts)
- Security: per-message encryption + wrapped keys + cert checks + version access checks.

### Story: Show encrypted sent/received messages

- UI: [components/demo/messages-panel.tsx](../components/demo/messages-panel.tsx)
- Log: ciphertext console log in [lib/server/store.ts](../lib/server/store.ts)

## 10. Demo Script (Video-Friendly)

1. Register user A in tab 1.
2. Register user B in tab 2.
3. Login each tab as different user.
4. Create group from user A.
5. Add user B.
6. Send message from A and show:

- Ciphertext in server logs.
- Ciphertext and plaintext in UI.

7. Remove user B from group.
8. Send new message from A.
9. Show B cannot decrypt new message (future access revoked).
10. Explain why old messages remain accessible (version semantics).

## 11. Limitations and Honest Scope Notes

This project is intentionally demo-scoped and not production-ready.

Current simplifications:

- In-memory storage only (state lost on restart).
- No certificate revocation list / expiry enforcement.
- Session tokens are simple UUIDs without rotation/expiry.
- No persistent audit trail beyond console logs.
- No message signing for non-repudiation.

These are acceptable given assignment constraints and can be listed as future work.

## 12. Possible Extensions

1. Add persistent storage (database) while keeping encrypted payload model.
2. Add cert expiry and revocation workflow.
3. Add signed messages (sender signature) in addition to encryption.
4. Replace polling with SSE/WebSocket for real-time updates.
5. Add secure session expiration/refresh tokens.

---

## Quick Reference: Most Mark-Relevant Files

- [lib/server/store-helpers.ts](../lib/server/store-helpers.ts)
- [lib/server/store.ts](../lib/server/store.ts)
- [lib/server/store-types.ts](../lib/server/store-types.ts)
- [app/api/groups/[groupId]/messages/route.ts](../app/api/groups/[groupId]/messages/route.ts)
- [components/demo/messages-panel.tsx](../components/demo/messages-panel.tsx)
