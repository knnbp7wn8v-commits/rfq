# Kódátvilágítás — adatbázis-séma (`db/schema.sql`)

Az alábbi elemzés a [`db/schema.sql`](./db/schema.sql) által leírt sémára, valamint az `app.js`-ben ténylegesen futtatott lekérdezésekre (tábla-összefüggések levezetése a kódból, mivel a séma jelenleg egyetlen `FOREIGN KEY` kényszert sem definiál) és a felhasználó által rendelkezésre bocsátott éles export (`mydb_backup.sql`) tényleges adatsoraira épül. A javaslatok — a korábbi kódátvilágítási dokumentumokhoz hasonlóan — súlyosság/téma szerint csoportosítva, forrás-hivatkozással szerepelnek; egyik sem került még alkalmazásra sem a sémán, sem az `app.js`-en.

## 1. Idegen kulcsok (FOREIGN KEY)

A jelenlegi séma kizárólag elsődleges kulcsokat (és egy `UNIQUE` kényszert a `roles.permissionset_id`-n) tartalmaz — táblák közötti hivatkozási integritást jelenleg **kizárólag alkalmazásszinten**, implicit módon tartja fenn a kód. Ez azt jelenti, hogy egy hibás `INSERT`/`UPDATE` (akár egy jövőbeli refaktor mellékhatásaként) árva rekordokat hozhat létre anélkül, hogy az adatbázis ezt jelezné.

### 1.1. `customers.role_id` → `roles.role_id`

Forrás: `listUsers()`, `filterUsers()` (`app.js`, 240–300. sor) — mindkettő `JOIN roles ON customers.role_id = roles.role_id` alapján épül, tehát a hivatkozás az alkalmazás szemantikájában már most is kötelező. A `customers.role_id DEFAULT 1` érték az éles adatban is konzisztensen a `roles` tábla `'user'` sorára mutat.

```sql
ALTER TABLE public.customers
  ADD CONSTRAINT customers_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES public.roles (role_id)
  ON DELETE RESTRICT;
```

`ON DELETE RESTRICT`: egy szerepkör nem törölhető, amíg felhasználó hivatkozik rá — ez elvárt viselkedés egy admin felületen kezelt törzsadatnál.

### 1.2. `roles.permissionset_id` → `permissionsets.permissionset_id`

A `roles.permissionset_id`-n már létező `UNIQUE` kényszer (`roles_permissionset_id_key`) egyértelműen jelzi az 1:1 tervezési szándékot, ez csupán a hiányzó hivatkozási integritást pótolja:

```sql
ALTER TABLE public.roles
  ADD CONSTRAINT roles_permissionset_id_fkey
  FOREIGN KEY (permissionset_id) REFERENCES public.permissionsets (permissionset_id)
  ON DELETE RESTRICT;
```

### 1.3. `addresses.u_id` → `customers.customer_id`

Forrás: `updateProfile()` (`app.js`, 214–237. sor) — `WHERE u_id = $1`, ahol `$1` mindig `req.user.customer_id`. A cím rekordnak önmagában nincs értelme ügyfél nélkül.

```sql
ALTER TABLE public.addresses
  ADD CONSTRAINT addresses_u_id_fkey
  FOREIGN KEY (u_id) REFERENCES public.customers (customer_id)
  ON DELETE CASCADE;
```

`ON DELETE CASCADE`: az ügyfél törlésével a hozzá tartozó cím is okafogyottá válik.

### 1.4. `cart.customer_id` → `customers.customer_id`

Forrás: `addToCart`, `getCart`, `removeFromCart`, `createOrder` (`app.js`, 349–407. sor). A kosár ideiglenes, munkamenet-jellegű adat.

```sql
ALTER TABLE public.cart
  ADD CONSTRAINT cart_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers (customer_id)
  ON DELETE CASCADE;
```

### 1.5. `rfq.customer_id` → `customers.customer_id`

