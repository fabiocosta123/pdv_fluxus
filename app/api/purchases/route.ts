import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { purchaseQuerySchema } from "@/modules/purchases/schema";
import { suggestPurchases } from "@/modules/purchases/service";
import { AppError } from "@/modules/shared/errors";

export async function GET(request: Request) {
  try {
    await allow(request, "inventory");
    const url = new URL(request.url);
    const parsed = purchaseQuerySchema.safeParse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Período inválido", 400);
    const { from, to } = parsed.data;
    return NextResponse.json(await suggestPurchases(from && to ? { from, to } : undefined));
  } catch (error) {
    return fail(error);
  }
}
