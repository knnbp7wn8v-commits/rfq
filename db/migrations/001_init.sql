--
-- 001_init.sql - RFQ alkalmazás, migráció-alapállapot (séma DDL)
--
-- Ez a fájl a db/schema.sql korábbi, önálló referenciadokumentumként
-- készült tartalmával megegyező alapállapot, a db/migrate.js migrációs
-- mechanizmusába illesztve. Eredetileg a `mydb_backup.sql` (pg_dump,
-- PostgreSQL 16) éles exportjából lett előállítva, KIZÁRÓLAG a séma
-- (tábla-, szekvencia- és kulcsdefiníciók) megtartásával - adatsorokat nem
-- tartalmaz.
--
-- FONTOS: ezt a fájlt már NEM szabad utólag módosítani (a migrációs
-- mechanizmus a lefuttatott fájlokat a schema_migrations táblában
-- tartja nyilván, tartalom-ellenőrzés nélkül) - minden további
-- sémamódosítást új, sorszámmal növekvő migrációs fájlként kell
-- hozzáadni (lásd pl. 002_tds_tdsid.sql).
--
-- Meglévő (a migrációs mechanizmus bevezetése előtt, kézzel psql-lel
-- létrehozott) adatbázison - pl. éles AWS RDS - ez a fájl automatikusan
-- NEM fut le újra: a db/migrate.js alapállapot-felismerése észleli, hogy
-- a "customers" tábla már létezik, és 001_init.sql-t lefuttatás nélkül
-- alkalmazottként jelöli meg.
--

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- =========================================================
-- Táblák
-- =========================================================

CREATE TABLE public.addresses (
    a_id integer NOT NULL,
    u_id integer NOT NULL,
    country character varying(100) NOT NULL,
    city character varying(100) NOT NULL,
    postal_code character varying(30) NOT NULL,
    address character varying(100) NOT NULL
);

CREATE TABLE public.cart (
    cartid integer NOT NULL,
    customer_id integer,
    tissue character varying(50) NOT NULL,
    plies integer NOT NULL,
    grammatura numeric NOT NULL,
    diameter integer NOT NULL,
    reels integer NOT NULL,
    quotatient integer NOT NULL,
    pack1 integer,
    pack2 integer,
    orderweight integer NOT NULL,
    w1 integer,
    w2 integer,
    ediameter character varying(50) NOT NULL,
    certification character varying(5) NOT NULL,
    weeknum integer,
    tds character varying(10),
    _comment character varying(500),
    requestdate date DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE public.customers (
    customer_id integer NOT NULL,
    customer_name character varying(50) NOT NULL,
    vat_number character(15) NOT NULL,
    contact_name character varying(50) NOT NULL,
    email character varying(50) NOT NULL,
    phone character varying(50) NOT NULL,
    password character varying(120) NOT NULL,
    role_id integer DEFAULT 1 NOT NULL,
    date_joined date DEFAULT CURRENT_DATE NOT NULL,
    status boolean DEFAULT false NOT NULL
);

CREATE TABLE public.diameter (
    id integer NOT NULL,
    diameter integer NOT NULL
);

CREATE TABLE public.ediam_param (
    id integer NOT NULL,
    eheight integer NOT NULL,
    truck character varying(3) NOT NULL,
    tissue character varying(20),
    weight integer NOT NULL
);

CREATE TABLE public.eheight (
    id integer NOT NULL,
    eheight integer NOT NULL
);

CREATE TABLE public.grammatura (
    id integer NOT NULL,
    grammatura numeric NOT NULL
);

CREATE TABLE public.permissionsets (
    permissionset_id integer NOT NULL,
    adminpage boolean DEFAULT false NOT NULL,
    reportpage boolean DEFAULT false NOT NULL
);

CREATE TABLE public.plie_param (
    id integer NOT NULL,
    plie integer NOT NULL,
    diameter integer NOT NULL
);

CREATE TABLE public.plies (
    id integer NOT NULL,
    plie integer NOT NULL
);

CREATE TABLE public.portfolio (
    id integer NOT NULL,
    tissue character varying(20) NOT NULL,
    reel integer NOT NULL,
    grammatura numeric NOT NULL
);

CREATE TABLE public.reels (
    id integer NOT NULL,
    reels integer NOT NULL
);

CREATE TABLE public.rfq (
    cartid integer NOT NULL,
    customer_id integer,
    tissue character varying(50) NOT NULL,
    plies integer NOT NULL,
    grammatura numeric NOT NULL,
    diameter integer NOT NULL,
    reels integer NOT NULL,
    quotatient integer NOT NULL,
    pack1 integer,
    pack2 integer,
    orderweight integer NOT NULL,
    w1 integer,
    w2 integer,
    ediameter character varying(50) NOT NULL,
    certification character varying(5) NOT NULL,
    weeknum integer,
    tds character varying(10),
    _comment character varying(500),
    requestdate date DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    permissionset_id integer NOT NULL,
    rolename character varying(20) NOT NULL
);

CREATE TABLE public.tds (
    tdsid integer NOT NULL,
    sku character varying(20),
    itemname character varying(200),
    itemtype character varying(20),
    plies integer,
    height integer,
    grammatura numeric,
    diameter integer,
    ediameter integer,
    fsc boolean
);

CREATE TABLE public.tissue (
    id integer NOT NULL,
    tissue character varying(20)
);

CREATE TABLE public.truck (
    id integer NOT NULL,
    truck character varying(3) NOT NULL
);

CREATE TABLE public.weight (
    id integer NOT NULL,
    weight integer NOT NULL
);

-- =========================================================
-- Szekvenciák (auto-increment az id/pk oszlopokhoz)
-- =========================================================

CREATE SEQUENCE public.addresses_a_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.addresses_a_id_seq OWNED BY public.addresses.a_id;
ALTER TABLE ONLY public.addresses ALTER COLUMN a_id SET DEFAULT nextval('public.addresses_a_id_seq'::regclass);

CREATE SEQUENCE public.cart_cartid_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.cart_cartid_seq OWNED BY public.cart.cartid;
ALTER TABLE ONLY public.cart ALTER COLUMN cartid SET DEFAULT nextval('public.cart_cartid_seq'::regclass);

CREATE SEQUENCE public.customers_customer_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.customers.customer_id;
ALTER TABLE ONLY public.customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);

