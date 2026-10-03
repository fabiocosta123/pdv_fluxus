import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/modules/shared/errors";
import { parse } from "@/modules/shared/validation";
import { can, type Area } from "./access";
import { createUserSchema, loginSchema, setupSchema, updateUserSchema } from "./schema";
import { ROLE_LABELS, type AuthUser } from "./types";

const SESSION_MS = 12 * 60 * 60 * 1000;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const current = Buffer.from(hash, "hex");
  if (next.length !== current.length) return false;
  return timingSafeEqual(next, current);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toPublic(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    active: user.active,
  };
}

async function openSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_MS),
    },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return { token, user: toPublic(user) };
}

export async function hasUsers() {
  const count = await prisma.user.count();
  return count > 0;
}

export async function setupOwner(input: unknown) {
  if (await hasUsers()) throw new AppError("O proprietário já foi criado", 409);
  const data = parse(setupSchema, input);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      passwordHash: hashPassword(data.password),
      role: "OWNER",
    },
  });
  return openSession(user.id);
}

export async function login(input: unknown) {
  const data = parse(loginSchema, input);
  const user = await prisma.user.findUnique({ where: { username: data.username } });
  if (!user || !user.active || !checkPassword(data.password, user.passwordHash)) {
    throw new AppError("Usuário ou senha inválidos", 401);
  }
  return openSession(user.id);
}

export async function logout(token: string | null) {
  if (!token) return;
  await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function userFromToken(token: string | null) {
  if (!token) throw new AppError("Faça login", 401);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) {
    if (session) await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    throw new AppError("Faça login", 401);
  }
  return toPublic(session.user);
}

export async function authorize(token: string | null, area: Area) {
  const user = await userFromToken(token);
  if (!can(user.role, area)) throw new AppError("Sem permissão para esta função", 403);
  return user;
}

export async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map(toPublic);
}

export async function createUser(input: unknown) {
  const data = parse(createUserSchema, input);
  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) throw new AppError("Esse usuário já existe", 409);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      passwordHash: hashPassword(data.password),
      role: data.role,
    },
  });
  return toPublic(user);
}

export async function updateUser(id: string, input: unknown) {
  const data = parse(updateUserSchema, input);
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new AppError("Usuário não encontrado", 404);

  if (data.password !== undefined && data.password.length > 0 && data.password.length < 6) {
    throw new AppError("A senha precisa ter pelo menos 6 caracteres", 400);
  }

  const nextRole = (data.role ?? current.role) as UserRole;
  const nextActive = data.active ?? current.active;
  if (current.role === "OWNER" && current.active && !(nextRole === "OWNER" && nextActive)) {
    const others = await prisma.user.count({
      where: { role: "OWNER", active: true, NOT: { id } },
    });
    if (others === 0) throw new AppError("Precisa existir um proprietário ativo", 409);
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      role: data.role,
      active: data.active,
      passwordHash: data.password ? hashPassword(data.password) : undefined,
    },
  });

  if (!nextActive) {
    await prisma.authSession.deleteMany({ where: { userId: id } });
  }

  return toPublic(user);
}
