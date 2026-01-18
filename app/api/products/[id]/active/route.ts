import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    
    const { isActive } = body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { 
        isActive: isActive 
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Erro ao alternar status:", error);
    return NextResponse.json(
      { error: "Erro ao mudar status de ativação" }, 
      { status: 500 }
    );
  }
}