# Kódátvilágítás — `app.js`

Az alábbi észrevételek az `app.js` (backend törzs), valamint a hozzá kapcsolódó kliensoldali szkriptek (`public/assets/scripts/`) áttekintése alapján készültek. A rendszerezés súlyosság szerint történik: kritikus biztonsági hibák, funkcionális hibák, karbantarthatósági (Clean Code) észrevételek, majd modernizációs javaslatok. Minden ponthoz megadom a forrásfájlbeli hivatkozást és egy rövid javítási irányt — a teljes fájl újraírása nélkül.

## 1. Kritikus biztonsági hibák

### 1.1. Hitelesítés nélkül elérhető, SQL injection-nek kitett riport-végpont

`app.js`, `/api/report/:data` (kb. 854–913. sor)

A végpont — a többi útvonallal ellentétben — **nem ellenőrzi** a `req.isAuthenticated()` állapotot, tehát bejelentkezés nélkül is elérhető. Ráadásul a `year`, `month`, `time`, `company` paraméterek közvetlenül, string-konkatenációval kerülnek a lekérdezésbe:

```js
where = "WHERE EXTRACT(YEAR FROM requestdate) = " + year + " AND EXTRACT(MONTH FROM requestdate) = " + month;
...
where = where + " WHERE requestdate >= CURRENT_DATE - INTERVAL '" + time + "'";
...
where = " WHERE customer_id = " + company;
```

Ez egy klasszikus, kihasználható SQL injection, amely **hitelesítés nélkül** is elérhető — a legsúlyosabb, azonnal javítandó hiba a fájlban. Javaslat: paraméterezett lekérdezés (`$1`, `$2`, …) bevezetése, valamint a `req.isAuthenticated()` (és célszerűen `role_id` alapú jogosultság-) ellenőrzés pótlása a többi útvonalhoz hasonlóan.

### 1.2. További SQL injection-pontok string-interpolációval

- `buildFilterQuery` (365–384. sor) — `data.s1`, `data.s2`, `data.s3` közvetlen template literal interpoláció, a `/mw` `"filter"` ágon keresztül érhető el bejelentkezett felhasználóként.
- `getOptions` (438–464. sor) — a `whereCondition` paraméter (`Grammatura`, `Diameter`, `Reels`, `Ediameter` esetek) szintén interpolálva kerül be, a `/mw/:data` `"option"` ágon keresztül.
- `getCustomerMoreDetails` (465–470. sor) — `customerId` interpolálva.
- `/protected`, `/aszf`, `/elerhetoseg`, `/cookie-policy`, `/profile` (520., 537., 553., 570., 639. sor) — mindenhol `"... WHERE customer_id=" + req.user.customer_id` mintázat.
- `/admin` (588–602. sor) — nagy, több `SELECT`-et összefűző string, benne `req.user.customer_id` interpolálva.

Ezekben az esetekben a `customer_id` jelenleg a szerveroldali munkamenetből (session) származik, így közvetlen külső bemenetről szigorúan véve nincs szó — ettől függetlenül **elvi hiba** paraméterezés helyett string-összefűzést használni, mert egyetlen refaktor (pl. az azonosító forrásának megváltoztatása) is könnyen injection-t nyithat. Célszerű minden lekérdezést egységesen `$1`/`$2` paraméterezéssel írni, ahogy azt a fájl más részein (pl. `updateUser`, `addToCart`) már helyesen alkalmaztad.

### 1.3. `httpOnly: false` a session cookie-n

63–76. sor:

```js
app.use(session({
  ...
  cookie: {
    ...
    httpOnly: false, // A cookie nem elérhető JavaScript-en keresztül
    ...
  },
```

A kommentár és a beállított érték **ellentmond egymásnak**: a komment szerint a cookie nem érhető el JavaScript-ből, valójában a `false` érték pont ezt teszi lehetővé — bármilyen XSS-sebezhetőség esetén a session cookie kiolvasható és eltéríthető. Javaslat: `httpOnly: true`, hacsak nincs konkrét, dokumentált technikai indok az ellenkezőjére (jelenleg nincs ilyen a kódban).

