import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { getProduct, updateProduct } from "@/modules/catalog/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const product = await getProduct(id);
    return NextResponse.json(product);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const product = await updateProduct(id, body);
    return NextResponse.json(product);
  } catch (error) {
    return fail(error);
  }
}
