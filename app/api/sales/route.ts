import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { createSale, listOpenSales } from "@/modules/sales/service";

export async function GET(request: Request) {
  try {
    await allow(request, "pos");
    return NextResponse.json(await listOpenSales());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await allow(request, "pos");
    const body = await readJson(request);
    const sale = await createSale(body);
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
