import { createRequire } from "node:module";

const require = createRequire(new URL("../package.json", import.meta.url));
const { Client } = require("pg");

const databaseId = "db_t90ogykr5m5iwte95465015h";
const checksum = "a6767a2278fff855846d7029b82a35b8cb46abe6a12c4d4708586c9a32a424c6";
const migrationName = "20261114131500_add_product_price_group";

function redact(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://***")
    .replace(/Bearer\s+\S+/gi, "Bearer ***");
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
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Prisma ${response.status}: ${body.error?.message || body.message || response.statusText}`);
  }
  return body;
}

async function withConnection(run) {
  const created = await prismaRequest(`/v1/databases/${databaseId}/connections`, {
    method: "POST",
    body: { name: "price-group-column" },
  });
  const connection = created.data || {};
  const url =
    connection.endpoints?.direct?.connectionString ||
    connection.endpoints?.pooled?.connectionString ||
    connection.connectionString;
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 30000 });
  try {
    await client.connect();
    return await run(client);
  } finally {
    await client.end().catch(() => {});
    if (connection.id) {
      await prismaRequest(`/v1/connections/${connection.id}`, { method: "DELETE" }).catch(() => {});
    }
  }
}

async function main() {
  if (!process.env.PRISMA_SERVICE_TOKEN) {
    console.log("Falta PRISMA_SERVICE_TOKEN");
    process.exitCode = 1;
    return;
  }
  const result = await withConnection(async (client) => {
    await client.query('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "priceGroup" TEXT');
    await client.query(
      `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
       SELECT '7b1e9c44-2a60-4d8e-8f31-0c5a6d9e2b18', $1::text, NOW(), $2::text, NULL, NULL, NOW(), 1
       WHERE NOT EXISTS (
         SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $2::text
       )`,
      [checksum, migrationName],
    );
    const column = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'priceGroup'`,
    );
    return { column: column.rowCount === 1 };
  });
  console.log(JSON.stringify({ ok: result.column, database: "minimercadodaju" }));
  if (!result.column) process.exitCode = 1;
}

main().catch((error) => {
  console.log(redact(error instanceof Error ? error.message : "falha"));
  process.exitCode = 1;
});
