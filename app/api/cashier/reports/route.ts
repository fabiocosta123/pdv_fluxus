import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { listClosedSessions } from "@/modules/cashier/service";

export async function GET() {
  try {
    const reports = await listClosedSessions();
    return NextResponse.json(reports);
  } catch (error) {
    return fail(error);
  }
}
