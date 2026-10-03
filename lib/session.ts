import { NextResponse } from "next/server";
import { authorize, userFromToken } from "@/modules/auth/service";
import type { Area } from "@/modules/auth/access";

export const SESSION_COOKIE = "fluxus_session";
const SESSION_MAX_AGE = 60 * 60 * 12;

export function readSessionToken(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function withSession(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export function withoutSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function allow(request: Request, area: Area) {
  return authorize(readSessionToken(request), area);
}

export async function sessionUser(request: Request) {
  return userFromToken(readSessionToken(request));
}