### 1.4. Hiányzó CSRF-védelem és biztonsági fejléc-middleware

A `/mw`, `/users`, `/register`, `/login` végpontok mind session/cookie-alapú hitelesítést használnak, de nincs CSRF-token-ellenőrzés (pl. `csurf` vagy egyenértékű middleware), és nincs `helmet` (vagy kézzel beállított CSP/HSTS/X-Frame-Options fejléc) sem. Mindkettő viszonylag kis ráfordítással bevezethető, és a szakdolgozat IT biztonsági fejezetéhez is szervesen illeszkedne.

### 1.5. Nem admin-only tesztvégpont, amely tömeges adatbeszúrást tesz lehetővé

`/test/:data` (824–852. sor) — a végpont csak `isAuthenticated()`-et ellenőriz, `role_id`-t nem, tehát bármely bejelentkezett (akár sima ügyfél-) felhasználó `fakeuser` vagy `fakerfq` fejléccel akár 999 rekordot tud beszúrni éles adatbázisba. Javaslat: a végpont vagy admin-only jogosultsághoz kötése, vagy — mivel kifejezetten tesztadat-generálásra való — teljes kizárása az éles build-ből (`if (process.env.NODE_ENV !== 'production')` őrfeltétel, vagy külön seed-scriptbe kiszervezve).

## 2. Funkcionális hibák (valószínűsíthetően törött kódutak)

### 2.1. `/users` — `update_detalis` és `list` ágak feltehetően hibásan futnak

279–313. sor:

```js
if (head === "update_detalis") {
  const query = await updateUser(data);      // updateUser MÁR lefuttatja a pool.query-t, és { message: ... }-et ad vissza
  const result = await pool.query(query);    // itt egy objektumot próbálunk lekérdezésként futtatni
  res.status(200).send({ message: 'User successfully updated' });
} else if (head === "list") {
  const query = await listUsers();           // listUsers MÁR lefuttatja a pool.query-t, és result.rows tömböt ad vissza
  const result = await pool.query(query);    // itt egy tömböt próbálunk lekérdezésként futtatni
  res.status(200).send({ data: result.rows });
} else if (head === "usersfilter") {
  const { query, values } = await filterUsers(data);   // filterUsers NEM futtatja le, csak összeállítja — helyes minta
  const result = await pool.query(query, values);
  ...
```

A négy segédfüggvény (`updateUser`, `listUsers`, `filterUsers`, `updateProfile`) nem egységes szerződés szerint működik: kettő már lefuttatja a lekérdezést és kész eredményt/üzenetet ad vissza, kettő pedig csak a `{query, values}` párost építi fel, amit a hívó fut le. A `/users` route viszont mind a négy ágon ugyanazt a (helytelen) mintát alkalmazza — emiatt az `update_detalis` és a `list` ág valószínűleg minden hívásnál `TypeError`-ral elszáll a `pg` könyvtárban (a `pool.query()` nem tud objektumot vagy tömböt lekérdezésként értelmezni), amit a `catch (error)` elkap és 500-as választ ad. Érdemes leellenőrizni admin felületen, ténylegesen működik-e ez a két funkció — ha nem, ez megmagyarázza. Javaslat: egységesíteni a segédfüggvények szerződését (pl. mindegyik `{query, values}`-t adjon vissza, vagy mindegyik saját maga fusson le és a végeredményt adja vissza — de ne keveredjen a kettő).

### 2.2. `getCustomerMoreDetails` — több `SELECT` egy hívásban, tömbként indexelve (helyesbítés)

465–470. sor (eredeti állapot):

```js
const sql = `SELECT * FROM customers WHERE customers.customer_id = ${customerId}; 
             SELECT COUNT(cartid) FROM cart WHERE cart.customer_id = ${customerId}`;
const result = await pool.query(sql);
return { customerData: result[0].rows, cartCount: result[1].rows };
```

