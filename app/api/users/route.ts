import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/server/http";
import { storeService } from "@/lib/server/store";

export async function GET(request: NextRequest) {
  try {
    requireSessionUser(request);
    return NextResponse.json({ users: storeService.listUsers() });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
