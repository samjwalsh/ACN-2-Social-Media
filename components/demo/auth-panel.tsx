import { FormEvent } from "react";

import { Button } from "@/components/ui/button";

type AuthPanelProps = {
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
};

export function AuthPanel({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onRegister,
  onLogin,
  onLogout,
}: AuthPanelProps) {
  return (
    <section className="grid gap-4 rounded border p-4 md:grid-cols-2">
      <form onSubmit={onRegister} className="flex flex-col gap-2">
        <h2 className="font-medium">Register</h2>
        <input
          className="rounded border p-2"
          placeholder="username"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
        />
        <input
          className="rounded border p-2"
          type="password"
          placeholder="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <Button type="submit">Create account</Button>
      </form>

      <form onSubmit={onLogin} className="flex flex-col gap-2">
        <h2 className="font-medium">Login</h2>
        <input
          className="rounded border p-2"
          placeholder="username"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
        />
        <input
          className="rounded border p-2"
          type="password"
          placeholder="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <div className="flex gap-2">
          <Button type="submit">Login</Button>
          <Button type="button" variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </form>
    </section>
  );
}
