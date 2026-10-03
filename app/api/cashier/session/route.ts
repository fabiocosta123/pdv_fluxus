import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { getOpenSession, openCashier } from "@/modules/cashier/service";

export async function GET(request: Request) {
  try {
    await allow(request, "pos");
    const session = await getOpenSession();
    return NextResponse.json(session);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await allow(request, "pos");
    const body = await readJson(request);
    const session = await openCashier(body);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
