import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { receiveCustomerPayment } from "@/modules/customers/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const payment = await receiveCustomerPayment(id, body);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