**Helyesbítés a korábbi állásponthoz képest:** az eredeti átvilágításban tévesen azt írtam, hogy a `pg` könyvtár nem ad vissza tömböt több utasítás esetén. Az `admin.ejs` és `profile.ejs` nézetek (`data[0]`…`data[13]`, illetve `data[0]`…`data[2]` indexelése), valamint a `pg` forráskódjának (`lib/query.js`, `_checkForMultirow()`) ellenőrzése alapján kiderült, hogy a `pg` **valóban** tömbbe gyűjti az eredményeket, ha a lekérdezés szöveges (paraméterek nélküli) formában, egyszerű lekérdezés protokollon (simple query protocol) keresztül több utasítást tartalmaz. Az eredeti kód tehát ebben a tekintetben működött — a `getCustomerMoreDetails` és az `/admin` route sem volt emiatt hibás.

Ettől függetlenül a `customerId` string-interpolációja SQL injection szempontból változatlanul hiba (lásd 1.2), és a mintázat (több `SELECT` egyetlen stringben összefűzve) nehezen olvasható, paraméterezhetetlen (a PostgreSQL kiterjesztett/paraméteres protokollja nem enged több utasítást egy `Parse` üzenetben). A javításkor ezért nem a "több eredményhalmaz" feltevést kell megkérdőjelezni, hanem a lekérdezéseket kell szétbontani külön, paraméterezett hívásokra — ez a `getCustomerMoreDetails` esetében meg is történt (két külön `pool.query()` hívás), az `/admin` és `/profile` route-oknál pedig `Promise.all()`-lal, a nézetek által elvárt tömbindexelés megtartásával.

### 2.3. `JSON.parse` a `try/catch` blokkon kívül, `async` route handlerben

Három helyen: `/mw/:data` (474. sor), `/test/:data` (826. sor), `/api/report/:data` (855. sor) — mindhárom helyen a `JSON.parse(request.params.data)` a `try` blokk **előtt** fut. Mivel a handler `async` függvény, egy hibás JSON esetén a `JSON.parse` szinkron dobása elutasított Promise-szá alakul, amit Express 4 **nem kap el automatikusan** — a kérés válasz nélkül marad (a kliens időtúllépésig vár), és a szerver oldalon kezeletlen promise rejection keletkezik. Javaslat: a `JSON.parse`-t is vonjuk be a `try` blokkba, és hibás bemenet esetén küldjünk explicit `400 Bad Request` választ.

### 2.4. Hiányzó `else` ág hitelesítetlen kérésekre

`/mw` (385. sor) és `/mw/:data` (471. sor, illetve a 472. sorban lévő `if`): ha `req.isAuthenticated()` hamis, a függvény egyszerűen nem csinál semmit — nincs `res.redirect()`, nincs `res.status(401)`. A kérés így válasz nélkül marad, ami kliensoldalon lefagyni látszó hívásként jelentkezik. A többi route-nál (pl. `/protected`, `/admin`) van `else { res.redirect('/login') }` ág — érdemes ugyanezt a mintát következetesen alkalmazni mindenhol.

### 2.5. Nem használt `port` változó

17. sor: `const port = process.env.APP_PORT || 3000;` deklarálva van, de a tényleges szerverindítás (60. sor) közvetlenül a `process.env.APP_PORT`-ot használja, fallback nélkül:

```js
https.createServer(options, app).listen(process.env.APP_PORT, () => { ... });
```

Ha az `APP_PORT` környezeti változó hiányzik, a `.listen(undefined, ...)` hívás Node.js-ben egy véletlenszerű szabad portot fog választani a szándékolt 3000 helyett. Javaslat: a már deklarált `port` változó használata a `.listen()` hívásban.

## 3. Karbantarthatóság, Clean Code

