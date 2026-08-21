--
-- 009_seed_roles.sql
--
-- A permissionsets/roles táblák tartalma nem üzleti (felhasználó által
-- karbantartott) adat, hanem az alkalmazás logikájába kódolt, rögzített
-- referenciaadat (app.js: const ROLES = { ADMIN: 3 }, valamint a
-- role_id/permissionset_id alapú jogosultság-ellenőrzések mindenhol).
--
-- Hiányát a 005_foreign_keys.sql customers_role_id_fkey kényszere egy
-- teljesen friss (üres) adatbázison azonnal láthatóvá is teszi: a /setup
-- (első admin fiók létrehozása) elbukna, mert a role_id=3 nem létezne a
-- roles táblában. Az itt felvett értékek az éles export (mydb_backup.sql)
-- tényleges tartalmával egyeznek.
--
-- ON CONFLICT DO NOTHING: egy meglévő (a migrációs mechanizmus bevezetése
-- előtt már manuálisan feltöltött) adatbázison nem írja felül a meglévő
-- sorokat - ott ez a migráció ténylegesen nem csinál semmit.
--

INSERT INTO public.permissionsets (permissionset_id, adminpage, reportpage) VALUES
  (1, false, false),
  (2, false, true),
  (3, true, true)
ON CONFLICT (permissionset_id) DO NOTHING;

INSERT INTO public.roles (role_id, permissionset_id, rolename) VALUES
  (1, 1, 'user'),
  (2, 2, 'reporter'),
  (3, 3, 'administrator')
ON CONFLICT (role_id) DO NOTHING;

-- A szekvenciák következő értékének igazítása, hogy egy friss adatbázison
-- egy ezt követő, explicit id nélküli INSERT ne ütközzön a fent rögzített
-- id-kkal.
SELECT setval('public.permissionsets_permissionset_id_seq', GREATEST((SELECT MAX(permissionset_id) FROM public.permissionsets), 1));
SELECT setval('public.roles_role_id_seq', GREATEST((SELECT MAX(role_id) FROM public.roles), 1));
