import { MessageView } from "@/components/demo/types";

type MessagesPanelProps = {
  messages: MessageView[];
};

export function MessagesPanel({ messages }: MessagesPanelProps) {
  return (
    <section className="rounded border p-4">
      <h2 className="mb-2 font-medium">Messages (plaintext + ciphertext)</h2>
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <article key={message.id} className="rounded border bg-muted/30 p-3">
            <div className="mb-1 text-xs text-muted-foreground">
              from={message.senderUsername} keyVersion={message.keyVersion} at=
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
            <div className="mb-1">
              <strong>plaintext:</strong>{" "}
              {message.decryptedText ??
                `[decrypt failed] ${message.decryptError}`}
            </div>
            <div className="break-all text-xs">
              <div>
                <strong>ciphertextBase64:</strong>{" "}
                {message.encrypted.ciphertextBase64}
              </div>
              <div>
                <strong>ivBase64:</strong> {message.encrypted.ivBase64}
              </div>
              <div>
                <strong>authTagBase64:</strong>{" "}
                {message.encrypted.authTagBase64}
              </div>
              <div>
                <strong>wrappedKeyBase64:</strong>{" "}
                {message.encrypted.wrappedKeyBase64 ?? "(none for this viewer)"}
              </div>
            </div>
          </article>
        ))}
        {messages.length === 0 ? (
          <p className="text-muted-foreground">
            No visible messages for this group.
          </p>
        ) : null}
      </div>
    </section>
  );
}
