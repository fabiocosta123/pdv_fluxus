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