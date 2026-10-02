import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { AppError } from "@/modules/shared/errors";

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("JSON inválido", 400);
  }
}

export function fail(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Código de barras já cadastrado" },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Registro não encontrado" },
        { status: 404 },
      );
    }
  }

  console.error(error);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
