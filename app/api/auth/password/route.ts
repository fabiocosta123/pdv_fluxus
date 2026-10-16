import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { readSessionToken } from "@/lib/session";
import { changeOwnPassword } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    await changeOwnPassword(readSessionToken(request), await readJson(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
