/* eslint-disable no-console */
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in server/.env");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const { rows: pidRows } = await client.query("SELECT pg_backend_pid() AS pid");
  const selfPid = Number(pidRows[0]?.pid);

  const { rows } = await client.query(`
    SELECT pid, usename, application_name, state, left(query, 160) AS query
    FROM pg_stat_activity
    WHERE pid <> ${selfPid}
      AND query ILIKE '%pg_advisory_lock(72707369)%'
      AND query NOT ILIKE '%pg_stat_activity%'
    ORDER BY pid
  `);

  if (!rows.length) {
    console.log("No advisory lock holders found.");
    await client.end();
    return;
  }

  console.log("Advisory lock holders found. Terminating...");
  for (const row of rows) {
    console.log(row);
    try {
      const result = await client.query("SELECT pg_terminate_backend($1) AS terminated", [row.pid]);
      console.log("Terminated pid", row.pid, "=>", result.rows[0]?.terminated);
    } catch (error) {
      console.error("Failed to terminate pid", row.pid, error?.message ?? error);
    }
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
