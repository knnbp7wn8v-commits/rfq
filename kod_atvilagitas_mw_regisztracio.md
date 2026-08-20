# Kódátvilágítás — `/mw`, `/mw/:data`, regisztráció/bejelentkezés

Az első körben (`kod_atvilagitas_app_js.md`) még nem érintett részek: a `/mw` és `/mw/:data` middleware-végpontok kiszolgáló függvényei, valamint a `/register`, `/login`, `/logout`, `/protected` folyamatok. A legsúlyosabb megállapítás (1.1) minden eddiginél kritikusabb — kérlek, ezt olvasd el elsőként.

## 1. Kritikus biztonsági hiba

### 1.1. `/mw/:data` `"add"`/`"delete"` ág — a kliens tetszőleges SQL-t futtathat le

Ez a projekt eddig azonosított legsúlyosabb hibája, súlyosabb az első körben talált SQL injection-öknél is.

`app.js`, `addOrDeleteData` függvény:

```js
async function addOrDeleteData(query, action) {
  await pool.query(query);
  ...
}
```

Ezt a `/mw/:data` route hívja:

```js
} else if (head === "add" || head === "delete") {
  const qry = parsedData.data;
  const message = await addOrDeleteData(qry, head);
  ...
```

A `parsedData.data` közvetlenül a kérés URL-paraméteréből (`request.params.data`, JSON-ként értelmezve) származik, és **teljes egészében, változtatás nélkül** kerül végrehajtásra `pool.query()`-val — nem egy paraméterérték, hanem **a teljes SQL-utasítás** a kliens kezében van.

A kliensoldali eredetét megnéztem: a `views/admin.ejs` (614. és 677. sor) fájlban az adminisztrációs felület maga is így építi fel és küldi el ezt a lekérdezést:

```js
qry = "INSERT into portfolio (tissue, reel, grammatura) VALUES " + str;
...
fetch('/mw/{"head":"add", "target":"' + target + '", "data":"' + qry + '"}', { method: 'GET' })
```

Tehát a szándék az volt, hogy az admin felület a saját maga által összeállított `INSERT`/`DELETE` utasítást küldje be — de mivel a szerver oldali `/mw/:data` route **kizárólag** `request.isAuthenticated()`-et ellenőriz, `role_id`-t nem, ezért ez a végpont bármely bejelentkezett (akár sima ügyfél-) felhasználó számára elérhető, függetlenül attól, hogy az admin felületet egyáltalán látja-e. Egy bejelentkezett, nem admin felhasználó egyetlen kézzel összeállított kéréssel tetszőleges SQL-t futtathat: adatok törlése, módosítása más ügyfeleknél, vagy akár `DROP TABLE` jellegű parancsok.

**Ez azonnali javítást igényel.** Rövid távon (minimális beavatkozással): a `head === "add" || head === "delete"` ághoz kötelezővé kell tenni a `role_id === ROLES.ADMIN` ellenőrzést — ez a kockázatot "bármely bejelentkezett felhasználó" szintről "admin" szintre csökkenti, de nem szünteti meg: egy admin fiók kompromittálása esetén (pl. XSS-en vagy session-lopáson keresztül) továbbra is tetszőleges SQL futtatható. Középtávon javasolt a teljes mechanizmus átalakítása: a kliens ne SQL-szöveget, hanem strukturált adatot (tábla neve egy fehérlistából + oszlop/érték párok) küldjön, a szerver pedig ez alapján állítsa össze a paraméterezett `INSERT`/`DELETE` lekérdezést. Ez utóbbi az `admin.ejs` inline szkriptjének (580–680. sor körüli rész) átírását is igényli — jelezd, ha ezt a következő körben szeretnéd, mivel ez már a kliensoldali kódot is érinti, nem csak az `app.js`-t.

## 2. Funkcionális hibák

### 2.1. `/logout` nem jelentkezteti ki ténylegesen a felhasználót

```js
app.post("/logout", (req, res) => {
  token = null;
  res.redirect("/")
});
```

