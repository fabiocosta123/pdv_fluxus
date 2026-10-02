import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { searchProducts } from "@/modules/catalog/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const products = await searchProducts(code);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Produto não encontrado no estoque" },
        { status: 404 },
      );
    }

    return NextResponse.json(products);
  } catch (error) {
    return fail(error);
  }
}
