import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
       const products = await prisma.product.findMany();

        return NextResponse.json(products, { status: 200 });
    } catch (error: any) {
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("ERRO_AO_BUSCAR_PRODUTOS:", error.message);
        return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
    }       
    
}

export async function POST(request: Request) {
    try {
        const body = await request.json();        
        const { productName, barCode, price, stock, unit } = body;

        // Validação básica
        if (!productName || !price === undefined) {
            return NextResponse.json({ error: "Nome e preço são obrigatórios" }, { status: 400 });
        }

        const newProduct = await prisma.product.create({
            data: {
                name: productName,
                barCode: barCode || null,
                price: Number(price),
                stock: Number(stock) || 0,
                unit: (unit && unit.trim() !== "") ? unit.toLowerCase() : "un",
                isActive: true,
            }
        });
        return NextResponse.json(newProduct, { status: 201 });
    } catch (error: any) {
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("ERRO_AO_CRIAR_PRODUTO:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}