A `token` egy sehol máshol nem használt, deklarálatlan változó (globális szivárgás) — az alkalmazás ténylegesen Passport session-alapú hitelesítést használ, nem tokent. Ez a kód **nem hívja meg** a Passport `req.logout()` metódusát, és nem semmisíti meg a szervergeoldali session-t (`req.session.destroy()`) sem — vagyis a "kijelentkezés" gomb valójában **nem jelentkezteti ki** a felhasználót, a session cookie továbbra is érvényes marad. Ez megosztott/nyilvános gépeken komoly biztonsági kockázat. Javaslat:

```js
app.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    req.session.destroy(() => {
      res.clearCookie('rfq_cookie');
      res.redirect('/login');
    });
  });
});
```

### 2.2. `/protected` — soha le nem álló `setInterval`, illetve hibás hivatkozás a `logSessionTime`-ban

```js
app.get('/protected', (req, res) => {
  if (req.isAuthenticated()) {
    setInterval(() => {
      logSessionTime(req);
    }, 1000); // 1 másodpercenként fut
    ...
```

Minden egyes `/protected` oldalra érkező kérés elindít egy **soha le nem állított** `setInterval`-t (nincs sehol `clearInterval` hívás). Az oldal minden egyes megnyitásakor egy újabb, örökké futó időzítő halmozódik fel a szerver folyamatában — ez memóriaszivárgás, és idővel egyre több felesleges háttérművelet terheli a szervert, minél többször tölti újra az oldalt akár egyetlen felhasználó is.

Ráadásul a meghívott `logSessionTime` függvény:

```js
function logSessionTime(req) {
  if (req.session && req.session.cookie) {
    const timeLeft = req.session.cookie.maxAge;
    // console.log(...) — ki van kommentezve
  } else {
    res.redirect('/login');   // <- 'res' nincs a függvény paraméterei között!
  }
}
```

Az `else` ágban egy nem definiált `res` változóra hivatkozik (a függvény csak `req`-et kap paraméterként). Ha a session valaha érvénytelenné válik, miközben ez az időzítő még fut, egy `ReferenceError` keletkezik egy `setInterval` callback-en belül — ez Node.js-ben **nem kezelhető** Express hibakezelővel, és a jelenlegi Node.js verziókban a folyamat leállásához (crash) vezethet.

Mivel a függvény lényegi ága (a `console.log`) ki van kommentezve, a `setInterval` jelenleg gyakorlatilag semmi hasznosat nem csinál — csak szivárog és összeomlás-kockázatot hordoz. Javaslat: az egész `setInterval`/`logSessionTime` blokk eltávolítása a `/protected` route-ból; ha a session hátralévő idejének kliensoldali megjelenítése a cél, arra már létezik a `/session-status` végpont, amit a kliens lekérdezhet időzítve, szerveroldali időzítő nélkül.

### 2.3. `createOrder` — a kosár nem ürül ki megrendelés leadása után

```js
async function createOrder(userid) {
  await pool.query(`INSERT INTO rfq (...) SELECT ... FROM cart WHERE customer_id = $1`, [userid]);
  const result = await pool.query(`SELECT * FROM cart WHERE customer_id = $1`, [userid]);
  return result.rows;
}
```

A függvény átmásolja a kosár (`cart`) tartalmát az `rfq` táblába, de utána **nem törli** a kosarat. Emiatt, ha a felhasználó másodszor is rákattint a megrendelés gombra (vagy a `/mw` `"order"` fejlécet két kérésben elküldi), a már korábban leadott tételek **ismételten** bekerülnek az `rfq` táblába — duplikált megrendelések keletkeznek. Javaslat: a beszúrás és a kosár ürítése egy tranzakcióban történjen:

```js
async function createOrder(userid) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO rfq (...) SELECT ... FROM cart WHERE customer_id = $1 RETURNING *`,
      [userid]
    );
    await client.query('DELETE FROM cart WHERE customer_id = $1', [userid]);
    await client.query('COMMIT');
    return inserted.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

(A fenti egyben azt is javítja, hogy a függvény jelenleg a kosár tartalmát adja vissza "megrendelés" címen, nem a ténylegesen létrehozott `rfq` sorokat — a `RETURNING *` ezt is helyre teszi.)

