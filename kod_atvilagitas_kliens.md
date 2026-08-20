# Kódátvilágítás — Kliensoldali szkriptek (`render.js`, `cart.js`, `admin.js`)

Ez a dokumentum a `public/assets/scripts/render.js`, `public/assets/scripts/cart.js` és `public/assets/scripts/admin.js` fájlok áttekintését tartalmazza, folytatva a korábbi két körben (`kod_atvilagitas_app_js.md`, `kod_atvilagitas_mw_regisztracio.md`) megkezdett szerveroldali munkát. A `render.js`-ben az első körben már jelzett, de akkor még csak feltételesen megfogalmazott `innerHTML`-kockázat (`createElement` függvény) ebben a körben — a `cart.js`-szel összefüggésben megvizsgálva — konkrét, kihasználható sebezhetőségnek bizonyult, ezért ez kapja az első helyet.

## 1. Biztonsági hibák

### 1.1. Tárolt XSS a kosár/RFQ "Megjegyzés" mezőjén keresztül

A `render.js`-ben definiált `createElement` segédfüggvény minden string típusú gyermekelemet `innerHTML`-be ír bele, escapelés nélkül:

```js
function createElement(type, attributes, ...children) {
    const element = document.createElement(type);
    ...
    children.forEach(child => {
        if (typeof child === "string") {
            element.innerHTML += child;   // <-- nincs escapelés
        } else {
            element.appendChild(child);
        }
    });
    return element;
}
```

Ezt használja a `createLabel` is, amelyre a `cart.js` `renderlist()` függvénye épít:

```js
if (item.comment != "") {
    txt01.innerHTML = "<span class='requestspan'>Accepable TDS: </span><span class='requestvaluespan tds_comment'>" + item.comment + "</span>"
}
```

Az `item.comment` értéke nem admin által karbantartott törzsadat, hanem szabad szöveges felhasználói bevitel: a `tdscheck()` (`render.js`) által létrehozott `<textarea id="comments">` mezőből származik, a `requestforquote()` (`cart.js`) küldi el a szerverre `POST /mw`, `head: "cart"` kéréssel, a szerver pedig **paraméterezett** lekérdezéssel (tehát SQL injection ellen védetten) menti a `cart._comment`, majd `createOrder()` átemelésekor az `rfq._comment` oszlopba (`app.js`, `addToCart`/`createOrder`). Az adat tehát a szerveren keresztül, tárolva jut vissza a böngészőbe, és onnan escapelés nélkül kerül `innerHTML`-be — ez a klasszikus **tárolt (stored) XSS** mintázata.

Jelenleg a hatás a saját munkamenetére korlátozódik (a felhasználó a saját kosarát látja vissza), ez tehát ma inkább self-XSS jellegű. A kockázat azonban nem elhanyagolható, és a jövőre nézve különösen fontos, mert:
- az `rfq` tábla tartósan tárolja a `_comment` mezőt, tehát ha a jövőben készül egy admin felületi RFQ-lista (ami a `szakdolgozat` funkcióleírása alapján életszerű bővítés), az adminisztrátori munkamenetben is lefutna a beszúrt script — ez már session-hijacking / admin jogkör-átvétel kockázatát is jelentené;
- a `sendtheemail()` (lásd 1.2) ugyanezt a `comment` mezőt (illetve más, szabadon szerkeszthető mezőket) HTML-ként küldi tovább e-mailben is.

**Javaslat:** a `createElement`-ben `element.innerHTML += child` helyett szöveges gyermekeknél `element.appendChild(document.createTextNode(child))` használata (ez minden jelenlegi hívási helyen működne, mivel a hívások vagy sima szöveget, vagy — a `createLabel`-en belüli néhány helyen — fejlesztő által írt, fix `<span>` markupot adnak át; ez utóbbiakat érdemes `createElement`-tel felépíteni string-összefűzés helyett). Alternatívaként egy dedikált `escapeHtml()` függvény bevezetése és következetes alkalmazása minden adatból származó (nem fejlesztői konstans) string előtt.

### 1.2. HTML-injektálás a kimenő e-mailbe (`cart.js`, `sendtheemail`)

A `sendtheemail()` a form mezőinek (cégnév, VAT-szám, kapcsolattartó, e-mail, telefon, cím stb.) értékét közvetlen string-összefűzéssel építi be a `mailbody` HTML-be, amit aztán az EmailJS SDK `my_html` paraméterként küld ki:

```js
mailbody = '...<span>' + from + '</span>...' + vat_val + '...' + adress_val + '...';
...
emailjs.send('service_uux90vr', 'template_8l2zxst', { to_name: 'Bodnár István', from_name: from, my_html: mailbody });
```

