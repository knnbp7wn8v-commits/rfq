--
-- 002_tds_tdsid.sql
--
-- A cart.tds / rfq.tds mezők korábban tisztázatlan/kevert szemantikával
-- kerültek használatba: a kliensoldali kód ("yes"/"no" checkbox-érték) és
-- a teszt-adatgeneráló (véletlenszerű tds.tdsid tartománybeli szám) két
-- különböző jelentést tulajdonított neki, miközben a szerveroldali
-- checkTDS() a tds.sku-t adta vissza. Lásd: kod_atvilagitas_adatbazis.md,
-- 1.6. pont.
--
-- Döntés: a mező mostantól a talált tds.tdsid rekord azonosítóját tárolja
-- (NULL, ha nem volt egyezés, vagy a felhasználó elutasította a javasolt
-- TDS-t) - lásd az app.js, render.js és cart.js egyidejű módosítását.
--
-- FIGYELEM ÉLES ADATBÁZISON: a NULLIF(tds, '')::integer kifejezés minden
-- meglévő sort megpróbál egész számmá alakítani; ha egy éles (nem teszt-)
-- adatbázisban a tds oszlop numerikustól eltérő (pl. tényleges SKU)
-- értéket tartalmazna, ez a migráció hibával elbukik, és az alkalmazás
-- nem indul el (lásd db/migrate.js). Ilyen esetben előbb kézi
-- adattisztítás szükséges - éles migráció előtt javasolt ellenőrizni:
--   SELECT DISTINCT tds FROM rfq  WHERE tds !~ '^[0-9]*$';
--   SELECT DISTINCT tds FROM cart WHERE tds !~ '^[0-9]*$';
--

-- Előfeltétel: az eredeti sémában a "tds" táblának nem volt elsődleges
-- kulcsa (a tdsid oszlopon csak NOT NULL + szekvencia-alapértelmezés volt,
-- kényszer nélkül) - idegen kulcs célpontjaként emiatt önmagában nem volt
-- használható. A valós exportban a tdsid értékek ellenőrizhetően egyediek.
ALTER TABLE public.tds
  ADD CONSTRAINT tds_pkey PRIMARY KEY (tdsid);

ALTER TABLE public.cart
  ALTER COLUMN tds TYPE integer USING NULLIF(tds, '')::integer;

ALTER TABLE public.rfq
  ALTER COLUMN tds TYPE integer USING NULLIF(tds, '')::integer;

ALTER TABLE public.cart
  ADD CONSTRAINT cart_tds_fkey FOREIGN KEY (tds) REFERENCES public.tds (tdsid) ON DELETE SET NULL;

ALTER TABLE public.rfq
  ADD CONSTRAINT rfq_tds_fkey FOREIGN KEY (tds) REFERENCES public.tds (tdsid) ON DELETE SET NULL;