Forrás: `createOrder`, `/profile`, `/api/report/:data` (`company` szűrő). Ezzel szemben az `rfq` tábla **megrendelés-előzmény**, nem ideiglenes adat — egy ügyfél törlése esetén az üzleti/könyvelési nyomon követhetőség érdekében az előzmény nem veszhet el. Az oszlop már ma is nullázható (`customer_id integer` `NOT NULL` nélkül), ezért ez a viselkedés kényszer nélkül is konzisztens marad:

```sql
ALTER TABLE public.rfq
  ADD CONSTRAINT rfq_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers (customer_id)
  ON DELETE SET NULL;
```

Alternatíva, ha üzleti szabályként az a cél, hogy megrendelés-előzménnyel rendelkező ügyfél egyáltalán ne legyen törölhető: `ON DELETE RESTRICT`. Ez tervezési döntés, nem technikai kérdés — javaslom tisztázni, mielőtt alkalmazzuk.

### 1.6. `cart.tds` / `rfq.tds` → `tds` — **tisztázást igénylő eset, javaslat nélkül**

Ez az egyetlen kapcsolat, ahol a valós adatok alapján **nem egyértelmű**, mire kellene mutatnia a mezőnek, ezért idegen kulcsot **nem** javaslok hozzáadni addig, amíg ez nem tisztázott:

- A `checkTDS()` függvény (`app.js`, 373–378. sor) a `tds.sku`-t adja vissza a kliensnek, ami arra utal, hogy a kosárba/RFQ-ba a **SKU** kerülne mentésre.
- Ezzel szemben a valós exportban az `rfq.tds` oszlop kizárólag `1`–`108` közötti **numerikus** értékeket tartalmaz — ami pontosan a `tds.tdsid` tartománya, nem a SKU formátuma (pl. `APKC1259561`). Ennek oka feltehetően az, hogy a `generateRandomRFQ()` teszt-adatgeneráló (`app.js`, 952–994. sor) `Math.floor(Math.random() * 108) + 1` értéket ír a mezőbe — vagyis a teszt/demó adat **nem** a valós (SKU-alapú) kitöltési logikát követi.
- Emellett a `tds.sku` **nem egyedi**: egy SKU több `tdsid`-hoz (eltérő átmérő-variánshoz) is tartozhat (pl. `APKC1259561` a `tdsid` 1 és 2 sorokon is szerepel) — így idegen kulcs célpontjaként jelenleg nem is használható `UNIQUE` kényszer nélkül.
- Típusütközés is fennáll: `cart.tds`/`rfq.tds` `character varying(10)`, a `tds.sku` viszont `character varying(20)` — hosszabb SKU esetén ez csonkítást okozna.

Javaslat a tisztázáshoz: döntsük el, hogy a mező ténylegesen a `tds.tdsid`-t (ajánlott — ez egyértelmű, egyedi, integer típusú, és a valós teszt-adat is ezt sugallja) vagy a `tds.sku`-t kell tárolja; az előbbi esetben `cart.tds`/`rfq.tds` típusát `integer`-re kellene módosítani és `checkTDS()`-t is `tdsid`-t visszaadóra kellene igazítani, az utóbbi esetben pedig a `tds.sku`-ra `UNIQUE` kényszert kellene tenni (ami üzletileg megkérdőjelezhető, mivel több sor osztozik egy SKU-n), és az oszlophosszt 20 karakterre kellene bővíteni. Csak a döntés után érdemes a tényleges `FOREIGN KEY`-t és a hozzá tartozó migrációt (esetleges típuskonverzióval, meglévő adat tisztításával) elkészíteni.

## 2. Indexek

Fontos technikai pontosítás: PostgreSQL **automatikusan nem hoz létre indexet** a hivatkozó (idegen kulcsot tartalmazó) oszlopon — csak a hivatkozott oszlopon kötelező az egyediség (amit itt mindig egy már meglévő elsődleges kulcs biztosít). A fenti FK-k bevezetése tehát önmagában **nem** old meg semmilyen keresési teljesítményproblémát; az alábbi indexek külön létrehozandók.