- **Hosszú, egymásba ágyazott `if/else if` láncok** a `head` mező alapján történő elágaztatásra (`/users`, `/mw`, `/mw/:data`, `/api/report/:data`). Egy handler-táblázat (`{ cart: handleCart, cartlist: handleCartList, ... }`) olvashatóbb, könnyebben bővíthető, és mellékesen megoldja a hiányzó `else` ágak problémáját is egy közös `default` kezelővel.
- **Mágikus szám a szerepkör-ellenőrzésben**: `req.user.role_id === 3` szerepel szó szerint négy helyen (`/admin`, `/report`, és burkoltan a jogosultsági logikában). Egy `const ROLES = { ADMIN: 3, ... }` konstans és egy `isAdmin(req)` segédfüggvény lényegesen olvashatóbbá tenné a kódot, és egy helyen lehetne módosítani, ha a szerepkör-azonosítók változnának.
- **Vegyes stílus**: a fájlban `var` (3., 11., 147., 520., 588., 639. sor) és `const`/`let` egyaránt előfordul. Célszerű egységesen `const`/`let`-re váltani.
- **Vegyes hívási konvenció**: egyes helyeken `async/await` + `try/catch` (pl. `updateUser`, `addToCart`), máshol hagyományos `pool.query(sql, (err, result) => {...})` callback (pl. `/protected`, `/admin`, `/profile`, `/report`). A kettő keverése megnehezíti a hibakezelés egységesítését; érdemes a teljes fájlt `async/await`-re konvertálni.
- **Elnevezési következetlenség**: a legtöbb route `req`/`res` paraméternevet használ, a `/mw/:data` és a `/test/:data` viszont `request`/`response`-t.
- **Elnyelt hibák**: a `/test/:data` `catch (err) { }` ága (849–851. sor) üres — a hiba sem naplózásra, sem válaszként visszaküldésre nem kerül, ami megnehezíti a hibakeresést.
- **Naplózásba kerülő nyers SQL**: a 906. sor `console.log(query)`-ja a teljes, paraméterekkel összefűzött SQL-t logolja — érdemes megfontolni, hogy ez éles környezetben (CloudWatch) ne kerüljön ki, vagy legalább strukturált, szűrhető logolásra váltani (pl. `pino`/`winston`), konzol helyett.

## 4. Modernizációs javaslatok

| Terület | Jelenlegi állapot | Javaslat |
| --- | --- | --- |
| Session tárolás | `sessionstore` csomag | `connect-pg-simple` — közvetlenül a már meglévő `pg` Pool-ra épül, aktívabban karbantartott, és nem igényel külön session-store kapcsolatot. |
| Fake adat generálás | `faker` (a `require('faker')`, 14. sor) | A `package.json`-ban már szerepel a `@faker-js/faker` devDependency-ként — érdemes átállni erre, mivel az eredeti `faker` csomagot a szerzője 2022-ben visszavonta, azóta nem karbantartott. |
| Body parsing | `body-parser` külön csomag | Express 4.16 óta a `express.json()` és `express.urlencoded()` beépítve elérhető — a `body-parser` függőség elhagyható (a kód már használja is az `express.urlencoded`-et a 55. sorban, csak a JSON-parsing maradt a régi csomagon). |
| Nem használt függőség | `jsonwebtoken`, `JWT_SECRET` (19. sor) deklarálva, de sehol nincs ténylegesen használva | Törlés, vagy — ha a jövőbeli terv API-token-alapú hitelesítés bevezetése — dokumentálni a tervezett használatot. |
| Biztonsági fejlécek | nincs | `helmet` middleware bevezetése. |
| CSRF védelem | nincs | `csurf` vagy modern alternatívája (pl. double-submit cookie minta). |
| Rate limiting | nincs a `/login`, `/register` végpontokon | `express-rate-limit` bevezetése brute-force védelemhez. |

## 5. Kliensoldali szkriptek — rövid megjegyzés

A `public/assets/scripts/render.js` `createElement` segédfüggvénye (2–15. sor) string gyermek elemeket `element.innerHTML +=` formában illeszt be:

