import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { previewOpenCashier } from "@/modules/cashier/service";

export async function GET(request: Request) {
  try {
    await allow(request, "pos");
    const expected = await previewOpenCashier();
    if (!expected) return NextResponse.json({ error: "Não há caixa aberto" }, { status: 409 });
    return NextResponse.json(expected);
  } catch (error) {
    return fail(error);
  }
}
