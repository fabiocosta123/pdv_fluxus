import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { listPayables } from "@/modules/finance/service";

export async function GET(request: Request) {
  try {
    await allow(request, "finance");
    const url = new URL(request.url);
    const expenses = await listPayables(url.searchParams.get("status"));
    return NextResponse.json(expenses);
  } catch (error) {
    return fail(error);
  }
}
