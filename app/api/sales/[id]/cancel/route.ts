import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { cancelSale } from "@/modules/sales/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "pos");
    const { id } = await params;
    const sale = await cancelSale(id);
    return NextResponse.json(sale);
  } catch (error) {
    return fail(error);
  }
}
