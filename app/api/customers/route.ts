import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { createCustomer, listCustomers } from "@/modules/customers/service";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const customers = await listCustomers(query);
    return NextResponse.json(customers);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const customer = await createCustomer(body);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
