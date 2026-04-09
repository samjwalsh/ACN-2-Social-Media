# ACN-2 Secure Social Media Demo

This is a college project that demonstrates secure group messaging with public-key certificates and visible encrypted transport payloads.

Main assessment document:

- [docs/CRYPTography-Walkthrough.md](docs/CRYPTography-Walkthrough.md)

## Stack

- Next.js + React
- shadcn/ui
- In-memory backend store (demo scope)

## Run

```bash
npm install
npm run dev
```

Open:

- http://localhost:3000

## Build Check

```bash
npm run build
```

## Demo Flow (Quick)

1. Open two tabs.
2. Register two users.
3. Login each tab as a different user.
4. Create a group and add the second user.
5. Send messages and observe ciphertext in UI and server logs.
6. Remove the second user and send a new message to demonstrate future access revocation.
