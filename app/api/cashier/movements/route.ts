import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { registerMovement } from "@/modules/cashier/service";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const movement = await registerMovement(body);
    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