### 2.4. `/register` — a `bcrypt.hash` hívás a `try` blokkon kívül fut, nincs bemenet-validáció

```js
app.post('/register', async (req, res) => {
  const { customer, vat, name, email, phone, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);   // <- try blokkon kívül
  try {
    const result = await pool.query('INSERT INTO customers(...) VALUES(...)', [...]);
    res.redirect('/login');
  } catch (error) { ... }
});
```

Ha a `password` mező hiányzik vagy nem string (pl. hibás/hiányos kérés érkezik), a `bcrypt.hash` hívás elszáll, ez pedig — mivel a `try` blokkon kívül van — kezeletlen promise rejection-t okoz (ugyanaz a mintázat, mint amit az első körben a `JSON.parse`-nál találtunk). Emellett a végpont semmilyen bemenet-validációt nem végez: nincs email-formátum ellenőrzés, nincs minimális jelszóhossz/-erősség előírás, nincs kötelező mezők ellenőrzése. Javaslat: a `bcrypt.hash` hívás bekerül a `try` blokkba, és a mezők (különösen `email`, `password`) validálása megelőzi a hash-elést.

## 3. Ellenőrzésre javasolt üzleti logika

### 3.1. A regisztrált, de esetlegesen "nem jóváhagyott" felhasználók bejelentkezése

A `customers` tábla `status` mezőjét az admin felület kezeli (`/users` `update_detalis`), és az `insertCustomers` teszt-generátor is `status = false` értékkel hozza létre az új rekordokat — ami arra utal, hogy az önregisztrált felhasználóknak admin jóváhagyásra várniuk kellene, mielőtt aktívan használhatnák a rendszert. A bejelentkezést végző `LocalStrategy` viszont **nem vizsgálja** a `status` mezőt:

```js
passport.use('local', new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
  const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
  ...
  const isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    return done(null, user);   // <- status ellenőrzés nélkül
  }
  ...
```

Ha a tervezett folyamat valóban admin-jóváhagyáshoz köti az új regisztrációk aktiválását, ez egy hiányzó ellenőrzés — bármely frissen regisztrált felhasználó azonnal be tud lépni, jóváhagyás nélkül. Ha viszont nem ez volt a szándék (a `status` mező más célt szolgál), ez a pont tárgytalan. Kérlek, erősítsd meg, hogy ez a szándékolt működés-e — ha nem, egy `if (!user.status) { return done(null, false, { message: 'A fiók jóváhagyásra vár.' }); }` sorral egyszerűen pótolható.

## 4. Kisebb, konzisztencia jellegű észrevételek

- **`checkTDS`** a teljes `pg` `Result` objektumot adja vissza (`return result;`), nem a `.rows` tömböt, ellentétben a fájl többi hasonló függvényével (`getCart`, `getCustomerDetails`, `listUsers` stb.). Ez feleslegesen szivárogtatja a driver belső mezőit (`fields`, `command`, `_parsers` stb.) a kliens felé, és inkonzisztens API-választ eredményez. Javaslat: `return result.rows;`.
- **`getdata`** (a `default` ág hiánya már javítva az első körben) és a `/mw/:data` `"data"`/`"option"` ágak jó példák a helyesen fehérlistázott, paraméterezett mintára — érdemes ezt a mintát követni az `addOrDeleteData` átalakításakor is (1.1. pont).

## Összegzés — javasolt prioritási sorrend

1. `/mw/:data` `"add"`/`"delete"` — legalább admin jogosultsághoz kötni (azonnali), hosszabb távon a kliensoldali SQL-építés teljes felszámolása (1.1)
2. `/logout` tényleges kijelentkeztetés pótlása (2.1)
3. `/protected` `setInterval` eltávolítása (2.2)
4. `createOrder` tranzakcióba foglalása, kosár ürítése (2.3)
5. `/register` bemenet-validáció és a `bcrypt.hash` try/catch-be helyezése (2.4)
6. `status` alapú bejelentkezés-ellenőrzés tisztázása és szükség esetén pótlása (3.1)
7. `checkTDS` visszatérési érték egységesítése (4.)
