import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { getCustomer, updateCustomer } from "@/modules/customers/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const customer = await getCustomer(id);
    return NextResponse.json(customer);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const customer = await updateCustomer(id, body);
    return NextResponse.json(customer);
  } catch (error) {
    return fail(error);
  }
}
