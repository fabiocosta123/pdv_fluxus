import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { getSale, updateSale } from "@/modules/sales/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "pos");
    const { id } = await params;
    return NextResponse.json(await getSale(id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "pos");
    const { id } = await params;
    const body = await readJson(request);
    const sale = await updateSale(id, body);
    return NextResponse.json(sale);
  } catch (error) {
    return fail(error);
  }
}
