import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SaleStatus } from '@prisma/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cart, payments, total, totalPaid, change } = body;

        // inicia a transação
        const result = await prisma.$transaction(async (tx) => {
            // cria a venda
            const sale = await tx.sale.create({
                data: {
                    total: Number(total),
                    totalPaid: Number(totalPaid),
                    change: Number(change),
                    status: SaleStatus.COMPLETED,
                    // cria os itens da venda
                    items: {
                        create: cart.map((item: any) => ({
                            productId: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            priceAtSale: item.price,
                            subtotal: item.subtotal,
                        }))
                    },
                    // cria os pagamentos vinculados
                    payments: {
                        create: payments.map((p: any) => ({
                            method: mapPaymentMethod(p.method),
                            amount: p.value,
                            value: p.value,
                        }))
                    }
                }
            })

            // baixa o estoque dos produtos vendidos
            for (const item of cart) {
                await tx.product.update({
                    where: { id: item.id },
                    data: {
                        stock: {
                            decrement: item.quantity,
                        }
                    }
                })
            }

            return sale;
        })

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error("ERRO_AO_SALVAR_VENDA:", error);
        return NextResponse.json({ error: 'Erro ao salvar a venda' }, { status: 500 });
    }
}

function mapPaymentMethod(method: string) {
    switch (method.toUpperCase()) {
        case 'DINHEIRO': return "MONEY";
        case 'PIX': return "PIX";
        case 'DEBITO': return "DEBIT";
        case 'CREDITO': return "CREDIT";
        default: return "OTHER";
    }
}