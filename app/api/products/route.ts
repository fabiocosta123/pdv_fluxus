import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" }, // traz em ordem alfabética
    });
    return NextResponse.json(products, { status: 200 });
  } catch (error: any) {
    console.error("ERRO_AO_BUSCAR_PRODUTOS:", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productName, barCode, price, costPrice, stock, unit } = body;

    // Validação corrigida: verifica se productName existe e se price não é undefined/null
    if (!productName || price === undefined || price === null) {
      return NextResponse.json(
        { error: "Nome e preço de venda são obrigatórios" },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name: productName,
        barCode: barCode || null,
        price: Number(price),
        costPrice: Number(costPrice) || 0,
        stock: Number(stock) || 0,
        unit: unit && unit.trim() !== "" ? unit.toLowerCase() : "un",
        isActive: true,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("ERRO_AO_CRIAR_PRODUTO:", error);

    // Se der erro de campo inexistente no Prisma, ele cairá aqui
    return NextResponse.json(
      {
        error:
          "Erro ao salvar no banco. Verifique se as migrações foram feitas.",
      },
      { status: 400 }
    );
  }
}
