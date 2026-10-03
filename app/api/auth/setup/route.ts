import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { hasUsers, setupOwner } from "@/modules/auth/service";
import { withSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    if (await hasUsers()) {
      return NextResponse.json({ error: "O proprietário já foi criado" }, { status: 409 });
    }
    const body = await readJson(request);
    const session = await setupOwner(body);
    return withSession(NextResponse.json(session.user, { status: 201 }), session.token);
  } catch (error) {
    return fail(error);
  }
}
