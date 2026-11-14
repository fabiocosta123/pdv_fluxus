import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { Client } = require("pg");

const dryRun = process.argv.includes("--dry-run");
const statePath = process.env.BACKUP_STATE_PATH || ".backup-state.json";

const neonProjectId = process.env.NEON_PROJECT_ID || "icy-tooth-60717071";
const neonTargets = [
  { key: "production", parentName: "production", backupName: "backup-producao" },
  { key: "development", parentName: "development", backupName: "backup-desenvolvimento" },
];
const preservedNeonBranches = new Set([
  "production",
  "development",
  "backup-production-2026-11-14",
  "backup-development-2026-11-14",
]);

const prismaProjectId = "proj_yt5i70day4bt6pqfuvocs5hj";
const prismaLiveDatabaseId = "db_t90ogykr5m5iwte95465015h";
const prismaAnchorBranch = "backup-2026-11-14";
const prismaAutoPrefix = "backup-auto-";

const fingerprintSql = `
  SELECT
    (SELECT count(*)::int FROM "Product") AS products,
    (SELECT count(*)::int FROM "Sale") AS sales,
    (SELECT count(*)::int FROM "Customer") AS customers,
    (SELECT count(*)::int FROM "Expense") AS expenses,
    (SELECT count(*)::int FROM "CashMovement") AS movements,
    (SELECT coalesce(to_char(max("updatedAt") AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), '') FROM "Product") AS product_at,
    (SELECT coalesce(to_char(max("updatedAt") AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), '') FROM "Sale") AS sale_at,
    (SELECT coalesce(to_char(max("updatedAt") AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), '') FROM "Expense") AS expense_at,
    (SELECT coalesce(to_char(max("createdAt") AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), '') FROM "CashMovement") AS movement_at
`;

function log(message) {
  console.log(message);
}

function redact(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://***")
    .replace(/prisma\+\S+/gi, "prisma+***")
    .replace(/Bearer\s+\S+/gi, "Bearer ***");
}

function sameFingerprint(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function copyKeepsTheData(live, copied) {
  if (!live || !copied || isWipe(live, copied)) return false;
  for (const key of ["products", "sales", "customers", "expenses", "movements"]) {
    if (Number(copied[key] ?? 0) < Number(live[key] ?? 0)) return false;
  }
  return true;
}

function isWipe(previous, current) {
  if (!previous || !current) return false;
  for (const key of ["products", "sales", "customers", "expenses", "movements"]) {
    const before = Number(previous[key] ?? 0);
    const after = Number(current[key] ?? 0);
    if (before > 0 && after === 0) return true;
    if (before >= 4 && after * 2 < before) return true;
  }
  return false;
}

function describe(fingerprint) {
  if (!fingerprint) return "sem leitura";
  return `${fingerprint.products} produtos, ${fingerprint.sales} vendas, ${fingerprint.customers} clientes, ${fingerprint.expenses} despesas`;
}

async function readState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return {};
  }
}

async function writeState(state) {
  if (dryRun) return;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fingerprint(connectionString) {
  const client = new Client({ connectionString, connectionTimeoutMillis: 30000 });
  try {
    await client.connect();
    const result = await client.query(fingerprintSql);
    return result.rows[0];
  } finally {
    await client.end().catch(() => {});
  }
}

async function ping(connectionString) {
  const client = new Client({ connectionString, connectionTimeoutMillis: 30000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
  } finally {
    await client.end().catch(() => {});
  }
}

async function pingWithRetry(connectionString) {
  let lastError = new Error("Não consegui ler o banco");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await ping(connectionString);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
      await sleep(4000 * attempt);
    }
  }
  throw lastError;
}

function pgEnv(connectionString) {
  const url = new URL(connectionString);
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
    PGSSLMODE: "require",
  };
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(redact(stderr).slice(0, 500) || `${command} falhou`));
    });
  });
}

