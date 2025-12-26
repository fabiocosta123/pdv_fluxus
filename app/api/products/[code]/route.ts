import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toast } from 'sonner';

export async function GET(request: Request, 
    { params }: { params: Promise<{ code: string }> }
)
{
    try {
        const resolvedParams = await params;
        const code = resolvedParams.code.trim();

        const searchInput = decodeURIComponent(resolvedParams.code).trim();



        const product = await prisma.product.findFirst({
            where: {
                OR: [
                    { barCode: searchInput },
                    { name : {
                        contains: searchInput,
                        mode: 'insensitive'
                    }}
                ]
            }
        });

        if (!product) {
            return NextResponse.json(
                { message: 'Produto não encontrado no estoque' },
                { status: 404 }
            );
        }

        return NextResponse.json(product, { status: 200 });
    } catch (error) {
        console.error('Erro ao buscar o produto:', error);      
        return NextResponse.json(
            { message: 'Erro ao buscar o produto' },
            { status: 500 }
        );
    }
}