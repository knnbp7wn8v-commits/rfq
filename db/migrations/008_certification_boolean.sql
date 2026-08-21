--
-- 008_certification_boolean.sql
--
-- A cart.certification / rfq.certification (character varying(5)) mező
-- logikailag mindig kétértékű ("yes"/"no") volt - a 007_certification_check.sql
-- ezt CHECK kényszerrel már lezárta, de a séma többi hasonló, kétértékű
-- mezőjével (customers.status, permissionsets.adminpage/reportpage,
-- tds.fsc) ellentétben itt továbbra sem tényleges `boolean` típus volt.
-- Lásd: kod_atvilagitas_adatbazis.md, 3. pont ("középtávon" bekezdés).
--
-- A típusváltás biztonságos: a PostgreSQL boolean bemeneti parsere natívan
-- elfogadja a "yes"/"no" szöveges literálokat (SELECT 'yes'::boolean = true),
-- ezt használja ki a USING kifejezés. A korábbi CHECK kényszerek a típus
-- maga által feleslegessé válnak (egy boolean oszlop eleve csak true/false
-- értéket vehet fel), ezért törlésre kerülnek az ALTER COLUMN TYPE előtt.
--
-- A fn_create_order_from_cart (SETOF public.rfq) a tábla oszloptípusát
-- dinamikusan követi, újradefiniálás nélkül is helyesen működik a
-- típusváltás után. A fn_report_certification_demand viszont explicit
-- RETURNS TABLE (certification character varying, ...) deklarációt
-- használt, amit a PostgreSQL CREATE OR REPLACE FUNCTION nem enged
-- módosítani (visszatérési típus csak DROP FUNCTION után változtatható) -
-- ezért ez a függvény itt újra létrejön, boolean visszatérési típussal.
--

ALTER TABLE public.cart DROP CONSTRAINT cart_certification_check;
ALTER TABLE public.rfq DROP CONSTRAINT rfq_certification_check;

ALTER TABLE public.cart
  ALTER COLUMN certification TYPE boolean USING (certification = 'yes');

ALTER TABLE public.rfq
  ALTER COLUMN certification TYPE boolean USING (certification = 'yes');

DROP FUNCTION IF EXISTS public.fn_report_certification_demand(integer, integer, text, integer);

CREATE FUNCTION public.fn_report_certification_demand(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_time text DEFAULT NULL,
  p_company integer DEFAULT NULL
)
RETURNS TABLE (certification boolean, totalquantity numeric)
LANGUAGE sql STABLE
AS $$
  SELECT certification, SUM(orderweight)
  FROM public.rfq
  WHERE (p_year IS NULL OR EXTRACT(YEAR FROM requestdate) = p_year)
    AND (p_year IS NULL OR p_month IS NULL OR EXTRACT(MONTH FROM requestdate) = p_month)
    AND (p_time IS NULL OR requestdate >= CURRENT_DATE - p_time::interval)
    AND (p_company IS NULL OR customer_id = p_company)
  GROUP BY certification;
$$;
