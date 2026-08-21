// Egyszerű, saját fejlesztésű migrációkövető mechanizmus.
//
// Cél: az alkalmazás induláskor (app.js) automatikusan létrehozza/frissíti
// a séma azon részét, amely a db/migrations/ mappában sorszámozott .sql
// fájlokként van leírva, és nyilvántartja (schema_migrations tábla), mely
// fájlok futottak már le - így minden migráció pontosan egyszer, sorrendben
// alkalmazódik. Lásd: kod_atvilagitas_adatbazis.md, 6. pont.
//
// Fontos: ez KIZÁRÓLAG a séma (táblák/kényszerek/függvények) szintjét
// automatizálja egy már létező adatbázison belül - magát a PostgreSQL
// adatbázist (CREATE DATABASE) szándékosan NEM hozza létre, mivel ehhez
// az alkalmazás DB-felhasználójának a legkisebb jogosultság elvét sértő
// CREATEDB/superuser jogosultság kellene. Lásd: kod_atvilagitas_adatbazis.md,
// 5. pont.

const fs = require('fs');
const path = require('path');
const logger = require('../logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id serial PRIMARY KEY,
      filename varchar(255) NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

// Alapállapot-felismerés: ha a migrációs mechanizmus bevezetése előtt már
// létező, kézzel (pl. `psql -f db/schema.sql`) létrehozott sémán fut az
// alkalmazás - jellemzően az éles AWS RDS adatbázison -, a 001_init.sql
// újrafuttatása "relation already exists" hibával elbukna. Ha a
// schema_migrations tábla üres, de a customers tábla már létezik, a
// 001_init.sql-t alapállapotként (már alkalmazottként) jelöljük meg,
// tényleges lefuttatás nélkül - csak az azt KÖVETŐ migrációk futnak le
// ténylegesen. Teljesen üres (új) adatbázison a customers tábla még nem
// létezik, ezért a 001_init.sql ott a szokásos módon, ténylegesen lefut.
async function baselineIfNeeded(pool) {
  const applied = await pool.query('SELECT COUNT(*)::int AS count FROM schema_migrations');
  if (applied.rows[0].count > 0) {
    return;
  }
  const existing = await pool.query("SELECT to_regclass('public.customers') AS reg");
  if (existing.rows[0].reg !== null) {
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', ['001_init.sql']);
    logger.info('Séma alapállapot észlelve (a "customers" tábla már létezik) - 001_init.sql alapállapotként megjelölve, tényleges újrafuttatás nélkül.');
  }
}

async function runMigrations(pool) {
  await ensureMigrationsTable(pool);
  await baselineIfNeeded(pool);

  const appliedResult = await pool.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(appliedResult.rows.map((r) => r.filename));

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn(`Migrációs mappa nem található: ${MIGRATIONS_DIR}`);
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Migráció alkalmazva: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Migráció sikertelen (${file}), az alkalmazás indítása megszakad:`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = { runMigrations };