### 2.1. `customers.email` — `UNIQUE INDEX`, egyben **valós hiba javítása**

Ez a legfontosabb, önmagában is indokolt módosítás. A `/register` végpont (`app.js`, 816–841. sor) explicit módon kezeli a PostgreSQL `23505` (unique violation) hibakódot:

```js
if (error.code === '23505') { // PostgreSQL unique violation error code
  res.status(400).send('Email already exists');
}
```

A ténylegesen exportált sémában viszont **nincs semmilyen egyediségi kényszer az `email` oszlopon** — ez a hibaág jelenleg élő, futó rendszeren soha nem aktiválódik, és **jelenleg semmi nem akadályozza meg, hogy két ügyfél ugyanazzal az e-mail-címmel regisztráljon**. Mivel a bejelentkezés (`passport.use('local', ...)`, 96–118. sor) `SELECT * FROM customers WHERE email = $1` alapján az **első találatot** veszi figyelembe, duplikált e-mail esetén a bejelentkezés determinisztikusan rossz (vagy a másik ügyfél) fiókjához férhet hozzá — ez adatbiztonsági szempontból is releváns, nem csak adatintegritási kérdés.

```sql
ALTER TABLE public.customers
  ADD CONSTRAINT customers_email_key UNIQUE (email);
```

(Ez egyúttal indexet is létrehoz `email`-re, tehát a bejelentkezési lekérdezés keresési teljesítményét is javítja.)

### 2.2. Idegen kulcsot tartalmazó oszlopok

```sql
CREATE INDEX idx_addresses_u_id   ON public.addresses (u_id);
CREATE INDEX idx_cart_customer_id ON public.cart (customer_id);
CREATE INDEX idx_rfq_customer_id  ON public.rfq (customer_id);
```

Ezek támogatják a `WHERE u_id = $1` / `WHERE customer_id = $1` mintázatú lekérdezéseket (`getCart`, `/profile`, `/api/report/:data` `company` szűrő), és elkerülik a szülő tábla módosításakor bekövetkező tábla-szintű zárolást (lock escalation), amely FK jelenlétében indexeletlen gyermek tábla esetén felléphet.

### 2.3. `rfq.requestdate`

A `/report` oldal mind az öt diagramtípusa (`app.js`, 1031–1122. sor) dátum szerint szűr vagy csoportosít. Az egyszerű intervallum-szűréshez (`requestdate >= CURRENT_DATE - INTERVAL '...'`) egy hagyományos B-fa index közvetlenül használható:

```sql
CREATE INDEX idx_rfq_requestdate ON public.rfq (requestdate);
```

A `chart5` esetében használt `EXTRACT(YEAR FROM requestdate)` / `EXTRACT(MONTH FROM requestdate)` kifejezéseket a fenti index **nem** tudja kiszolgálni (a tervező nem ismeri fel az azonosságot) — ehhez opcionálisan egy kifejezés-alapú (functional) index adható hozzá, ha a tábla mérete ezt indokolja:

```sql
CREATE INDEX idx_rfq_year_month
  ON public.rfq ((EXTRACT(YEAR FROM requestdate)), (EXTRACT(MONTH FROM requestdate)));
```

Megjegyzés a jelenlegi adatmennyiséghez (~1000 `rfq` sor a teszt-exportban): ezen a méreten a tervező valószínűleg szekvenciális keresést választana index helyett is — az indexek haszna elsősorban a séma helyességének/felkészültségének dokumentálása és a jövőbeli skálázhatóság szempontjából releváns, ezt érdemes a szakdolgozatban is így keretezni (nem "azonnal mérhető gyorsulás", hanem "tervezési előrelátás").

### 2.4. Lookup-táblák szűrési oszlopai

```sql
CREATE INDEX idx_portfolio_tissue   ON public.portfolio (tissue);
CREATE INDEX idx_plie_param_plie    ON public.plie_param (plie);
CREATE INDEX idx_ediam_param_tissue ON public.ediam_param (tissue);
```

