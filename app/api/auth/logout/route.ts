import { NextRequest, NextResponse } from "next/server";

import { readSessionToken } from "@/lib/server/http";
import { storeService } from "@/lib/server/store";

export async function POST(request: NextRequest) {
  const token = readSessionToken(request);
  if (token) {
    storeService.logout(token);
  }
  return NextResponse.json({ ok: true });
}