async function copyDatabase(liveUrl, copyUrl) {
  const directory = await mkdtemp(join(tmpdir(), "fluxus-backup-"));
  const file = join(directory, "backup.sql");
  try {
    await runCommand(
      "pg_dump",
      ["--file", file, "--format=plain", "--no-owner", "--no-acl"],
      pgEnv(liveUrl),
    );
    await runCommand("psql", ["--file", file, "--set", "ON_ERROR_STOP=1"], pgEnv(copyUrl));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function neonRequest(path, options = {}) {
  const response = await fetch(`https://console.neon.tech/api/v2${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${process.env.NEON_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 180) };
    }
  }
  if (!response.ok) {
    throw new Error(`Neon ${response.status}: ${body.message || response.statusText}`);
  }
  return body;
}

async function listNeonBranches() {
  const body = await neonRequest(`/projects/${neonProjectId}/branches`);
  return body.branches || [];
}

async function deleteNeonEndpoints(branchId) {
  const body = await neonRequest(`/projects/${neonProjectId}/endpoints`);
  const endpoints = (body.endpoints || []).filter((endpoint) => endpoint.branch_id === branchId);
  for (const endpoint of endpoints) {
    await neonRequest(`/projects/${neonProjectId}/endpoints/${endpoint.id}`, { method: "DELETE" });
  }
}

async function ensureRollingBranch(parent, backupName) {
  const branches = await listNeonBranches();
  const existing = branches.find((branch) => branch.name === backupName);
  if (existing) return existing;
  if (preservedNeonBranches.has(backupName)) {
    throw new Error(`A branch ${backupName} está protegida`);
  }
  if (dryRun) {
    log(`pdv-fluxus ${parent.name}: criaria a cópia ${backupName}`);
    return null;
  }
  let created;
  try {
    created = await neonRequest(`/projects/${neonProjectId}/branches`, {
      method: "POST",
      body: {
        branch: { name: backupName, parent_id: parent.id },
        endpoints: [],
      },
    });
  } catch (error) {
    if (!String(error.message).toLowerCase().includes("endpoint")) throw error;
    created = await neonRequest(`/projects/${neonProjectId}/branches`, {
      method: "POST",
      body: { branch: { name: backupName, parent_id: parent.id } },
    });
  }
  const branch = created.branch;
  await deleteNeonEndpoints(branch.id).catch(() => {});
  log(`pdv-fluxus ${parent.name}: cópia ${backupName} criada`);
  return branch;
}

async function restoreRollingBranch(parent, backup) {
  if (!backup) return;
  if (backup.id === parent.id || preservedNeonBranches.has(backup.name)) {
    throw new Error(`Recusei atualizar a branch ${backup.name}`);
  }
  if (dryRun) {
    log(`pdv-fluxus ${parent.name}: atualizaria a cópia ${backup.name}`);
    return;
  }
  const restored = await neonRequest(`/projects/${neonProjectId}/branches/${backup.id}/restore`, {
    method: "POST",
    body: { source_branch_id: parent.id },
  });
  for (const operation of restored.operations || []) {
    const deadline = Date.now() + 120000;
    let status = operation.status;
    while (status && !["finished", "completed", "skipped"].includes(status)) {
      if (Date.now() > deadline) throw new Error(`A atualização de ${backup.name} passou do tempo`);
      if (["failed", "error", "cancelled"].includes(status)) {
        throw new Error(`A atualização de ${backup.name} falhou`);
      }
      await sleep(2000);
      const current = await neonRequest(`/projects/${neonProjectId}/operations/${operation.id}`);
      status = current.operation?.status || current.status;
    }
  }
  await deleteNeonEndpoints(backup.id).catch(() => {});
  log(`pdv-fluxus ${parent.name}: cópia ${backup.name} atualizada`);
}

async function backupNeon(state) {
  if (!process.env.NEON_API_KEY) {
    log("pdv-fluxus: falta a chave NEON_API_KEY no GitHub");
    return { ok: false, missing: true };
  }
  const branches = await listNeonBranches();
  let failed = false;
  for (const target of neonTargets) {
    const parent = branches.find((branch) => branch.name === target.parentName);
    if (!parent) {
      log(`pdv-fluxus: não encontrei a branch ${target.parentName}`);
      failed = true;
      continue;
    }
    const uri = await neonRequest(
      `/projects/${neonProjectId}/connection_uri?branch_id=${parent.id}&database_name=neondb&role_name=neondb_owner&pooled=false`,
    );
    const connectionString = uri.uri || uri.connection_uri;
    if (!connectionString) throw new Error("Neon não devolveu o endereço do banco");
    const live = await fingerprint(connectionString);
    const previous = state.neon?.[target.key];
    if (previous && sameFingerprint(previous, live)) {
      log(`pdv-fluxus ${target.parentName}: sem mudança (${describe(live)})`);
      continue;
    }
    if (isWipe(previous, live)) {
      log(`pdv-fluxus ${target.parentName}: queda grande nos dados. A cópia foi mantida (${describe(previous)})`);
      failed = true;
      continue;
    }
    const backup = await ensureRollingBranch(parent, target.backupName);
    await restoreRollingBranch(parent, backup);
    state.neon = { ...state.neon, [target.key]: live };
    await writeState(state);
  }
  return { ok: !failed, missing: false };
}

async function prismaRequest(path, options = {}) {
  const response = await fetch(`https://api.prisma.io${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${process.env.PRISMA_SERVICE_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 180) };
    }
  }
  if (!response.ok) {
    const message = body.error?.message || body.message || response.statusText;
    throw new Error(`Prisma ${response.status}: ${message}`);
  }
  return body;
}

async function listPrismaDatabases() {
  const databases = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ projectId: prismaProjectId });
    if (cursor) query.set("cursor", cursor);
    const body = await prismaRequest(`/v1/databases?${query.toString()}`);
    databases.push(...(body.data || []));
    cursor = body.pagination?.hasMore ? body.pagination.nextCursor : "";
  } while (cursor);
  return databases;
}

