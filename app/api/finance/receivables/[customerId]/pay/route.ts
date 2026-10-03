import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { settleReceivable } from "@/modules/finance/service";

type RouteContext = { params: Promise<{ customerId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await allow(request, "finance");
    const { customerId } = await params;
    const body = await readJson(request);
    const receipt = await settleReceivable(customerId, body, user.id);
    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
