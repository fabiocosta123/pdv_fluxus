import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { allow } from "@/lib/session";
import { getSettings } from "@/modules/settings/service";

export async function GET(request: Request) {
  try {
    await allow(request, "pos");
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return fail(error);
  }
}
