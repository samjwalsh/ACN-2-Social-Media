type StatusPanelProps = {
  currentUsername: string | null;
  status: string;
};

export function StatusPanel({ currentUsername, status }: StatusPanelProps) {
  return (
    <section className="rounded border p-4">
      <p>
        Current user: <strong>{currentUsername ?? "(none)"}</strong>
      </p>
      <p className="text-muted-foreground">Status: {status}</p>
    </section>
  );
}