Forrás: `getOptions()` (`app.js`, 567–598. sor) — `Grammatura`/`Reels` esetben `portfolio.tissue`, `Diameter` esetben `plie_param.plie`, `Ediameter` esetben `ediam_param.tissue` szerint szűr. Ugyanaz a méret-relativizálás érvényes, mint 2.3-nál.

## 3. Egyéb kényszerek — adatminőségi észrevétel

Az éles export tényleges adatai alapján az `rfq.certification` (`character varying(5)`) oszlop **három, egymással inkonzisztens** literál értéket tartalmaz: `"true"`, `"false"` és `"yes"` (nincs `"no"`). Ennek oka valószínűleg az, hogy a `generateRandomRFQ()` teszt-generátor (`app.js`, 959. sor) egy JavaScript logikai értéket (`Math.random() < 0.5`) ír a mezőbe — ami stringgé alakítva `"true"`/`"false"`-t eredményez —, míg a tényleges felhasználói kitöltés (kliensoldali kód alapján) `"yes"`/`"no"` szöveget küld. A séma jelenleg semmilyen kényszert nem tartalmaz, amely ezt kiszűrné.

Ez egyszerre jelzi (a) a teszt-adatgenerátor és a valós adatbeviteli útvonal szétválását, és (b) hogy a mező logikailag logikai (boolean) érték, csak jelenleg szövegként van tárolva — inkonzisztensen a séma más, azonos jellegű oszlopaival (`customers.status`, `permissionsets.adminpage`/`reportpage`, `tds.fsc`, mind `boolean`). Két lehetséges javítási irány:

- **Rövid távon**: `CHECK` kényszer a jelenlegi típus megtartásával, a megengedett értékkészlet lezárásával (pl. `CHECK (certification IN ('yes', 'no'))`), és a teszt-generátor kódjának kijavítása, hogy ne írjon eltérő értéket.
- **Középtávon (modernizációs javaslat)**: az oszlop tényleges `boolean` típusra alakítása (`cart.certification`, `rfq.certification`), konzisztensen a séma többi hasonló mezőjével — ez migrációt igényel (`UPDATE ... SET certification = (certification = 'yes')::text` jellegű átalakítás, majd `ALTER COLUMN ... TYPE boolean USING ...`), ezért csak a séma egyéb módosításaival együtt, külön migrációs lépésként javaslom elvégezni.

## 4. Tárolt eljárások / függvények

A jelenlegi architektúra minden üzleti logikát (tranzakciókezelés, riport-aggregáció) alkalmazásoldalon (`app.js`) valósít meg, közvetlen, ad hoc SQL-lekérdezésekkel. Ez nem hibás megközelítés — a Node.js + `pg` kombináció ezt a mintát preferálja —, de két konkrét helyen indokolt lehet a logika egy részét az adatbázis-rétegbe tolni.

### 4.1. `createOrder` → tárolt eljárás (mérlegelendő, nem kritikus)

A jelenlegi `createOrder()` (`app.js`, 380–403. sor) már helyesen, explicit `BEGIN`/`COMMIT`/`ROLLBACK` tranzakcióban fut — funkcionálisan korrekt. Áthelyezése PL/pgSQL eljárásba elsősorban azt nyerné, hogy a művelet **egyetlen hálózati körutazással** (egy `CALL`) végrehajtható, és bármely jövőbeli, nem Node.js kliens (pl. egy adminisztrációs script) is ugyanazt az atomicitást kapná automatikusan, kód-duplikálás nélkül:

```sql
CREATE OR REPLACE PROCEDURE public.sp_create_order_from_cart(p_customer_id integer)
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO rfq (customer_id, tissue, plies, grammatura, diameter, reels, quotatient,
                    pack1, pack2, orderweight, w1, w2, ediameter, certification,
                    weeknum, tds, _comment)
  SELECT customer_id, tissue, plies, grammatura, diameter, reels, quotatient,
         pack1, pack2, orderweight, w1, w2, ediameter, certification,
         weeknum, tds, _comment
  FROM cart WHERE customer_id = p_customer_id;

  DELETE FROM cart WHERE customer_id = p_customer_id;
END;
$$;
```

