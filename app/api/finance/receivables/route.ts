import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { listReceivables } from "@/modules/finance/service";

export async function GET() {
  try {
    const receivables = await listReceivables();
    return NextResponse.json(receivables);
  } catch (error) {
    return fail(error);
  }
}
