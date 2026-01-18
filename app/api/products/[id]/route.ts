import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

// GET: Busca o produto para preencher o formulário de edição
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await params; 
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar produto" }, { status: 500 });
  }
}

// PATCH: Atualiza os dados do produto
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {    
    const { id } = await params; 
    const body = await request.json();
    const { name, price, costPrice, stock, barCode } = body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        price,
        costPrice,
        stock,
        barCode,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 });
  }
}