Ellenérv, amit érdemes mérlegelni: a PL/pgSQL kód PostgreSQL-specifikus (adatbázis-motor-függőség nő), nehezebben verziókezelhető/tesztelhető, mint a jelenlegi, Node.js oldali egységtesztekkel lefedhető függvény. Mivel a jelenlegi megoldás már helyesen tranzakcionális, ez **nem hibajavítás**, hanem architektúrális választás — a szakdolgozatban mindkét irány (alkalmazás- vs. adatbázis-oldali tranzakciókezelés) indokolható, ha a döntést explicit módon, az érvek felsorolásával mutatod be.

### 4.2. Riport-lekérdezések → SQL függvények (erősebb javaslat)

Az `/api/report/:data` végpont (`app.js`, 1031–1122. sor) jelenleg minden diagramtípushoz kézzel épített, feltétel-láncolással összeállított SQL-t futtat. Ez — bár helyesen paraméterezett — nehezen tesztelhető izoláltan (csak HTTP-híváson keresztül), és az öt `chart1`–`chart5` ág logikája szét van szórva a route-kezelőben. Javaslat: minden diagramhoz egy `RETURNS TABLE` PL/pgSQL függvény, amely a szűrési paramétereket (`year`, `month`, `time` — itt is fehérlistázva marad, ahogy jelenleg —, `company`) fogadja:

```sql
CREATE OR REPLACE FUNCTION public.fn_report_tissue_demand(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_company integer DEFAULT NULL
)
RETURNS TABLE (product_type varchar, total_quantity numeric)
LANGUAGE sql STABLE
AS $$
  SELECT tissue, SUM(orderweight)
  FROM rfq
  WHERE (p_year IS NULL OR EXTRACT(YEAR FROM requestdate) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM requestdate) = p_month)
    AND (p_company IS NULL OR customer_id = p_company)
  GROUP BY tissue;
$$;
```

Előny: a lekérdezés logikája egy helyen, önállóan tesztelhető (`SELECT * FROM fn_report_tissue_demand(2024, NULL, NULL)`), az `app.js` route-kezelő pedig egyetlen `pool.query('SELECT * FROM fn_report_tissue_demand($1,$2,$3)', [...])` hívásra egyszerűsödik chartonként — a jelenlegi, string-összefűzéssel épített `query`/`group` változópáros teljes egészében megszűnik. Ez különösen a `time` paraméter kezelését egyszerűsítené, amely jelenleg (az `INTERVAL` literál szintaktikai korlátja miatt) egy zárt fehérlistával (`REPORT_TIME_WINDOWS`) validált, majd szó szerint interpolált string — ez PL/pgSQL függvényben `interval` típusú paraméterként natívan, string-interpoláció nélkül fejezhető ki.

### 4.3. Amit **nem** javaslok áthelyezni

Az admin CRUD (`adminInsertRows`/`adminDeleteRows`, `app.js`, 519–566. sor) fehérlistázott, dinamikus tábla-célú beszúrás/törlés. Ennek adatbázisoldali (pl. generikus, tábla-nevet paraméterként fogadó PL/pgSQL eljárás) kiváltása nem hozna érdemi előnyt — a dinamikus SQL-azonosító-összeállítás problémája (identifier nem paraméterezhető) az adatbázis rétegben is ugyanúgy fennállna, csak PL/pgSQL `EXECUTE format(...)` formában, ami nem egyszerűbb vagy biztonságosabb, mint a jelenlegi, alkalmazásoldali fehérlista. Hasonlóképp, jelszó-hashelés (`bcrypt`) az adatbázis rétegben (pl. `pgcrypto` kiterjesztéssel) technikailag megoldható lenne, de nem javaslom: a `bcrypt` node modul jelenlegi használata jól bevált, és a hash-elési paraméterek (cost factor) alkalmazásoldali kezelése rugalmasabb és jobban dokumentált, mint egy DB-szintű megoldás.

