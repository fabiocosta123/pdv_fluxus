import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { payExpense } from "@/modules/finance/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const expense = await payExpense(id, body);
    return NextResponse.json(expense);
  } catch (error) {
    return fail(error);
  }
}
