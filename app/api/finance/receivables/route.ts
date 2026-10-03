import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { listReceivables } from "@/modules/finance/service";

export async function GET(request: Request) {
  try {
    await allow(request, "finance");
    const receivables = await listReceivables();
    return NextResponse.json(receivables);
  } catch (error) {
    return fail(error);
  }
}
