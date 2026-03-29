import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/server/http";
import { storeService } from "@/lib/server/store";

type Params = { params: Promise<{ groupId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = requireSessionUser(request);
    const { groupId } = await params;
    const body = await request.json();
    const targetUserId = String(body.targetUserId ?? "");
    const action = String(body.action ?? "");

    if (action === "add") {
      const group = storeService.addMember(groupId, user.id, targetUserId);
      return NextResponse.json({ group });
    }
    if (action === "remove") {
      const group = storeService.removeMember(groupId, user.id, targetUserId);
      return NextResponse.json({ group });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Membership update failed";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