---

# Adatbázis-létrehozás automatizálása és telepítő varázsló

## 5. Fogalmi különbségtétel: a "fizikai" adatbázis és a séma

Két, egymástól élesen elválasztandó szintről van szó, és javaslom, hogy csak az egyiket automatizáljuk alkalmazás-indításkor:

| Szint | Mit jelent | Kinek a felelőssége jelenleg | Automatizálásra javasolt? |
| --- | --- | --- | --- |
| **1. Adatbázis-példány / `CREATE DATABASE`** | A PostgreSQL szerveren belül maga az adatbázis (`DB_DATABASE`) létezik-e | AWS RDS esetén az `.ebextensions/rds.config` (infrastruktúra), helyi fejlesztésben eddig kézi `createdb` | **Nem, éles környezetben** |
| **2. Séma (táblák, kényszerek) az adatbázison belül** | A `db/schema.sql`-ben leírt objektumok léteznek-e | Jelenleg kézi `psql -f db/schema.sql` | **Igen, alkalmazás-indításkor, migrációs mechanizmussal** |

Az 1. szint automatizálása ellen szól, hogy a `CREATE DATABASE` jogosultság tipikusan `CREATEDB`/superuser szintű Postgres-jogosultságot igényel — ezt az alkalmazás futtató DB-felhasználójának (amely az AWS RDS kapcsolati adatokban van, `.env`/Beanstalk konfiguráció) a legkisebb jogosultság elve (*least privilege*) alapján **nem** célszerű megadni. Ha az alkalmazás futásidejű kódja képes lenne adatbázist létrehozni, ugyanaz a kód (vagy egy abban található hiba, illetve egy jogosulatlan hozzáférés) elméletileg más adatbázisokat is létrehozhatna/törölhetne a szerveren. Ez a README "IT biztonság" fejezetében már rögzített elvekkel (paraméterezett lekérdezések, hozzáférési adatok elrejtése) is összhangban van.

Javaslat: az 1. szintet hagyjuk a jelenlegi, infrastruktúra-szintű megoldásnál (AWS RDS/`.ebextensions`, illetve helyi fejlesztésben egy külön, **az alkalmazástól független**, kézi/egyszeri `npm run db:create` script, amely a `postgres` karbantartási adatbázishoz csatlakozva, `CREATEDB` jogú fejlesztői felhasználóval ellenőrzi és szükség esetén létrehozza a fejlesztői adatbázist — ez nem fut az `app.js` induláskor, csak explicit fejlesztői parancsra).

A 2. szint automatizálása biztonságos és indokolt: az alkalmazás DB-felhasználójának amúgy is szüksége van DDL-jogosultságra (táblák módosítása admin felületről indirekt módon nem történik, de a séma karbantartása amúgy is ugyanazon felhasználóval történne).

## 6. Migrációkezelés — javasolt mechanizmus

Séma automatikus előállítására **nem** javaslom a `db/schema.sql` vak, feltétel nélküli újrafuttatását induláskor (`CREATE TABLE IF NOT EXISTS` mintázat) — ez a `CREATE TABLE` szintjén működne, de a jövőbeli `ALTER TABLE ... ADD CONSTRAINT` jellegű módosítások (pl. a fenti FK/index javaslatok) nem idempotensek natív módon, és egy ilyen "újrafuttatásos" megközelítés nem tudná nyomon követni, mely módosítások futottak már le egy adott környezeten.

Az iparágban bevett megoldás egy **migrációkövető tábla** + **sorszámozott, egyszer lefutó SQL-fájlok** kombinációja (ezt valósítja meg pl. a Flyway, a Liquibase, vagy Node.js világban a `node-pg-migrate`/Knex migrációs modulja). Két út közül lehet választani:

