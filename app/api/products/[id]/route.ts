import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { getProduct, updateProduct } from "@/modules/catalog/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "pos");
    const { id } = await params;
    const product = await getProduct(id);
    return NextResponse.json(product);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "inventory");
    const { id } = await params;
    const body = await readJson(request);
    const product = await updateProduct(id, body);
    return NextResponse.json(product);
  } catch (error) {
    return fail(error);
  }
}
