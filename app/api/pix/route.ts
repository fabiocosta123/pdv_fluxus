import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { createPixCharge } from "@/modules/pix/service";

export async function POST(request: Request) {
  try {
    await allow(request, "pos");
    const charge = await createPixCharge(await readJson(request));
    return NextResponse.json(charge, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