```js
children.forEach(child => {
    if (typeof child === "string") {
        element.innerHTML += child;
    } else {
        element.appendChild(child);
    }
});
```

Ha bármelyik hívási helyen adatbázisból származó, felhasználó által korábban megadott szöveg (pl. cégnév, cím, megjegyzés mező) kerül ide közvetlenül string paraméterként, ez tárolt XSS-t tesz lehetővé. Érdemes végignézni a `createLabel`/`createSpan`/`createElement` hívási helyeit az `admin.js`, `cart.js` fájlokban, és mindenhol, ahol a szöveg végfelhasználói bemenetből származhat, `textContent`-et használni `innerHTML` helyett. Ezt a kliensoldali szkriptek részletesebb, önálló átvilágítása keretében érdemes folytatni — jelezd, ha ez legyen a következő kör.

## 6. A javítás során feltárt további hibák

A javítások implementálása közben (2025-ös állapothoz képest) még három, az eredeti átvilágításban nem szereplő hibát azonosítottam, és ezeket is javítottam:

- **`/users` — hiányzó jogosultság-ellenőrzés (jogosultság-kiterjesztés / IDOR)**: az `update_detalis` és `list` ágak (felhasználók listázása, szerepkör/állapot módosítása) korábban bármely bejelentkezett — akár sima ügyfél — felhasználó számára elérhetők voltak, holott ezek admin funkciók. Emellett a `profile_update` ág a kliens által küldött `data.id`-t használta a módosítandó cím azonosítására, ami lehetővé tette volna, hogy egy felhasználó más ügyfél címadatait módosítsa (IDOR — Insecure Direct Object Reference). Javítva: a két admin-funkció mostantól `role_id === ROLES.ADMIN`-t követel, a `profile_update` pedig mindig a bejelentkezett felhasználó saját `customer_id`-jét használja, a kliens által küldött `id`-t figyelmen kívül hagyva.
- **`/test/:data` — `res` változó `response` helyett, illetve az egész alkalmazás adatbázis-kapcsolatának lezárása**: a `head === "fakeuser"` ág egy nem létező `res` változóra hivatkozott (a függvény paramétere `response` volt) — ez `ReferenceError`-t okozott volna egy `catch`-csel nem védett `async` IIFE-n belül, ami kezeletlen promise rejection-t (és Node.js jelenlegi verzióiban akár a folyamat leállását) eredményezhette volna. Emellett mindkét ág `pool.end()`-et hívott sikeres futás után, ami a teljes alkalmazás közös adatbázis-kapcsolat-készletét zárta volna le — minden azt követő adatbázis-művelet elszállt volna. Mindkettőt javítottam, és a végpontot admin jogosultsághoz, valamint nem-production környezethez kötöttem.
- **`/api/report/:data` — kettős `WHERE` kulcsszó lehetősége**: az eredeti kód a `time` szűrőt mindig `" WHERE ..."`-vel kezdve fűzte hozzá, függetlenül attól, hogy az `year`/`month` szűrő már generált-e `WHERE` záradékot — ha mindkettő aktív volt, a lekérdezés szintaktikailag hibás lett volna (két `WHERE` kulcsszó). Az új implementáció egységesen `AND`-del összefűzött feltétellistát épít.

## Összegzés — javasolt prioritási sorrend

1. `/api/report/:data` hitelesítés + SQL injection javítása (1.1) — **azonnali**
2. `httpOnly: true` a session cookie-n (1.3) — **azonnali, triviális javítás**
3. A többi SQL injection-gyanús pont paraméterezése (1.2)
4. `/users` `update_detalis`/`list` ágak tesztelése és javítása (2.1)
5. `/test/:data` admin-only-ra korlátozása vagy eltávolítása (1.5)
6. CSRF-védelem és `helmet` bevezetése (1.4)
7. A többi funkcionális/Clean Code pont ütemezett refaktorálása
