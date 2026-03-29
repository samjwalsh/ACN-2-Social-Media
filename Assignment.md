The aim of this project is to develop a secure social media application for Facebook, Twitter,
WhatsApp etc., or for your own social networking app. For example, your application will secure the
Facebook Wall, such that only people that are part of your “Secure Facebook Group” will be able to
decrypt each other’s posts. To all other users of the system the post will appear as ciphertext.
You are required to design and implement a suitable key management system for your application
which employs public-key certificates that allows users of the system to share social media
messages securely and allows one to add or remove users from the group. You are free to implement
your application for a desktop or mobile platform and make use of any open-source cryptographic
libraries.

# Extra Guidelines

For the stack let's use React and Next.js with shadcn ( you have the MCP server installed )
Remember that this is not a real app, just a college project designed to demonstrate encryption. As a result styling is not important at all and you should keep the functionality extremely limited.
As the aim of the project is to demonstrate encryption, it would be a good idea to log both in to the console and the webapp the encrypted messages so that the professor can see that data remains encrypted while in transport.

# User Stories

As a user I want to be able to create an account with a username and password.
I want to be able to sign into a different account in each tab.
As a user I want to see all groups and create my own.
As a user I want to be able to add and remove people to groups I am in.
I want to be able to share messages to a group, everyone in the group can decrypt the mesage.
I want the UI to show the encrypted messaged I receive and send so that we can observe the encryption working.

# Assessment

The project is assessed via an explanatory doc walking through the code and an accompanying video explaining the code and showing the project working.
As a result, simple clear code is highly preferred in order to make explanation easier.

# Clarified Decisions (Locked)

These decisions resolve ambiguity and should be treated as fixed scope for this project.

1. Certificate authority model
   Use one in-app certificate authority (CA) that signs all user certificates.

2. Group encryption/key strategy
   Use per-message symmetric encryption (AES-GCM) and wrap each message key for each recipient using that recipient's public key.

3. Member removal semantics
   Removal must block access to future messages only. Historical messages remain readable if previously accessible.
   When group membership changes, rotate group key material used for future sends.

4. Storage and persistence
   In-memory storage is sufficient for the demo (no database required).

5. Auth/session behavior across tabs
   Support separate signed-in users in different tabs by using tab-scoped session storage.

6. Encryption visibility for demonstration
   Display encrypted payloads in the UI for sent and received messages.
   Also log encrypted payloads on the server side before decryption.

7. Security depth
   Required: password hashing and certificate signature verification.
   Optional/stretch: certificate expiry and revocation lists.

8. Platform target
   Web-only Next.js app (desktop and mobile browser compatible).

# Implementation Plan

## Phase 1 - Foundation

1. Scaffold Next.js app with React and shadcn components.
2. Create an in-memory data layer for users, groups, memberships, certificates, and messages.
3. Add basic auth flows: register, login, logout.
4. Implement tab-scoped sessions.

## Phase 2 - Crypto Core

1. Implement in-app CA keypair generation at app startup.
2. On user registration, generate user keypair and CA-signed certificate.
3. Implement certificate verification for all secure operations.
4. Implement per-message AES-GCM encryption.
5. Implement per-recipient wrapped message keys using public-key encryption.

## Phase 3 - Group and Messaging Features

1. Group list and group creation.
2. Add/remove members for groups the user belongs to.
3. Rotate forward group key version on membership change.
4. Send encrypted group messages.
5. Decrypt messages only for current authorized members.

## Phase 4 - Demo Visibility and Explainability

1. Add UI panels showing plaintext and ciphertext values for each sent/received message.
2. Add server logging for ciphertext in transport.
3. Keep code intentionally simple and heavily structured for easy walkthrough.

## Phase 5 - Validation for Assessment

1. Verify user stories end-to-end in multiple tabs with different accounts.
2. Verify removed users cannot decrypt new messages after removal.
3. Verify non-members see ciphertext only.
4. Prepare a short demo script for the video and explanatory document.