- **(a) Saját, minimál migrációs mechanizmus** — a szakdolgozat szempontjából erősebb, mert teljes egészében saját fejlesztésű marad, és jól bemutatható/dokumentálható a működése; cserébe kevésbé robusztus (nincs pl. checksum-ellenőrzés a fájlok utólagos módosítása ellen, nincs "dry run" mód).
- **(b) Bevált könyvtár (pl. `node-pg-migrate`)** — kevesebb saját kód, iparágban elfogadott, jobban tesztelt; viszont új függőség, és a szakdolgozatban "kész eszköz integrálásaként" kell bemutatni, nem saját algoritmusként.

Az alábbi vázlat az (a) opciót mutatja be, mivel ez illeszkedik jobban egy szakdolgozati "saját fejlesztésű alkalmazás" kerethez — de a végső döntés előtted áll.

### 6.1. Migrációkövető tábla

```sql
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id          serial PRIMARY KEY,
  filename    varchar(255) NOT NULL UNIQUE,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
```

Ez az egyetlen objektum, amelyet valóban `IF NOT EXISTS` móddal, feltétel nélkül biztonságos minden induláskor lefuttatni — önmagában idempotens, és nem tartalmaz sem `ALTER`, sem adatmódosítást.

### 6.2. Migrációs fájlok

```
db/
├── schema.sql                      # jelenlegi, referenciaként megmarad
└── migrations/
    ├── 001_init.sql                 # a schema.sql jelenlegi tartalma
    ├── 002_customers_email_unique.sql
    ├── 003_foreign_keys.sql
    ├── 004_indexes.sql
    └── ...
```

Minden fájl egyszer, sorszám szerint növekvő sorrendben fut le, tranzakcióba csomagolva.

### 6.3. Induláskor futó migrációs függvény (tervezet)

```js
// db/migrate.js
async function runMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id serial PRIMARY KEY,
      filename varchar(255) NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = await pool.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.rows.map(r => r.filename));

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Migráció alkalmazva: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Migráció sikertelen: ${file}`, err);
      throw err; // az alkalmazás induljon el hibával, ne inkonzisztens sémával
    } finally {
      client.release();
    }
  }
}
```

`app.js`-ben a `pool.connect().then(...)` blokk (45–51. sor) helyén/után hívva, **a HTTPS szerver `listen()`-je előtt** — így hibás migráció esetén az alkalmazás egyáltalán nem indul el hallgatózó állapotba, ahelyett hogy inkonzisztens sémával futna tovább.

## 7. Telepítő varázsló (first-run setup wizard)

### 7.1. Cél és trigger-feltétel

A varázsló célja kizárólag az **első admin fiók** létrehozása olyan környezetben, ahol a séma már létezik, de még egyetlen aktivált admin sincs — enélkül ugyanis a rendszer önmagát zárná ki (a `/register` végpont csak `status = false` fiókot hoz létre, amelyet admin oldalon kellene aktiválni — de admin nélkül ezt senki nem tudja megtenni: "tyúk-tojás" probléma).

```js
async function hasActiveAdmin() {
  const result = await pool.query(
    'SELECT EXISTS (SELECT 1 FROM customers WHERE role_id = $1 AND status = true) AS exists',
    [ROLES.ADMIN]
  );
  return result.rows[0].exists;
}
```

### 7.2. Végpontok

```js
app.get('/setup', async (req, res) => {
  if (await hasActiveAdmin()) {
    return res.status(404).send('Not found'); // ne áruljuk el, hogy létezett ilyen út
  }
  res.render('setup.ejs');
});

