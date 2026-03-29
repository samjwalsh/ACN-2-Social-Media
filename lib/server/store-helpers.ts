import {
  constants,
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import { Certificate, Group, Message } from "@/lib/server/store-types";

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function currentMemberIds(group: Group): string[] {
  return Object.entries(group.memberships)
    .filter(([, membership]) => membership.removedAtVersion === null)
    .map(([userId]) => userId);
}

export function canAccessVersion(
  group: Group,
  userId: string,
  keyVersion: number,
): boolean {
  const membership = group.memberships[userId];
  if (!membership) {
    return false;
  }
  if (membership.joinedAtVersion > keyVersion) {
    return false;
  }
  if (
    membership.removedAtVersion !== null &&
    membership.removedAtVersion < keyVersion
  ) {
    return false;
  }
  return true;
}

export function createKeyPairPem() {
  const keyPair = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return {
    publicKeyPem: keyPair.publicKey,
    privateKeyPem: keyPair.privateKey,
  };
}

export function hashPassword(password: string, saltBase64: string): string {
  return scryptSync(password, Buffer.from(saltBase64, "base64"), 64).toString(
    "base64",
  );
}

export function passwordsMatch(
  attemptedPassword: string,
  saltBase64: string,
  expectedHashBase64: string,
): boolean {
  const attempted = Buffer.from(
    hashPassword(attemptedPassword, saltBase64),
    "base64",
  );
  const expected = Buffer.from(expectedHashBase64, "base64");

  if (attempted.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(attempted, expected);
}

function certPayload(cert: Omit<Certificate, "signatureBase64">): string {
  return `${cert.userId}|${cert.username}|${cert.publicKeyPem}|${cert.issuedAt}`;
}

export function signCertificate(
  certFields: Omit<Certificate, "signatureBase64">,
  caPrivateKeyPem: string,
): string {
  const signer = createSign("sha256");
  signer.update(certPayload(certFields));
  signer.end();
  return signer.sign(caPrivateKeyPem).toString("base64");
}

export function certificateIsValid(
  caPublicKeyPem: string,
  certificate: Certificate,
): boolean {
  const verifier = createVerify("sha256");
  verifier.update(
    certPayload({
      userId: certificate.userId,
      username: certificate.username,
      publicKeyPem: certificate.publicKeyPem,
      issuedAt: certificate.issuedAt,
    }),
  );
  verifier.end();
  return verifier.verify(
    caPublicKeyPem,
    Buffer.from(certificate.signatureBase64, "base64"),
  );
}

export function encryptForRecipients(
  plaintext: string,
  recipients: Array<{ userId: string; publicKeyPem: string }>,
): Pick<
  Message,
  "ciphertextBase64" | "ivBase64" | "authTagBase64" | "wrappedKeys"
> {
  const symmetricKey = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", symmetricKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const wrappedKeys: Record<string, string> = {};
  for (const recipient of recipients) {
    wrappedKeys[recipient.userId] = publicEncrypt(
      {
        key: createPublicKey(recipient.publicKeyPem),
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      symmetricKey,
    ).toString("base64");
  }

  return {
    ciphertextBase64: ciphertext.toString("base64"),
    ivBase64: iv.toString("base64"),
    authTagBase64: authTag.toString("base64"),
    wrappedKeys,
  };
}

export function decryptForUser(
  message: Message,
  viewer: { id: string; privateKeyPem: string },
): string {
  const wrappedKeyBase64 = message.wrappedKeys[viewer.id];
  if (!wrappedKeyBase64) {
    throw new Error("No wrapped key for this user");
  }

  const symmetricKey = privateDecrypt(
    {
      key: createPrivateKey(viewer.privateKeyPem),
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(wrappedKeyBase64, "base64"),
  );

  const decipher = createDecipheriv(
    "aes-256-gcm",
    symmetricKey,
    Buffer.from(message.ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(message.authTagBase64, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(message.ciphertextBase64, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
