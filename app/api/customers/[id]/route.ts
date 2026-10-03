import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { getCustomer, updateCustomer } from "@/modules/customers/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "pos");
    const { id } = await params;
    const customer = await getCustomer(id);
    return NextResponse.json(customer);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await allow(request, "customers");
    const { id } = await params;
    const body = await readJson(request);
    const customer = await updateCustomer(id, body);
    return NextResponse.json(customer);
  } catch (error) {
    return fail(error);
  }
}
