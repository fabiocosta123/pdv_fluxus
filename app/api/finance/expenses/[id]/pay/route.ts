import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { payExpense } from "@/modules/finance/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "finance");
    const { id } = await params;
    const body = await readJson(request);
    const expense = await payExpense(id, body);
    return NextResponse.json(expense);
  } catch (error) {
    return fail(error);
  }
}
