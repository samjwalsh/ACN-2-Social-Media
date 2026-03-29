import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/server/http";
import { storeService } from "@/lib/server/store";

export async function GET(request: NextRequest) {
  try {
    const { user } = requireSessionUser(request);
    return NextResponse.json({ groups: storeService.listGroups(user.id) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSessionUser(request);
    const body = await request.json();
    const name = String(body.name ?? "");
    const group = storeService.createGroup(name, user.id);
    return NextResponse.json({ group });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create group";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