async function listPrismaBranches() {
  const branches = [];
  let cursor = "";
  do {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    const suffix = query.size ? `?${query.toString()}` : "";
    const body = await prismaRequest(`/v1/projects/${prismaProjectId}/branches${suffix}`);
    branches.push(...(body.data || []));
    cursor = body.pagination?.hasMore ? body.pagination.nextCursor : "";
  } while (cursor);
  return branches;
}

function branchNameOf(database, branches) {
  return (
    database.branchGitName ||
    database.branch?.gitName ||
    database.branch?.name ||
    branches.find((branch) => branch.id === database.branchId)?.gitName ||
    branches.find((branch) => branch.id === database.branchId)?.name ||
    ""
  );
}

async function withPrismaConnection(databaseId, read) {
  const created = await prismaRequest(`/v1/databases/${databaseId}/connections`, {
    method: "POST",
    body: { name: "backup-check" },
  });
  const connection = created.data || {};
  const connectionId = connection.id;
  const urls = [
    connection.endpoints?.direct?.connectionString,
    connection.endpoints?.pooled?.connectionString,
    connection.connectionString,
  ].filter((url) => typeof url === "string" && (url.startsWith("postgres://") || url.startsWith("postgresql://")));
  try {
    if (urls.length === 0) throw new Error("A conexão de conferência não veio em formato Postgres");
    await sleep(3000);
    let chosen = "";
    let lastError = new Error("Não consegui ler o banco");
    for (const url of urls) {
      try {
        await pingWithRetry(url);
        chosen = url;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : lastError;
      }
    }
    if (!chosen) throw lastError;
    return await read(chosen);
  } finally {
    if (connectionId) {
      await prismaRequest(`/v1/connections/${connectionId}`, { method: "DELETE" }).catch(() => {});
    }
  }
}

async function waitUntilReady(databaseId) {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const body = await prismaRequest(`/v1/databases/${databaseId}`);
    const status = body.data?.status;
    if (status === "ready" || status === "default") return body.data;
    if (status === "failure" || status === "error" || status === "failed") {
      throw new Error("A cópia do minimercadodaju não ficou pronta");
    }
    await sleep(3000);
  }
  throw new Error("A cópia do minimercadodaju passou do tempo");
}

