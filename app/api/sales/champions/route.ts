import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { listChampions } from "@/modules/sales/service";

export async function GET(request: Request) {
  try {
    await allow(request, "pos");
    return NextResponse.json(await listChampions());
  } catch (error) {
    return fail(error);
  }
}
