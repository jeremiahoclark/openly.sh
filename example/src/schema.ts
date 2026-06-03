type D1PreparedStatement = {
  run(): Promise<unknown>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

export interface SchemaEnv {
  OPENLY: D1Database;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(env: SchemaEnv): Promise<void> {
  schemaReady ??= createSchema(env).catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

async function createSchema(env: SchemaEnv): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await env.OPENLY.prepare(statement).run();
  }
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS slugs (
    slug TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free',
    pro_until INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS magic_links (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    consumed_at INTEGER,
    request_ip TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS link_accounts (
    slug TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    archived_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    ts INTEGER NOT NULL,
    ip TEXT NOT NULL,
    ua TEXT,
    country TEXT,
    city TEXT,
    region TEXT,
    timezone TEXT,
    asn INTEGER,
    as_org TEXT,
    is_prefetch INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS idx_link_accounts_account_created ON link_accounts(account_id, archived_at, created_at)',
  'CREATE INDEX IF NOT EXISTS idx_clicks_slug_ts ON clicks(slug, ts)',
  'CREATE INDEX IF NOT EXISTS idx_clicks_filtered ON clicks(slug, is_prefetch, ts)',
  'CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email, created_at)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id, expires_at)',
] as const;