app.post('/setup', async (req, res) => {
  if (await hasActiveAdmin()) {
    return res.status(404).send('Not found');
  }
  // ugyanaz a validáció, mint a /register-nél (EMAIL_PATTERN, MIN_PASSWORD_LENGTH),
  // de role_id és status a kliens bemenetétől függetlenül, szerveroldalon kényszerítve:
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  await pool.query(
    `INSERT INTO customers (customer_name, vat_number, contact_name, email, phone, password, role_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
    [req.body.customer, req.body.vat, req.body.name, req.body.email, req.body.phone, hashedPassword, ROLES.ADMIN]
  );
  res.redirect('/login');
});
```

A kritikus biztonsági invariáns: a `hasActiveAdmin()` ellenőrzés **minden egyes kérésnél** fusson le (nem egyszer, induláskor gyorsítótárazva) — így akkor is önmagát zárja be a varázsló, ha egy admin fiók utólag törlésre kerülne, majd valaki megpróbálná a `/setup`-ot újra elérni.

### 7.3. Kiegészítő megfontolások (mérlegelendő, nem kötelező)

- **Race condition az internetre kitett `/setup` útvonalon**: amíg a `hasActiveAdmin()` `false`, bárki, aki eléri a nyilvánosan futó AWS Elastic Beanstalk-végpontot, létrehozhatja az első (tehát admin jogú) fiókot — nem csak az alkalmazás üzemeltetője. Ez főleg az első publikus telepítéskor releváns kockázat. Kezelési lehetőségek: (a) induláskor, ha nincs admin, egy véletlenszerű, egyszer használatos tokent generálni és `logger.info`-n keresztül a szerver naplójába (AWS CloudWatch) írni, amelyet a `/setup` űrlapon meg kell adni; (b) a `/setup`-ot csak akkor engedélyezni, ha egy környezeti változó (pl. `ALLOW_SETUP=true`) explicit be van kapcsolva, amelyet az üzemeltető a telepítés után manuálisan kikapcsol.
- **`views/setup.ejs`**: a `register.html`-hez hasonló, egyszerű űrlap — jelenleg még nem készült el, ez a javaslat része, nem megvalósult állapot.

## 8. Javasolt megvalósítási sorrend

A fenti javaslatok terjedelme miatt szakaszolt bevezetést javaslok, hogy minden lépés külön ellenőrizhető/commitolható legyen:

1. `customers.email` `UNIQUE` kényszer (önálló hibajavítás, minimális kockázat).
2. A tisztázott FK-k (1.1–1.5) és a hozzájuk tartozó indexek (2.1–2.4) bevezetése egy `db/schema.sql`-t kiegészítő módosításként.
3. A `tds` kapcsolat (1.6) és az `rfq.certification` adatminőségi kérdés (3.) tisztázása veled — ezek döntést igényelnek, mielőtt migrációvá alakíthatók.
4. `schema_migrations` mechanizmus kialakítása, a jelenlegi `db/schema.sql` tartalmának `001_init.sql`-lé alakítása, a fenti lépések `002`, `003`, ... migrációkká szervezése.
5. Telepítő varázsló (`/setup`) megvalósítása.
6. (Opcionális, architektúrális döntés) tárolt eljárások/függvények bevezetése a 4. pont szerint.

Jelezd, melyik szakasszal kezdjünk, vagy ha az egészet egy menetben szeretnéd megvalósíttatni.

## 9. Megvalósítási állapot

- **1–2. lépés** (`customers.email` `UNIQUE`, FK-k 1.1–1.5, indexek 2.1–2.4): **még nem valósult meg** — külön jóváhagyást igényel.
- **3. lépés** (`tds` kapcsolat tisztázása): **megtörtént** — a döntés: a mező a `tds.tdsid`-t tárolja. Megvalósítva: `db/migrations/002_tds_tdsid.sql` (a `tds` tábla korábban hiányzó elsődleges kulcsával együtt), valamint az `app.js`/`render.js`/`cart.js` ennek megfelelő módosítása.
- **`rfq.certification` adatminőségi kérdés (3. pont)**: **még nem valósult meg**.
- **4. lépés** (`schema_migrations` mechanizmus): **megvalósult** — `db/migrate.js`, `db/migrations/001_init.sql`.
- **5. lépés** (telepítő varázsló, `/setup`): **megvalósult** — `app.js` (`hasActiveAdmin()`, `/setup` GET/POST, egyszer használatos token), `views/setup.ejs`. Lásd README „Az első admin fiók létrehozása” szakasz.
- **6. lépés** (tárolt függvények): **megvalósult** (a riport-függvények és a `fn_create_order_from_cart`) — `db/migrations/003_stored_functions.sql`.
