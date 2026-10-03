import QRCode from "qrcode";
import { isValidDocument, onlyDigits } from "@/modules/customers/document";
import { AppError } from "@/modules/shared/errors";
import { parse } from "@/modules/shared/validation";
import { createPixSchema } from "./schema";

const PIX_TRANSACTION = 11;
const PIX_METHOD = 18;
const TOKEN_TTL_MS = 36 * 60 * 60 * 1000;

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

type PixData = {
  retUrl?: string;
  expira?: string;
  retTexto?: string;
};

type MyCreditBody = {
  sucesso?: boolean;
  data?: string | PixData;
  errors?: string;
};

function apiBase() {
  return (process.env.MYCREDIT_API_URL || "https://sandboxapi.mycredit.com.br").replace(/\/$/, "");
}

export function pixUsesSandbox() {
  return apiBase().includes("sandboxapi.mycredit.com.br");
}

function credentials() {
  const cnpj = onlyDigits(process.env.MYCREDIT_CNPJ ?? "");
  const key = process.env.MYCREDIT_INTEGRATOR_KEY?.trim() ?? "";
  if (!cnpj || !key) {
    throw new AppError("PIX da myCredit ainda não está configurado", 503);
  }
  return { cnpj, key };
}

async function readBody(response: Response): Promise<MyCreditBody> {
  return response.json().catch(() => ({}));
}

function failure(body: MyCreditBody, fallback: string, status: number): never {
  throw new AppError(body.errors || fallback, status);
}

async function bearer(force = false) {
  if (!force && tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const { cnpj, key } = credentials();
  const secret = Buffer.from(`${cnpj}|${key}`).toString("base64");
  const response = await fetch(`${apiBase()}/api/token/${encodeURIComponent(secret)}`);
  const body = await readBody(response);
  if (!response.ok || !body.sucesso || typeof body.data !== "string" || !body.data) {
    tokenCache = null;
    failure(body, "Não foi possível autenticar o PIX", response.status || 502);
  }

  tokenCache = { token: body.data, expiresAt: Date.now() + TOKEN_TTL_MS };
  return body.data;
}

async function myCredit(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await bearer();
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry) {
    await bearer(true);
    return myCredit(path, init, false);
  }
  return response;
}

export async function createPixCharge(input: unknown) {
  const data = parse(createPixSchema, input);
  const id = crypto.randomUUID();
  const payload: {
    formaPagamento: {
      tpTransacao: number;
      idFaturaPag: string;
      modPagamento: number;
      valorPagamento: number;
    };
    cliente?: { xNome: string; documento: string };
  } = {
    formaPagamento: {
      tpTransacao: PIX_TRANSACTION,
      idFaturaPag: id,
      modPagamento: PIX_METHOD,
      valorPagamento: Number((data.amount / 100).toFixed(2)),
    },
  };

  const document = onlyDigits(data.document ?? "");
  if (data.customerName && isValidDocument(document)) {
    payload.cliente = { xNome: data.customerName, documento: document };
  }

  const response = await myCredit("/api/pix", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const body = await readBody(response);
  const charge = typeof body.data === "object" ? body.data : null;
  const copyPaste = charge?.retUrl;
  if (!response.ok || !body.sucesso || !copyPaste) {
    failure(body, "Não foi possível gerar o PIX", response.status || 502);
  }

  const qrCode = await QRCode.toDataURL(copyPaste, { width: 280, margin: 1 });
  return {
    id,
    payload: copyPaste,
    qrCode,
    expiresAt: charge?.expira ?? null,
    amount: data.amount,
    sandbox: pixUsesSandbox(),
  };
}

export async function getPixStatus(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("Cobrança PIX inválida", 400);
  const response = await myCredit(`/api/pix/${id}`);
  if (response.status === 410) return { paid: false as const };
  const body = await readBody(response);
  if (response.status === 200 && body.sucesso) return { paid: true as const };
  failure(body, "Não foi possível consultar o PIX", response.status || 502);
}

export async function simulatePixPayment(id: string) {
  if (!pixUsesSandbox()) throw new AppError("A simulação só existe no sandbox", 400);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("Cobrança PIX inválida", 400);
  const response = await myCredit(`/api/pix/simular-pagamento/${id}`, {
    method: "POST",
    body: "{}",
  });
  const body = await readBody(response);
  if (!response.ok || !body.sucesso) {
    failure(body, "Não foi possível simular o pagamento", response.status || 502);
  }
  return { paid: true as const };
}
