import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { createUser, listUsers } from "@/modules/auth/service";

export async function GET(request: Request) {
  try {
    await allow(request, "users");
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await allow(request, "users");
    const body = await readJson(request);
    const user = await createUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
