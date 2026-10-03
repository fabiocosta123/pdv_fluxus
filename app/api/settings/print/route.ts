import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { allow } from "@/lib/session";
import { updatePrint } from "@/modules/settings/service";

export async function PATCH(request: Request) {
  try {
    await allow(request, "settings");
    const body = await readJson(request);
    const settings = await updatePrint(body);
    return NextResponse.json(settings);
  } catch (error) {
    return fail(error);
  }
}
