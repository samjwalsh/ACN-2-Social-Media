import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/server/http";
import { storeService } from "@/lib/server/store";

type Params = { params: Promise<{ groupId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user } = requireSessionUser(request);
    const { groupId } = await params;
    const messages = storeService.listGroupMessages(groupId, user.id);
    return NextResponse.json({ messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load messages";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = requireSessionUser(request);
    const { groupId } = await params;
    const body = await request.json();
    const text = String(body.text ?? "");
    const message = storeService.sendGroupMessage(groupId, user.id, text);
    return NextResponse.json({ message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send message";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