Mivel ezek a mezők a bejelentkezett (de nem admin) ügyfél saját, tetszőlegesen szerkeszthető bevitelei, egy rosszindulatú ügyfél HTML/script-töredéket illeszthet be, amely a címzett (az üzemeltető) levelezőkliensében jelenik meg — ez adathalász- vagy megtévesztési kockázatot jelent az üzemeltető felé, illetve egyszerűen elronthatja az e-mail formázását. Javaslat: a mezőket egy egyszerű HTML-escape függvényen átfuttatni, mielőtt a `mailbody`-ba kerülnek.

## 2. Funkcionális hibák

### 2.1. A kötelező mezők ellenőrzése ténylegesen hatástalan (`sendtheemail`)

```js
var from = (document.getElementById("c1_in").value === "") ? alert("The Name field cannot be empty!") : document.getElementById("c1_in").value; z = z + 1;
...
if (z == 9) { /* küldés */ }
```

A szándék láthatóan az volt, hogy `z` csak a ténylegesen kitöltött kötelező mezőknél nőjön, és a küldés csak `z == 9` esetén (vagyis ha minden kötelező mező ki van töltve) történjen meg. A `z = z + 1;` azonban **a ternáris kifejezésen kívül, önálló utasításként** szerepel minden egyes mezőnél — tehát mindig lefut, függetlenül attól, hogy a mező üres volt-e (és ezért az `alert()` ága futott-e), vagy sem. Ennek eredményeként `z` a nyolc kötelező mezőnél és a `par` értékadásnál összesen mindig 9-re nő, azaz **a `z == 9` feltétel mindig teljesül** — a validáció valójában semmit nem akadályoz meg. Egy üres kötelező mező esetén a felhasználó lát egy `alert()` ablakot, de az OK gomb megnyomása után a küldés folytatódik, és a hiányzó mező értéke `undefined` string-ként kerül be az e-mailbe (mivel az `alert()` visszatérési értéke `undefined`).

**Javaslat:** a `z` növelését be kell vonni a feltételes ágba (csak a "nem üres" ágon), vagy — tisztább megoldásként — egy explicit hiányzó-mezők tömb gyűjtése és a küldés `if (hianyzoMezok.length === 0)` alapú engedélyezése, `alert()` helyett inline hibaüzenetekkel.

### 2.2. `remove_div` / `remove_element` — tömb-literál blokk helyett (`render.js`)

```js
function remove_div(element) {
    if (document.getElementById(element)) [
        document.getElementById(element).remove()
    ]
  }

function remove_element(element) {
    if (document.getElementById(element)) [
        document.getElementById(element).remove()
    ]
}
```

A két függvény szó szerint azonos (kód-duplikáció), és mindkettőben a `{ }` blokkzárójel helyett `[ ]` szerepel — ez nem blokk, hanem egy tömb-literál kifejezés-utasítás. A kód *véletlenül* működik, mert a tömb kiértékelése során a benne lévő `.remove()` hívás is lefut, de ez feltehetően elgépelés, és megtévesztő/törékeny (pl. ha valaki a jövőben egy második utasítást szeretne hozzáadni a blokkhoz, `,`-vel próbálná elválasztani, ami más viselkedést eredményezne). Javaslat: `{ }`-ra cserélni, és a két azonos függvényt egyre összevonni (a hívási helyeken `remove_div` és `remove_element` felcserélve, megkülönböztetés nélkül használatosak).

### 2.3. A `weight` globális változó törékeny, implicit csatolása (`render.js`)

```js
var weight, orderWeight, weight_t, w1, w2 = 0;
...
case "Ediameter":
    ...
    weight = optionData.weight;   // csak itt kap értéket
    break;
...
function Ediameter_select_id(selectobject) {
    weight_t = Math.floor(weight / 274) * document.getElementById("Reels").value.split(" ")[0];
```

A `weight` modul-szintű globális változó kizárólag a `renderoptions("Ediameter", ...)` lefutása során, egy `switch`-ág mellékhatásaként kap értéket, majd egy másik függvény (`Ediameter_select_id`) implicit módon támaszkodik rá. Ha a felhasználó a form mezőit nem a tervezett sorrendben tölti ki, vagy a `renderoptions` hívása bármilyen okból elmarad/hibázik, a `weight` `undefined` marad, és a súlyszámítás csendben `NaN`-t eredményez, validáció vagy hibaüzenet nélkül. Javaslat: az `Ediameter` opciólistát (a hozzá tartozó `weight` értékkel együtt) egy strukturált objektumban (pl. `Map` az opció értékéhez rendelt adatokkal) tárolni, és a kiválasztáskor onnan kiolvasni, ne egy külső oldalhatásra bízott globális változóból.

