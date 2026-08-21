--
-- 007_certification_check.sql
--
-- Az éles export tényleges adatai alapján a cart.certification /
-- rfq.certification (character varying(5)) oszlop három, egymással
-- inkonzisztens literál értéket tartalmazott: "true", "false" és "yes"
-- (nincs "no"). Oka: a generateRandomRFQ() teszt-generátor (app.js) egy
-- JavaScript logikai értéket írt a mezőbe (stringgé alakítva "true"/
-- "false"-t eredményezve), míg a tényleges felhasználói kitöltés
-- (render.js/cart.js, cert1/cert2 checkbox) "yes"/"no" szöveget küld.
-- Lásd: kod_atvilagitas_adatbazis.md, 3. pont.
--
-- Rövid távú javítás (ez a migráció): a meglévő "true"/"false" értékek
-- normalizálása "yes"/"no"-ra, majd CHECK kényszer a megengedett
-- értékkészlet lezárására. A generateRandomRFQ() generátor app.js-beli
-- javítása (hogy a jövőben ne írjon "true"/"false"-t) ezzel a
-- migrációval együtt, külön commitban történik.
--
-- A boolean típusra alakítás (konzisztensen a séma többi hasonló
-- mezőjével: customers.status, permissionsets.adminpage/reportpage,
-- tds.fsc) középtávú, nagyobb hatókörű javaslat marad - lásd
-- kod_atvilagitas_adatbazis.md 3. pont "középtávon" bekezdése -, ezt ez a
-- migráció szándékosan nem valósítja meg.
--

UPDATE public.rfq SET certification = 'yes' WHERE certification = 'true';
UPDATE public.rfq SET certification = 'no' WHERE certification = 'false';
UPDATE public.cart SET certification = 'yes' WHERE certification = 'true';
UPDATE public.cart SET certification = 'no' WHERE certification = 'false';

ALTER TABLE public.rfq
  ADD CONSTRAINT rfq_certification_check CHECK (certification IN ('yes', 'no'));

ALTER TABLE public.cart
  ADD CONSTRAINT cart_certification_check CHECK (certification IN ('yes', 'no'));
