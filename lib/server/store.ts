import { randomBytes, randomUUID } from "node:crypto";

import {
  canAccessVersion,
  certificateIsValid,
  createKeyPairPem,
  currentMemberIds,
  decryptForUser,
  encryptForRecipients,
  hashPassword,
  normalizeUsername,
  passwordsMatch,
  signCertificate,
} from "@/lib/server/store-helpers";
import {
  Group,
  SenderViewMessage,
  Store,
  User,
} from "@/lib/server/store-types";

const STORE_KEY = "__acn2SocialStore";

function makeStore(): Store {
  const caKeyPair = createKeyPairPem();

  return {
    caPrivateKeyPem: caKeyPair.privateKeyPem,
    caPublicKeyPem: caKeyPair.publicKeyPem,
    users: {},
    usernames: {},
    groups: {},
    messagesByGroup: {},
    sessions: {},
  };
}

function getStore(): Store {
  const globalObject = globalThis as typeof globalThis & {
    [STORE_KEY]?: Store;
  };

  if (!globalObject[STORE_KEY]) {
    globalObject[STORE_KEY] = makeStore();
  }

  return globalObject[STORE_KEY];
}

function groupView(group: Group, forUserId?: string) {
  const memberIds = currentMemberIds(group);
  return {
    id: group.id,
    name: group.name,
    keyVersion: group.keyVersion,
    memberIds,
    isCurrentMember: forUserId ? memberIds.includes(forUserId) : true,
  };
}

function encryptedView(
  message: {
    ciphertextBase64: string;
    ivBase64: string;
    authTagBase64: string;
    wrappedKeys: Record<string, string>;
  },
  viewerUserId: string,
) {
  return {
    ciphertextBase64: message.ciphertextBase64,
    ivBase64: message.ivBase64,
    authTagBase64: message.authTagBase64,
    wrappedKeyBase64: message.wrappedKeys[viewerUserId] ?? null,
  };
}

