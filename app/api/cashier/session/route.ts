import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { getOpenSession, openCashier } from "@/modules/cashier/service";

export async function GET() {
  try {
    const session = await getOpenSession();
    return NextResponse.json(session);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const session = await openCashier(body);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
