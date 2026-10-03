import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { createProduct, listProducts } from "@/modules/catalog/service";

export async function GET(request: Request) {
  try {
    await allow(request, "pos");
    const products = await listProducts();
    return NextResponse.json(products);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await allow(request, "inventory");
    const body = await readJson(request);
    const product = await createProduct(body);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
