import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { setProductActive } from "@/modules/catalog/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const product = await setProductActive(id, body);
    return NextResponse.json(product);
  } catch (error) {
    return fail(error);
  }
}