### 2.4. A `fetch()` hívások nem ellenőrzik a válasz státuszkódját

Mind a három fájlban következetesen ez a minta fordul elő:

```js
fetch('/mw', { method: 'POST', ... })
    .then(response => response.json())
    .then(data => { /* sikeres válasz feltételezve */ })
    .catch(error => console.error('Error:', error));
```

A `fetch` Promise-a 4xx/5xx HTTP-válasz esetén **nem** utasítja el (`reject`) — csak hálózati hiba esetén. Ha a szerver pl. 401-et (nincs bejelentkezve, lásd a session lejárati logikát) vagy 500-at ad vissza, a `.then(response => response.json())` a hibaválasz JSON-testét (`{ message: '...' }` vagy `{ error: '...' }`) próbálja majd sikeres adatként feldolgozni, ami később kontrollálatlan `undefined`-hivatkozásokhoz vezethet (pl. `data.data[0]...`). Javaslat: minden ilyen hívásnál `if (!response.ok) { throw ... }` ellenőrzés a `.json()` előtt, illetve egyértelmű felhasználói visszajelzés (pl. "a munkamenet lejárt, kérjük jelentkezzen be újra") session-lejárat esetére.

## 3. `admin.js` — kiegészítő megállapítások

### 3.1. `validatePassword()` implicit globális változókra támaszkodik

A függvény nem `document.getElementById(...)`-del, hanem a HTML `id` attribútumból a böngésző által automatikusan létrehozott globális változókon (pl. egy `id="newpassword"` elemre hivatkozva egyszerűen a `newpassword` azonosítóval) keresztül éri el a mezőket. Ez a viselkedés (HTMLElement `id` → implicit `window` tulajdonság) elavult, nem szabványkonform gyakorlatra épülő böngésző-kompatibilitási sajátosság, amit modern kódban nem célszerű kihasználni: törékeny (névütközés esetén felülíródhat egy azonos nevű JS változóval), nehezen olvasható, és statikus elemzőeszközökkel/lintelővel nem ellenőrizhető. Javaslat: explicit `document.getElementById(...)` hivatkozások.

### 3.2. A jelszó-erősségi ellenőrzés csak kozmetikai — a mentés nem veszi figyelembe

A `details()` által felépített admin szerkesztő űrlapon az "Update" gomb `onclick` kezelője közvetlenül a `details_update(id)`-t hívja, a `validatePassword()` visszatérési értékének vizsgálata nélkül:

```js
details_update(id)   // nem előzi meg pl.: if (!validatePassword()) return;
```

Emiatt a `validatePassword()` (≥10 karakter, kis- és nagybetű, számjegy) által megjelenített visszajelzés pusztán vizuális — egy gyenge jelszó ugyanúgy elmentésre kerül, mint egy erős. Mivel — a korábbi körben `app.js`-ben áttekintett `/register` logikától eltérően — ez a `/users`, `head: "update_detalis"` útvonal jelenleg szerveroldalon sem kényszerít ki jelszóerősségi szabályt, a jelszóerősség ezen az admin-szerkesztési ponton ma facto egyáltalán nem érvényesül. Javaslat: a mentés gombot kössük a `validatePassword()` eredményéhez (csak sikeres validáció esetén engedjük a `details_update` hívást), és/vagy vezessünk be szerveroldali jelszóerősség-ellenőrzést is (defense in depth — a kliensoldali validáció önmagában megkerülhető).

### 3.3. Duplikált `status` kulcs a mentési payloadban

```js
details_update(id) {
    ...
    body: JSON.stringify({ id, password, role, status, status })
```

Ártalmatlan, de figyelmetlenségre utaló hiba: a `status` kulcs kétszer szerepel az objektum-literálban, aminek nincs funkcionális hatása (a JS a második előfordulást veszi figyelembe), de kódolvasási szempontból megtévesztő, és felveti a kérdést, hogy nem egy másik mező (pl. `role_id` vagy egy elírt harmadik property) kimaradt-e a payloadból. Érdemes átnézni, hogy a szerver oldal minden várt mezőt megkap-e.

## 4. Architekturális megjegyzés — a végleges RFQ-tartalom kizárólag kliensoldalon áll össze

A `sendtheemail()` folyamat jelenleg úgy működik, hogy a szerver csak a kosár tartalmát (tételek) adja vissza (`POST /mw`, `head: "order"`), a beérkező e-mail **fejléc-adatait** (cégnév, elérhetőség, szállítási cím, fizetési feltétel stb.) viszont a böngésző állítja össze a form aktuális állapotából, és a tényleges kiküldést is a böngészőben futó EmailJS SDK végzi — a szerver ezt a végső, összeállított tartalmat sosem látja, nem naplózza. Ez két szempontból is érdemes átgondolásra:

