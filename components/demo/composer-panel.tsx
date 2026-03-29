import { FormEvent } from "react";

import { Button } from "@/components/ui/button";

type ComposerPanelProps = {
  messageText: string;
  onMessageTextChange: (value: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  canSend: boolean;
};

export function ComposerPanel({
  messageText,
  onMessageTextChange,
  onSendMessage,
  canSend,
}: ComposerPanelProps) {
  return (
    <div className="rounded border p-4">
      <h2 className="mb-2 font-medium">Send message</h2>
      <form onSubmit={onSendMessage} className="flex flex-col gap-2">
        <textarea
          className="min-h-24 rounded border p-2"
          placeholder="Type plaintext to encrypt"
          value={messageText}
          onChange={(event) => onMessageTextChange(event.target.value)}
        />
        <Button type="submit" disabled={!canSend}>
          Encrypt + Send
        </Button>
      </form>
    </div>
  );
}
