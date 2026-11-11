import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { listSales } from "@/modules/sales/service";

export async function GET(request: Request) {
  try {
    await allow(request, "pos");
    const url = new URL(request.url);
    const history = await listSales({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      fromTime: url.searchParams.get("fromTime"),
      toTime: url.searchParams.get("toTime"),
    });
    return NextResponse.json(history);
  } catch (error) {
    return fail(error);
  }
}
