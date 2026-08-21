--
-- 006_indexes.sql
--
-- PostgreSQL nem hoz létre automatikusan indexet a hivatkozó (idegen
-- kulcsot tartalmazó) oszlopon - a 005_foreign_keys.sql-ben felvett FK-k
-- önmagukban nem gyorsítják a WHERE customer_id/u_id = ... mintázatú
-- lekérdezéseket. Lásd: kod_atvilagitas_adatbazis.md, 2. pont.
--
-- Megjegyzés: a jelenlegi adatmennyiségen (néhány ezer sor) ezen indexek
-- haszna elsősorban a séma helyességének/felkészültségének
-- dokumentálása és a jövőbeli skálázhatóság szempontjából releváns, nem
-- azonnal mérhető lekérdezés-gyorsulás.

-- 2.2. Idegen kulcsot tartalmazó oszlopok
CREATE INDEX idx_addresses_u_id   ON public.addresses (u_id);
CREATE INDEX idx_cart_customer_id ON public.cart (customer_id);
CREATE INDEX idx_rfq_customer_id  ON public.rfq (customer_id);

-- 2.3. rfq.requestdate - a /report időablak-szűrés (requestdate >=
-- CURRENT_DATE - INTERVAL ...) közvetlenül kihasználja. Az EXTRACT(YEAR/
-- MONTH FROM requestdate) alapú szűrést/csoportosítást (chart5) ez az
-- index nem tudja kiszolgálni - ehhez külön kifejezés-alapú index kellene,
-- amit a jelenlegi adatmennyiség mellett nem vettünk fel (lásd a
-- kod_atvilagitas_adatbazis.md 2.3. pontjában található opcionális
-- javaslatot, ha ez indokolttá válik).
CREATE INDEX idx_rfq_requestdate ON public.rfq (requestdate);

-- 2.4. Lookup-táblák szűrési oszlopai (getOptions, app.js)
CREATE INDEX idx_portfolio_tissue   ON public.portfolio (tissue);
CREATE INDEX idx_plie_param_plie    ON public.plie_param (plie);
CREATE INDEX idx_ediam_param_tissue ON public.ediam_param (tissue);