export const storeService = {
  register(username: string, password: string) {
    const store = getStore();
    const normalized = normalizeUsername(username);

    if (!normalized) {
      throw new Error("Username is required");
    }
    if (!password || password.length < 4) {
      throw new Error("Password must be at least 4 characters");
    }
    if (store.usernames[normalized]) {
      throw new Error("Username already exists");
    }

    const userKeys = createKeyPairPem();
    const userId = randomUUID();
    const issuedAt = new Date().toISOString();
    const certData = {
      userId,
      username: normalized,
      publicKeyPem: userKeys.publicKeyPem,
      issuedAt,
    };

    const saltBase64 = randomBytes(16).toString("base64");

    const user: User = {
      id: userId,
      username: normalized,
      passwordHashBase64: hashPassword(password, saltBase64),
      passwordSaltBase64: saltBase64,
      publicKeyPem: userKeys.publicKeyPem,
      privateKeyPem: userKeys.privateKeyPem,
      certificate: {
        ...certData,
        signatureBase64: signCertificate(certData, store.caPrivateKeyPem),
      },
    };

    store.users[userId] = user;
    store.usernames[normalized] = userId;

    return {
      id: user.id,
      username: user.username,
      certificate: user.certificate,
    };
  },

  login(username: string, password: string): { token: string; userId: string } {
    const store = getStore();
    const normalized = normalizeUsername(username);
    const userId = store.usernames[normalized];
    if (!userId) {
      throw new Error("Invalid username or password");
    }

    const user = store.users[userId];
    const isValid = passwordsMatch(
      password,
      user.passwordSaltBase64,
      user.passwordHashBase64,
    );

    if (!isValid) {
      throw new Error("Invalid username or password");
    }

    const token = randomUUID();
    store.sessions[token] = { token, userId: user.id };
    return { token, userId: user.id };
  },

  logout(token: string) {
    const store = getStore();
    delete store.sessions[token];
  },

  getUserBySession(token: string | null | undefined): User | null {
    if (!token) {
      return null;
    }
    const store = getStore();
    const session = store.sessions[token];
    if (!session) {
      return null;
    }
    return store.users[session.userId] ?? null;
  },

  listUsers() {
    const store = getStore();
    return Object.values(store.users).map((user) => ({
      id: user.id,
      username: user.username,
    }));
  },

  listGroups(forUserId: string) {
    const store = getStore();
    return Object.values(store.groups).map((group) =>
      groupView(group, forUserId),
    );
  },

  createGroup(name: string, ownerId: string) {
    const store = getStore();
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Group name is required");
    }

    const group: Group = {
      id: randomUUID(),
      name: trimmed,
      keyVersion: 1,
      memberships: {
        [ownerId]: {
          joinedAtVersion: 1,
          removedAtVersion: null,
        },
      },
    };

    store.groups[group.id] = group;
    store.messagesByGroup[group.id] = [];

    return groupView(group);
  },

  addMember(groupId: string, actorUserId: string, targetUserId: string) {
    const store = getStore();
    const group = store.groups[groupId];
    if (!group) {
      throw new Error("Group not found");
    }
    if (!canAccessVersion(group, actorUserId, group.keyVersion)) {
      throw new Error("Only current members can manage the group");
    }
    if (!store.users[targetUserId]) {
      throw new Error("Target user does not exist");
    }

    const existing = group.memberships[targetUserId];
    if (!existing || existing.removedAtVersion !== null) {
      group.keyVersion += 1;
      group.memberships[targetUserId] = {
        joinedAtVersion: group.keyVersion,
        removedAtVersion: null,
      };
    }

    return groupView(group);
  },

  removeMember(groupId: string, actorUserId: string, targetUserId: string) {
    const store = getStore();
    const group = store.groups[groupId];
    if (!group) {
      throw new Error("Group not found");
    }
    if (!canAccessVersion(group, actorUserId, group.keyVersion)) {
      throw new Error("Only current members can manage the group");
    }

    const membership = group.memberships[targetUserId];
    if (membership && membership.removedAtVersion === null) {
      group.keyVersion += 1;
      membership.removedAtVersion = group.keyVersion - 1;
    }

    return groupView(group);
  },

  sendGroupMessage(groupId: string, senderUserId: string, plaintext: string) {
    const store = getStore();
    const group = store.groups[groupId];
    if (!group) {
      throw new Error("Group not found");
    }
    if (!canAccessVersion(group, senderUserId, group.keyVersion)) {
      throw new Error("Only current group members can send messages");
    }

    const sender = store.users[senderUserId];
    if (!certificateIsValid(store.caPublicKeyPem, sender.certificate)) {
      throw new Error("Sender certificate is invalid");
    }

    const trimmed = plaintext.trim();
    if (!trimmed) {
      throw new Error("Message text is required");
    }

    const recipients = currentMemberIds(group).map((userId) => ({
      userId,
      publicKeyPem: store.users[userId].publicKeyPem,
    }));

    const encrypted = encryptForRecipients(trimmed, recipients);

    const message = {
      id: randomUUID(),
      groupId,
      senderId: sender.id,
      senderUsername: sender.username,
      keyVersion: group.keyVersion,
      createdAt: new Date().toISOString(),
      ...encrypted,
    };

    store.messagesByGroup[groupId].push(message);

    // Demonstrates the encrypted payload traveling through transport/storage.
    console.log("[encrypted-transport]", {
      groupId,
      messageId: message.id,
      sender: message.senderUsername,
      keyVersion: message.keyVersion,
      ciphertextBase64: message.ciphertextBase64,
      ivBase64: message.ivBase64,
      authTagBase64: message.authTagBase64,
      wrappedRecipientCount: Object.keys(message.wrappedKeys).length,
    });

    return message;
  },

  listGroupMessages(
    groupId: string,
    viewerUserId: string,
  ): SenderViewMessage[] {
    const store = getStore();
    const group = store.groups[groupId];
    if (!group) {
      throw new Error("Group not found");
    }

    const viewer = store.users[viewerUserId];
    const messages = store.messagesByGroup[groupId] ?? [];

    return messages
      .filter((message) =>
        canAccessVersion(group, viewerUserId, message.keyVersion),
      )
      .map((message) => {
        const sender = store.users[message.senderId];
        const senderCertOk = sender
          ? certificateIsValid(store.caPublicKeyPem, sender.certificate)
          : false;

        if (!senderCertOk) {
          return {
            id: message.id,
            groupId: message.groupId,
            senderId: message.senderId,
            senderUsername: message.senderUsername,
            keyVersion: message.keyVersion,
            createdAt: message.createdAt,
            decryptedText: null,
            decryptError: "Sender certificate verification failed",
            encrypted: encryptedView(message, viewer.id),
          };
        }

        try {
          return {
            id: message.id,
            groupId: message.groupId,
            senderId: message.senderId,
            senderUsername: message.senderUsername,
            keyVersion: message.keyVersion,
            createdAt: message.createdAt,
            decryptedText: decryptForUser(message, viewer),
            decryptError: null,
            encrypted: encryptedView(message, viewer.id),
          };
        } catch (error) {
          return {
            id: message.id,
            groupId: message.groupId,
            senderId: message.senderId,
            senderUsername: message.senderUsername,
            keyVersion: message.keyVersion,
            createdAt: message.createdAt,
            decryptedText: null,
            decryptError:
              error instanceof Error
                ? error.message
                : "Unable to decrypt message",
            encrypted: encryptedView(message, viewer.id),
          };
        }
      });
  },
};
