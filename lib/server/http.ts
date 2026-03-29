import { NextRequest } from "next/server";

import { storeService } from "@/lib/server/store";

export function readSessionToken(request: NextRequest): string | null {
  return request.headers.get("x-session-token");
}

export function requireSessionUser(request: NextRequest) {
  const token = readSessionToken(request);
  const user = storeService.getUserBySession(token);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return { token: token!, user };
}
