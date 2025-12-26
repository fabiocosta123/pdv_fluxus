import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const stockProducts = await prisma.product.findMany({orderBy: [{stock: 'asc'}, {name: 'asc'}]});
        return NextResponse.json(stockProducts, { status: 200 });
    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("ERRO_AO_BUSCAR_PRODUTOS:", error);
        return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
    }       
    
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productName, barCode, price, stock, unit } = body;

        // Validação básica
        if (!productName || !price) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newProduct = await prisma.product.create({
            data: {
                name: productName,
                barCode,
                price: parseInt(price),
                stock: parseInt(stock),
                unit
            }
        });
        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("ERRO_AO_CRIAR_PRODUTO:", error);
        return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
    }
}