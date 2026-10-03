import { NextResponse } from "next/server";
import { logout } from "@/modules/auth/service";
import { readSessionToken, withoutSession } from "@/lib/session";

export async function POST(request: Request) {
  await logout(readSessionToken(request));
  return withoutSession(NextResponse.json({ ok: true }));
}
