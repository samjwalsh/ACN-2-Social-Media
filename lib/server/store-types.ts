export type Certificate = {
  userId: string;
  username: string;
  publicKeyPem: string;
  issuedAt: string;
  signatureBase64: string;
};

export type User = {
  id: string;
  username: string;
  passwordHashBase64: string;
  passwordSaltBase64: string;
  publicKeyPem: string;
  privateKeyPem: string;
  certificate: Certificate;
};

export type Membership = {
  joinedAtVersion: number;
  removedAtVersion: number | null;
};

export type Group = {
  id: string;
  name: string;
  keyVersion: number;
  memberships: Record<string, Membership>;
};

export type Message = {
  id: string;
  groupId: string;
  senderId: string;
  senderUsername: string;
  keyVersion: number;
  ciphertextBase64: string;
  ivBase64: string;
  authTagBase64: string;
  wrappedKeys: Record<string, string>;
  createdAt: string;
};

export type Session = {
  token: string;
  userId: string;
};

export type Store = {
  caPrivateKeyPem: string;
  caPublicKeyPem: string;
  users: Record<string, User>;
  usernames: Record<string, string>;
  groups: Record<string, Group>;
  messagesByGroup: Record<string, Message[]>;
  sessions: Record<string, Session>;
};

export type SenderViewMessage = {
  id: string;
  groupId: string;
  senderId: string;
  senderUsername: string;
  keyVersion: number;
  createdAt: string;
  decryptedText: string | null;
  decryptError: string | null;
  encrypted: {
    ciphertextBase64: string;
    ivBase64: string;
    authTagBase64: string;
    wrappedKeyBase64: string | null;
  };
};
