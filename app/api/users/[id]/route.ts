import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { updateUser } from "@/modules/auth/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "users");
    const { id } = await params;
    const body = await readJson(request);
    const user = await updateUser(id, body);
    return NextResponse.json(user);
  } catch (error) {
    return fail(error);
  }
}
