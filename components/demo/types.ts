export type UserSummary = {
  id: string;
  username: string;
};

export type GroupSummary = {
  id: string;
  name: string;
  keyVersion: number;
  memberIds: string[];
  isCurrentMember: boolean;
};

export type MessageView = {
  id: string;
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
