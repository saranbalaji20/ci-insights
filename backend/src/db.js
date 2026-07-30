import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

const { Pool } = pg;

function createDbWrapper() {
  const databaseUrl = process.env.DATABASE_URL;

  // Use standard pg.Pool if DATABASE_URL points to a remote server (e.g. Supabase, Render, Neon)
  if (databaseUrl && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1')) {
    console.log('Connecting to remote PostgreSQL database...');
    return new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
  }

  console.log('Using embedded PGlite database (local zero-config Postgres)...');
  const dbDir = path.resolve(process.cwd(), 'ci_insight_pgdata');
  const pglite = new PGlite(dbDir);

  const migrationsRun = pglite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY);
  `).then(async () => {
    const sqlDir = path.resolve(process.cwd(), 'sql');
    if (fs.existsSync(sqlDir)) {
      const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith('.sql')).sort();
      for (const file of files) {
        const { rows } = await pglite.query('SELECT name FROM _migrations WHERE name = $1', [file]);
        if (rows.length === 0) {
          console.log(`Running database migration: ${file}`);
          const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
          await pglite.exec(sql);
          await pglite.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        }
      }
    }
  }).catch((err) => {
    console.error('Migration failed:', err);
  });

  return {
    async query(text, params, callback) {
      await migrationsRun;
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      try {
        const res = await pglite.query(text, params || []);
        if (callback) callback(null, res);
        return res;
      } catch (err) {
        if (callback) callback(err);
        else throw err;
      }
    },
    on(event, listener) {
      // EventEmitter stub for connect-pg-simple error listeners
    }
  };
}

export const pool = createDbWrapper();

