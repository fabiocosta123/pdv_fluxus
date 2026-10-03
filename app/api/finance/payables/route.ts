import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { listPayables } from "@/modules/finance/service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const expenses = await listPayables(url.searchParams.get("status"));
    return NextResponse.json(expenses);
  } catch (error) {
    return fail(error);
  }
}
