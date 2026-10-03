import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { createExpense, getFinanceSummary } from "@/modules/finance/service";

export async function GET(request: Request) {
  try {
    await allow(request, "finance");
    const url = new URL(request.url);
    const summary = await getFinanceSummary(
      url.searchParams.get("from"),
      url.searchParams.get("to"),
    );
    return NextResponse.json(summary);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await allow(request, "finance");
    const body = await readJson(request);
    const expense = await createExpense(body);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