CREATE SEQUENCE public.diameter_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.diameter_id_seq OWNED BY public.diameter.id;
ALTER TABLE ONLY public.diameter ALTER COLUMN id SET DEFAULT nextval('public.diameter_id_seq'::regclass);

CREATE SEQUENCE public.ediam_param_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.ediam_param_id_seq OWNED BY public.ediam_param.id;
ALTER TABLE ONLY public.ediam_param ALTER COLUMN id SET DEFAULT nextval('public.ediam_param_id_seq'::regclass);

CREATE SEQUENCE public.eheight_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.eheight_id_seq OWNED BY public.eheight.id;
ALTER TABLE ONLY public.eheight ALTER COLUMN id SET DEFAULT nextval('public.eheight_id_seq'::regclass);

CREATE SEQUENCE public.grammatura_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.grammatura_id_seq OWNED BY public.grammatura.id;
ALTER TABLE ONLY public.grammatura ALTER COLUMN id SET DEFAULT nextval('public.grammatura_id_seq'::regclass);

CREATE SEQUENCE public.permissionsets_permissionset_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.permissionsets_permissionset_id_seq OWNED BY public.permissionsets.permissionset_id;
ALTER TABLE ONLY public.permissionsets ALTER COLUMN permissionset_id SET DEFAULT nextval('public.permissionsets_permissionset_id_seq'::regclass);

CREATE SEQUENCE public.plie_param_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.plie_param_id_seq OWNED BY public.plie_param.id;
ALTER TABLE ONLY public.plie_param ALTER COLUMN id SET DEFAULT nextval('public.plie_param_id_seq'::regclass);

CREATE SEQUENCE public.plies_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.plies_id_seq OWNED BY public.plies.id;
ALTER TABLE ONLY public.plies ALTER COLUMN id SET DEFAULT nextval('public.plies_id_seq'::regclass);

CREATE SEQUENCE public.portfolio_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.portfolio_id_seq OWNED BY public.portfolio.id;
ALTER TABLE ONLY public.portfolio ALTER COLUMN id SET DEFAULT nextval('public.portfolio_id_seq'::regclass);

CREATE SEQUENCE public.reels_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.reels_id_seq OWNED BY public.reels.id;
ALTER TABLE ONLY public.reels ALTER COLUMN id SET DEFAULT nextval('public.reels_id_seq'::regclass);

CREATE SEQUENCE public.rfq_cartid_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.rfq_cartid_seq OWNED BY public.rfq.cartid;
ALTER TABLE ONLY public.rfq ALTER COLUMN cartid SET DEFAULT nextval('public.rfq_cartid_seq'::regclass);

CREATE SEQUENCE public.roles_role_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;
ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);

CREATE SEQUENCE public.tds_tdsid_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.tds_tdsid_seq OWNED BY public.tds.tdsid;
ALTER TABLE ONLY public.tds ALTER COLUMN tdsid SET DEFAULT nextval('public.tds_tdsid_seq'::regclass);

CREATE SEQUENCE public.tissue_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.tissue_id_seq OWNED BY public.tissue.id;
ALTER TABLE ONLY public.tissue ALTER COLUMN id SET DEFAULT nextval('public.tissue_id_seq'::regclass);

CREATE SEQUENCE public.truck_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.truck_id_seq OWNED BY public.truck.id;
ALTER TABLE ONLY public.truck ALTER COLUMN id SET DEFAULT nextval('public.truck_id_seq'::regclass);

CREATE SEQUENCE public.weight_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.weight_id_seq OWNED BY public.weight.id;
ALTER TABLE ONLY public.weight ALTER COLUMN id SET DEFAULT nextval('public.weight_id_seq'::regclass);

-- =========================================================
-- Elsődleges kulcsok és egyedi kényszerek
-- =========================================================

ALTER TABLE ONLY public.addresses ADD CONSTRAINT addresses_pkey PRIMARY KEY (a_id);
ALTER TABLE ONLY public.cart ADD CONSTRAINT cart_pkey PRIMARY KEY (cartid);
ALTER TABLE ONLY public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);
ALTER TABLE ONLY public.diameter ADD CONSTRAINT diameter_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ediam_param ADD CONSTRAINT ediam_param_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.eheight ADD CONSTRAINT eheight_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.grammatura ADD CONSTRAINT grammatura_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.permissionsets ADD CONSTRAINT permissionsets_pkey PRIMARY KEY (permissionset_id);
ALTER TABLE ONLY public.plie_param ADD CONSTRAINT plie_param_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.plies ADD CONSTRAINT plies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.portfolio ADD CONSTRAINT portfolio_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reels ADD CONSTRAINT reels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.rfq ADD CONSTRAINT rfq_pkey PRIMARY KEY (cartid);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_permissionset_id_key UNIQUE (permissionset_id);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);
ALTER TABLE ONLY public.tissue ADD CONSTRAINT tissue_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.truck ADD CONSTRAINT truck_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.weight ADD CONSTRAINT weight_pkey PRIMARY KEY (id);
