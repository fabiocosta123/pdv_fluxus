import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { getPixStatus } from "@/modules/pix/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "pos");
    const { id } = await params;
    const status = await getPixStatus(id);
    return NextResponse.json(status);
  } catch (error) {
    return fail(error);
  }
}
