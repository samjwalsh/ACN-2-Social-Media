"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AuthPanel } from "@/components/demo/auth-panel";
import { ComposerPanel } from "@/components/demo/composer-panel";
import { GroupsPanel } from "@/components/demo/groups-panel";
import { MembershipPanel } from "@/components/demo/membership-panel";
import { MessagesPanel } from "@/components/demo/messages-panel";
import { StatusPanel } from "@/components/demo/status-panel";
import {
  GroupSummary,
  MessageView,
  UserSummary,
} from "@/components/demo/types";

const SESSION_KEY = "acn2-demo-session-token";

async function parseResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [status, setStatus] = useState<string>("Idle");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [messageText, setMessageText] = useState("");

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const availableUsers = useMemo(
    () =>
      users.filter(
        (candidate) =>
          candidate.id !== currentUser?.id &&
          !(selectedGroup?.memberIds ?? []).includes(candidate.id),
      ),
    [users, currentUser?.id, selectedGroup?.memberIds],
  );

  const removableUsers = useMemo(
    () =>
      users.filter(
        (candidate) =>
          candidate.id !== currentUser?.id &&
          (selectedGroup?.memberIds ?? []).includes(candidate.id),
      ),
    [users, currentUser?.id, selectedGroup?.memberIds],
  );

  async function api<T>(
    path: string,
    options: RequestInit = {},
    withAuth: boolean = true,
  ): Promise<T> {
    const headers = new Headers(options.headers ?? {});
    headers.set("Content-Type", "application/json");
    if (withAuth && token) {
      headers.set("x-session-token", token);
    }

    const response = await fetch(path, {
      ...options,
      headers,
    });
    return parseResponse(response);
  }

  async function refreshCoreData(activeGroupId?: string) {
    if (!token) {
      return;
    }

    const [sessionPayload, usersPayload, groupsPayload] = await Promise.all([
      api<{ user: UserSummary }>("/api/session"),
      api<{ users: UserSummary[] }>("/api/users"),
      api<{ groups: GroupSummary[] }>("/api/groups"),
    ]);

    setCurrentUser(sessionPayload.user);
    setUsers(usersPayload.users);
    setGroups(groupsPayload.groups);

    const nextSelected =
      activeGroupId &&
      groupsPayload.groups.some((group) => group.id === activeGroupId)
        ? activeGroupId
        : selectedGroupId &&
            groupsPayload.groups.some((group) => group.id === selectedGroupId)
          ? selectedGroupId
          : (groupsPayload.groups[0]?.id ?? "");

    setSelectedGroupId(nextSelected);

    if (nextSelected) {
      const messagePayload = await api<{ messages: MessageView[] }>(
        `/api/groups/${nextSelected}/messages`,
      );
      setMessages(messagePayload.messages);
    } else {
      setMessages([]);
    }
  }

  useEffect(() => {
    setIsMounted(true);
    const storedToken = window.sessionStorage.getItem(SESSION_KEY);
    if (!storedToken) {
      return;
    }

    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setUsers([]);
      setGroups([]);
      setSelectedGroupId("");
      setMessages([]);
      return;
    }

    refreshCoreData().catch((error) => {
      window.sessionStorage.removeItem(SESSION_KEY);
      setToken(null);
      setStatus(error instanceof Error ? error.message : "Session expired");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshCoreData(selectedGroupId || undefined);
    }, 2500);

    const onFocus = () => {
      void refreshCoreData(selectedGroupId || undefined);
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedGroupId]);

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api<{ user: UserSummary }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        },
        false,
      );
      setStatus("Registered. You can now log in.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Registration failed");
    }
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const payload = await api<{ token: string }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        },
        false,
      );
      window.sessionStorage.setItem(SESSION_KEY, payload.token);
      setToken(payload.token);
      setStatus("Logged in");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    }
  }

  async function onLogout() {
    if (!token) {
      return;
    }
    try {
      await api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } finally {
      window.sessionStorage.removeItem(SESSION_KEY);
      setToken(null);
      setStatus("Logged out");
    }
  }

  async function onCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const payload = await api<{ group: GroupSummary }>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName }),
      });
      setGroupName("");
      await refreshCoreData(payload.group.id);
      setStatus(`Group created: ${payload.group.name}`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to create group",
      );
    }
  }

  async function onAddMember() {
    if (!selectedGroupId || !targetUserId) {
      return;
    }

    try {
      await api<{ group: GroupSummary }>(
        `/api/groups/${selectedGroupId}/members`,
        {
          method: "POST",
          body: JSON.stringify({ action: "add", targetUserId }),
        },
      );
      setTargetUserId("");
      await refreshCoreData(selectedGroupId);
      setStatus("Member added");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to add member",
      );
    }
  }

  async function onRemoveMember() {
    if (!selectedGroupId || !targetUserId) {
      return;
    }

    try {
      await api<{ group: GroupSummary }>(
        `/api/groups/${selectedGroupId}/members`,
        {
          method: "POST",
          body: JSON.stringify({ action: "remove", targetUserId }),
        },
      );
      setTargetUserId("");
      await refreshCoreData(selectedGroupId);
      setStatus("Member removed");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to remove member",
      );
    }
  }

  async function onSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroupId) {
      return;
    }
    try {
      await api<{ message: MessageView }>(
        `/api/groups/${selectedGroupId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ text: messageText }),
        },
      );
      setMessageText("");
      await refreshCoreData(selectedGroupId);
      setStatus("Encrypted message sent");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to send message",
      );
    }
  }

  async function onSelectGroup(groupId: string) {
    setSelectedGroupId(groupId);
    if (!groupId) {
      setMessages([]);
      return;
    }
    try {
      const payload = await api<{ messages: MessageView[] }>(
        `/api/groups/${groupId}/messages`,
      );
      setMessages(payload.messages);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to fetch messages",
      );
    }
  }

  if (!isMounted) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 text-sm">
        <h1 className="text-xl font-semibold">
          ACN-2 Secure Social Media Demo
        </h1>
        <p className="text-muted-foreground">Loading app...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 text-sm">
      <h1 className="text-xl font-semibold">ACN-2 Secure Social Media Demo</h1>
      <p className="text-muted-foreground">
        Plaintext and ciphertext are shown together for assessment/demo
        purposes.
      </p>

      <AuthPanel
        username={username}
        password={password}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onRegister={onRegister}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <StatusPanel
        currentUsername={currentUser?.username ?? null}
        status={status}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <GroupsPanel
          groups={groups}
          selectedGroupId={selectedGroupId}
          groupName={groupName}
          onGroupNameChange={setGroupName}
          onCreateGroup={onCreateGroup}
          onSelectGroup={onSelectGroup}
        />

        <MembershipPanel
          users={users}
          targetUserId={targetUserId}
          onTargetUserChange={setTargetUserId}
          onAddMember={onAddMember}
          onRemoveMember={onRemoveMember}
          selectedGroup={selectedGroup}
          availableUsersCount={availableUsers.length}
          removableUsersCount={removableUsers.length}
        />

        <ComposerPanel
          messageText={messageText}
          onMessageTextChange={setMessageText}
          onSendMessage={onSendMessage}
          canSend={Boolean(selectedGroup)}
        />
      </section>

      <MessagesPanel messages={messages} />
    </main>
  );
}
