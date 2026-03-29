import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/server/http";

export async function GET(request: NextRequest) {
  try {
    const { user } = requireSessionUser(request);
    return NextResponse.json({
      user: { id: user.id, username: user.username },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
