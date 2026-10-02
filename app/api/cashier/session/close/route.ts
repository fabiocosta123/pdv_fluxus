import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { closeCashier } from "@/modules/cashier/service";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const report = await closeCashier(body);
    return NextResponse.json(report);
  } catch (error) {
    return fail(error);
  }
}