async function backupPrisma(state) {
  if (!process.env.PRISMA_SERVICE_TOKEN) {
    log("minimercadodaju: falta o token PRISMA_SERVICE_TOKEN no GitHub");
    return { ok: false, missing: true };
  }
  const [databases, branches] = await Promise.all([listPrismaDatabases(), listPrismaBranches()]);
  const live = databases.find((database) => database.id === prismaLiveDatabaseId && database.isDefault);
  if (!live) {
    log("minimercadodaju: o banco em uso não foi encontrado");
    return { ok: false, missing: false };
  }
  const liveFingerprint = await withPrismaConnection(live.id, fingerprint);
  const previous = state.prisma;
  if (previous && sameFingerprint(previous, liveFingerprint)) {
    log(`minimercadodaju: sem mudança (${describe(liveFingerprint)})`);
    return { ok: true, missing: false };
  }
  if (isWipe(previous, liveFingerprint)) {
    log(`minimercadodaju: queda grande nos dados. A cópia foi mantida (${describe(previous)})`);
    return { ok: false, missing: false };
  }

  const copies = databases
    .filter((database) => database.id !== live.id && !database.isDefault)
    .map((database) => ({ ...database, branchName: branchNameOf(database, branches) }));
  const autos = copies
    .filter((database) => database.branchName.startsWith(prismaAutoPrefix))
    .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
  const anchor = copies.find((database) => database.branchName === prismaAnchorBranch);
  const reference = autos.at(-1) || anchor;
  if (!previous && reference) {
    const referenceFingerprint = await withPrismaConnection(reference.id, fingerprint);
    if (sameFingerprint(referenceFingerprint, liveFingerprint)) {
      log(`minimercadodaju: sem mudança (${describe(liveFingerprint)})`);
      state.prisma = liveFingerprint;
      await writeState(state);
      return { ok: true, missing: false };
    }
    if (isWipe(referenceFingerprint, liveFingerprint)) {
      log(`minimercadodaju: queda grande nos dados. A cópia foi mantida (${describe(referenceFingerprint)})`);
      return { ok: false, missing: false };
    }
  }

  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date())
    .replace(/\D/g, "")
    .slice(0, 12);
  const branchGitName = `${prismaAutoPrefix}${stamp}`;
  if (dryRun) {
    log(`minimercadodaju: criaria a cópia ${branchGitName} (${describe(liveFingerprint)})`);
    return { ok: true, missing: false };
  }

  const created = await prismaRequest("/v1/databases", {
    method: "POST",
    body: {
      projectId: prismaProjectId,
      region: "us-east-1",
      name: `backup-minimercadodaju-${stamp}`,
      isDefault: false,
      source: { type: "empty" },
      branchGitName,
    },
  });
  const createdId = created.data?.id;
  if (!createdId || createdId === live.id) throw new Error("A cópia nova veio sem identificação");
  try {
    await waitUntilReady(createdId);
    await withPrismaConnection(live.id, async (liveUrl) => {
      await withPrismaConnection(createdId, async (copyUrl) => {
        await copyDatabase(liveUrl, copyUrl);
      });
    });
    const copied = await withPrismaConnection(createdId, fingerprint);
    if (!copyKeepsTheData(liveFingerprint, copied)) {
      log(`minimercadodaju: conferência rejeitada. Em uso: ${describe(liveFingerprint)}. Cópia: ${describe(copied)}`);
      throw new Error("A cópia nova não conferiu com o banco em uso");
    }
  } catch (error) {
    await prismaRequest(`/v1/databases/${createdId}`, { method: "DELETE" }).catch(() => {});
    throw error;
  }

  for (const database of autos) {
    if (database.id === createdId || database.id === live.id || database.isDefault) continue;
    if (!database.branchName.startsWith(prismaAutoPrefix)) continue;
    await prismaRequest(`/v1/databases/${database.id}`, { method: "DELETE" });
  }
  state.prisma = liveFingerprint;
  await writeState(state);
  log(`minimercadodaju: cópia ${branchGitName} pronta (${describe(liveFingerprint)})`);
  return { ok: true, missing: false };
}

async function main() {
  const state = await readState();
  await writeState(state);
  const results = [];
  try {
    results.push(await backupNeon(state));
  } catch (error) {
    log(`pdv-fluxus: ${redact(error instanceof Error ? error.message : "falha")}`);
    results.push({ ok: false, missing: false });
  }
  try {
    results.push(await backupPrisma(state));
  } catch (error) {
    log(`minimercadodaju: ${redact(error instanceof Error ? error.message : "falha")}`);
    results.push({ ok: false, missing: false });
  }
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

main().catch((error) => {
  log(redact(error instanceof Error ? error.message : "falha"));
  process.exitCode = 1;
});
