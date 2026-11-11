import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { suggestPurchases } from "@/modules/purchases/service";

export async function GET(request: Request) {
  try {
    await allow(request, "inventory");
    return NextResponse.json(await suggestPurchases());
  } catch (error) {
    return fail(error);
  }
}
