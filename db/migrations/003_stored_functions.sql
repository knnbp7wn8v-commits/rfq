--
-- 003_stored_functions.sql
--
-- Tárolt függvények: (1) kosár -> rendelés atomi átvitele, (2) az
-- /api/report/:data riport-diagramok aggregáló lekérdezései. Lásd:
-- kod_atvilagitas_adatbazis.md, 4. pont.
--
-- Szándékosan FÜGGVÉNYKÉNT (nem PROCEDURE-ként) készültek: egy PL/pgSQL
-- függvényhívás önmagában is atomi (a hívó tranzakciója részeként fut),
-- és - a PROCEDURE-tól eltérően - közvetlenül visszaadhat sorokat
-- (RETURN QUERY / RETURNS TABLE), így az app.js oldali hívó kód
-- explicit BEGIN/COMMIT/ROLLBACK és külön SELECT nélkül, egyetlen
-- pool.query()-vel kiváltható.
--

-- 1) Kosár -> rendelés atomi átvitele.
-- Az app.js korábbi createOrder() függvénye ugyanezt a logikát már
-- helyesen, explicit tranzakcióban hajtotta végre - ez a függvény
-- ugyanazt a viselkedést az adatbázis-rétegbe helyezi át, hogy bármely
-- kliens (nem csak a jelenlegi Node.js kód) számára ugyanazt az
-- atomicitást biztosítsa, egyetlen hívással.
CREATE OR REPLACE FUNCTION public.fn_create_order_from_cart(p_customer_id integer)
RETURNS SETOF public.rfq
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    INSERT INTO public.rfq (customer_id, tissue, plies, grammatura, diameter, reels, quotatient,
                             pack1, pack2, orderweight, w1, w2, ediameter, certification,
                             weeknum, tds, _comment)
    SELECT customer_id, tissue, plies, grammatura, diameter, reels, quotatient,
           pack1, pack2, orderweight, w1, w2, ediameter, certification,
           weeknum, tds, _comment
    FROM public.cart
    WHERE customer_id = p_customer_id
    RETURNING *;

  DELETE FROM public.cart WHERE customer_id = p_customer_id;
END;
$$;

-- 2) Riport-lekérdezések - egy függvény diagramtípusonként, a korábbi
-- (app.js, /api/report/:data) kézzel összefűzött WHERE-feltételek
-- helyett. A "time" paramétert továbbra is egy zárt fehérlistával
-- (REPORT_TIME_WINDOWS, app.js) validáljuk hívás előtt - nem azért,
-- mert a $n::interval kötött paraméterkénti átadása technikailag ne
-- lenne biztonságos (az egy érvényes, paraméterezett PostgreSQL-
-- kifejezés), hanem hogy egy hibás/váratlan string ne okozzon futásidejű
-- ::interval konverziós hibát.
--
-- A "month" szűrő - az eredeti app.js logikával megegyezően - csak akkor
-- érvényesül, ha "year" is meg van adva.

CREATE OR REPLACE FUNCTION public.fn_report_tissue_demand(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_time text DEFAULT NULL,
  p_company integer DEFAULT NULL
)
RETURNS TABLE (producttype character varying, totalquantity numeric)
LANGUAGE sql STABLE
AS $$
  SELECT tissue, SUM(orderweight)
  FROM public.rfq
  WHERE (p_year IS NULL OR EXTRACT(YEAR FROM requestdate) = p_year)
    AND (p_year IS NULL OR p_month IS NULL OR EXTRACT(MONTH FROM requestdate) = p_month)
    AND (p_time IS NULL OR requestdate >= CURRENT_DATE - p_time::interval)
    AND (p_company IS NULL OR customer_id = p_company)
  GROUP BY tissue;
$$;

CREATE OR REPLACE FUNCTION public.fn_report_weight_layers_demand(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_time text DEFAULT NULL,
  p_company integer DEFAULT NULL
)
RETURNS TABLE (weight numeric, layers integer, totalquantity numeric)
LANGUAGE sql STABLE
AS $$
  SELECT grammatura, plies, SUM(orderweight)
  FROM public.rfq
  WHERE (p_year IS NULL OR EXTRACT(YEAR FROM requestdate) = p_year)
    AND (p_year IS NULL OR p_month IS NULL OR EXTRACT(MONTH FROM requestdate) = p_month)
    AND (p_time IS NULL OR requestdate >= CURRENT_DATE - p_time::interval)
    AND (p_company IS NULL OR customer_id = p_company)
  GROUP BY grammatura, plies;
$$;

CREATE OR REPLACE FUNCTION public.fn_report_weekly_tissue_demand(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_time text DEFAULT NULL,
  p_company integer DEFAULT NULL
)
RETURNS TABLE (weeknum integer, producttype character varying, totalquantity numeric)
LANGUAGE sql STABLE
AS $$
  SELECT weeknum, tissue, SUM(orderweight)
  FROM public.rfq
  WHERE (p_year IS NULL OR EXTRACT(YEAR FROM requestdate) = p_year)
    AND (p_year IS NULL OR p_month IS NULL OR EXTRACT(MONTH FROM requestdate) = p_month)
    AND (p_time IS NULL OR requestdate >= CURRENT_DATE - p_time::interval)
    AND (p_company IS NULL OR customer_id = p_company)
  GROUP BY weeknum, tissue
  ORDER BY weeknum;
$$;

CREATE OR REPLACE FUNCTION public.fn_report_certification_demand(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_time text DEFAULT NULL,
  p_company integer DEFAULT NULL
)
RETURNS TABLE (certification character varying, totalquantity numeric)
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

CREATE OR REPLACE FUNCTION public.fn_report_monthly_demand(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_time text DEFAULT NULL,
  p_company integer DEFAULT NULL
)
RETURNS TABLE (year numeric, month numeric, totalquantity numeric)
LANGUAGE sql STABLE
AS $$
  SELECT EXTRACT(YEAR FROM requestdate), EXTRACT(MONTH FROM requestdate), SUM(orderweight)
  FROM public.rfq
  WHERE (p_year IS NULL OR EXTRACT(YEAR FROM requestdate) = p_year)
    AND (p_year IS NULL OR p_month IS NULL OR EXTRACT(MONTH FROM requestdate) = p_month)
    AND (p_time IS NULL OR requestdate >= CURRENT_DATE - p_time::interval)
    AND (p_company IS NULL OR customer_id = p_company)
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;
