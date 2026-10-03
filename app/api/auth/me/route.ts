import { NextResponse } from "next/server";
import { hasUsers } from "@/modules/auth/service";
import { sessionUser } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const user = await sessionUser(request);
    return NextResponse.json(user);
  } catch {
    const setup = !(await hasUsers());
    return NextResponse.json({ error: "Faça login", setup }, { status: 401 });
  }
}
