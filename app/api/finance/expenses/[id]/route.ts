import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { deleteExpense } from "@/modules/finance/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "finance");
    const { id } = await params;
    await deleteExpense(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return fail(error);
  }
}
