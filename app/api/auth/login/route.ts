import { NextRequest, NextResponse } from "next/server";

import { storeService } from "@/lib/server/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "");
    const password = String(body.password ?? "");

    const { token, userId } = storeService.login(username, password);
    return NextResponse.json({ token, userId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 },
    );
  }
}
