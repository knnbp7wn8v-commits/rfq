--
-- 004_customers_email_unique.sql
--
-- A /register végpont (app.js) korábban a PostgreSQL 23505 (unique
-- violation) hibakódot kezelte duplikált e-mail esetén, de a sémában
-- semmilyen egyediségi kényszer nem volt az email oszlopon - ez a hibaág
-- élesben soha nem sült el, és két ügyfél azonos e-mail-lel regisztrálhatott
-- (ami a bejelentkezésnél is nemkívánt viselkedést okozott volna, mivel a
-- WHERE email = $1 lekérdezés az első találatot veszi figyelembe). Lásd:
-- kod_atvilagitas_adatbazis.md, 2.1. pont.
--

ALTER TABLE public.customers
  ADD CONSTRAINT customers_email_key UNIQUE (email);
