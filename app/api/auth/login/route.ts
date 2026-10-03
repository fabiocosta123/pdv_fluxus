import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { login } from "@/modules/auth/service";
import { withSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const session = await login(body);
    return withSession(NextResponse.json(session.user), session.token);
  } catch (error) {
    return fail(error);
  }
}
