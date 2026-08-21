--
-- 005_foreign_keys.sql
--
-- Az alábbi öt kapcsolat egyértelműen levezethető az app.js tényleges
-- lekérdezéseiből (JOIN-ok, WHERE customer_id/u_id = ... mintázatok), de
-- eddig a sémában semmilyen FOREIGN KEY kényszer nem biztosította őket.
-- Lásd: kod_atvilagitas_adatbazis.md, 1.1-1.5. pont.
--

-- 1.1. customers.role_id -> roles.role_id
-- Egy szerepkör nem törölhető, amíg felhasználó hivatkozik rá.
ALTER TABLE public.customers
  ADD CONSTRAINT customers_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES public.roles (role_id)
  ON DELETE RESTRICT;

-- 1.2. roles.permissionset_id -> permissionsets.permissionset_id
-- Az itt már meglévő UNIQUE kényszer (roles_permissionset_id_key) az 1:1
-- tervezési szándékot jelzi, ez csak a hivatkozási integritást pótolja.
ALTER TABLE public.roles
  ADD CONSTRAINT roles_permissionset_id_fkey
  FOREIGN KEY (permissionset_id) REFERENCES public.permissionsets (permissionset_id)
  ON DELETE RESTRICT;

-- 1.3. addresses.u_id -> customers.customer_id
-- A cím rekordnak önmagában nincs értelme ügyfél nélkül.
ALTER TABLE public.addresses
  ADD CONSTRAINT addresses_u_id_fkey
  FOREIGN KEY (u_id) REFERENCES public.customers (customer_id)
  ON DELETE CASCADE;

-- 1.4. cart.customer_id -> customers.customer_id
-- A kosár ideiglenes, munkamenet-jellegű adat.
ALTER TABLE public.cart
  ADD CONSTRAINT cart_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers (customer_id)
  ON DELETE CASCADE;

-- 1.5. rfq.customer_id -> customers.customer_id
-- Az rfq tábla megrendelés-előzmény, nem ideiglenes adat - egy ügyfél
-- törlése esetén az üzleti/könyvelési nyomon követhetőség érdekében az
-- előzmény nem veszhet el (SET NULL, nem CASCADE/RESTRICT). Az oszlop már
-- ma is nullázható, ezért ez a viselkedés kényszer nélkül is konzisztens
-- volt.
ALTER TABLE public.rfq
  ADD CONSTRAINT rfq_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers (customer_id)
  ON DELETE SET NULL;
