import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { listClosedSessions } from "@/modules/cashier/service";

export async function GET(request: Request) {
  try {
    await allow(request, "reports");
    const reports = await listClosedSessions();
    return NextResponse.json(reports);
  } catch (error) {
    return fail(error);
  }
}
