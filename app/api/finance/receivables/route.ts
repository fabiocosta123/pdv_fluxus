import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { listReceivableView } from "@/modules/finance/service";

export async function GET(request: Request) {
  try {
    await allow(request, "finance");
    const status = new URL(request.url).searchParams.get("status");
    const receivables = await listReceivableView(status);
    return NextResponse.json(receivables);
  } catch (error) {
    return fail(error);
  }
}