- **Manipulálhatóság:** a böngésző fejlesztői eszközeivel a küldés előtt bármely mező (pl. `orderweight`, `weeknum`) módosítható úgy, hogy az a szerver oldalon tárolt kosártételtől eltérjen, mivel a `mailbody` nem a szerverről frissen lekért, hanem a DOM aktuális állapotából épül fel.
- **Auditálhatóság:** mivel a kiküldött RFQ tényleges, végleges tartalma nem kerül a szerverre, utólag nem rekonstruálható megbízhatóan, hogy pontosan mit kapott meg az üzemeltető e-mailben egy adott beküldéskor.

Javaslat hosszabb távra: a végleges RFQ-adatokat (kapcsolattartói és szállítási adatokkal együtt) a kliens küldje el a szervernek egy dedikált végponton, a szerver mentse el (pl. egy `rfq_header` táblába), és — vagy a szerver küldje ki az e-mailt (pl. Nodemailer/SES-en keresztül), vagy legalább a szerver által visszaigazolt, változatlan adatokból építse fel az EmailJS payloadot a kliens.

## 5. Clean Code / modernizációs megfigyelések (összefoglalva)

- **Globális névtér-szennyezés:** mindhárom fájl modul-becsomagolás (IIFE/ES modul) nélkül, `var`-okkal deklarált, fájlszintű globális állapotot használ (pl. `render.js`: `i, a, x, y, o, quotatient, weight` stb.). Modul mintázatra (pl. `<script type="module">` + explicit export/import, vagy legalább egy lezáró IIFE) áttérve elkerülhető lenne a névütközés kockázata és javulna az olvashatóság.
- **Kód-duplikáció:** a `tissue_select_id`, `Plies_select_id`, `Grammatura_select_id`, `Diameter_select_id`, `Reels_select_id` függvények szinte azonos `remove_div(...)` hívás-láncokat ismételnek soronként bővülő/szűkülő listával. Egy `resetFormFrom(step)` segédfüggvény (a lépésekhez tartozó div-azonosítók sorrendezett tömbjével) jelentősen csökkentené a duplikációt és a karbantartási hibalehetőséget (pl. ha egy új lépés bekerül, több helyen is módosítani kell a listát).
- **Mágikus számok:** `Math.floor(280 / h)`, `Math.floor(weight / 274)` — a `280` és `274` konstansok jelentése (feltehetően raklap-/kamionmagasság és tekercssúly-normák) a kódból nem derül ki; elnevezett konstansként (pl. `MAX_PACK_HEIGHT_CM`, `WEIGHT_REFERENCE_DIAMETER`) érdemes lenne kiemelni, kommenttel a mértékegység/eredet magyarázatával.
- **`alert()`/`confirm()` alapú felhasználói interakció:** a `sendtheemail()` végig natív `alert`/`confirm` dialógusokat használ validációra és megerősítésre — ezek blokkolják a JS futását, nem stílusozhatók, és (mint a 2.1 pontban látható) könnyen elrejtik a mögöttes logikai hibát. Modern felhasználói felületen inline hibaüzenetek/egyedi megerősítő modal javasolt.
- **`var` és `let`/`const` kevert használata**, illetve implicit globális deklaráció (`for (i = 1; ...)` — hiányzó `let`/`var` a `cart.js` `requestforquote()` és `tdscheck()` függvényeiben, ami a `for` ciklusváltozót is globálissá teszi.

## 6. Javasolt prioritási sorrend

1. **1.1 — tárolt XSS** a `createElement`/`renderlist` láncban: alacsony javítási költség (egy függvény módosítása), viszonylag magas jövőbeli kockázat (admin-nézet esetén session-átvétel).
2. **2.1 — a kötelező mezők validációjának hatástalansága** (`sendtheemail`): funkcionális hiba, jelenleg hiányos/hibás adatok is kiküldésre kerülhetnek e-mailben.
3. **1.2 — HTML-injektálás a kimenő e-mailbe**: a 2.1 javításával egy időben érdemes kezelni, mivel ugyanazok a mezők érintettek.
4. **3.2 — jelszó-erősség kikényszerítése** (kliens + szerver oldalon egyaránt).
5. A 2.2–2.4 és a Clean Code megfigyelések (5. szakasz) alacsonyabb sürgősségűek, inkább a következő nagyobb refaktorálási körben érdemesek elvégzésre.

Kérlek, jelezd, ha ebből a körből is a "kezdd el a javításokat" utasítással szeretnéd folytatni — ha igen, javaslom az 1.1 → 2.1 → 1.2 → 3.2 sorrendet, a fenti indoklás szerint.
