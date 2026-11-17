import { createRequire } from "node:module";

const require = createRequire(new URL("../package.json", import.meta.url));
const { Client } = require("pg");

const databaseId = "db_t90ogykr5m5iwte95465015h";

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
    body: { name: "stock-value" },
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
    const products = await client.query(`
      SELECT
        COUNT(*)::int AS products,
        COUNT(*) FILTER (WHERE "isActive")::int AS active,
        COUNT(*) FILTER (WHERE stock > 0)::int AS in_stock,
        COUNT(*) FILTER (WHERE stock > 0 AND "costPrice" = 0)::int AS stock_without_cost,
        COALESCE(SUM(CASE WHEN stock > 0 THEN stock * price ELSE 0 END), 0)::bigint AS gross_cents,
        COALESCE(SUM(CASE WHEN stock > 0 THEN stock * "costPrice" ELSE 0 END), 0)::bigint AS cost_cents
      FROM "Product"
    `);
    const expenses = await client.query(`
      SELECT status::text AS status, COUNT(*)::int AS bills, COALESCE(SUM(amount), 0)::bigint AS amount_cents
      FROM "Expense"
      GROUP BY status
      ORDER BY status
    `);
    return { products: products.rows[0], expenses: expenses.rows };
  });
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.log(redact(error instanceof Error ? error.message : "falha"));
  process.exitCode = 1;
});
