# RFQ alkalmazás

Ajánlatkérési (Request for Quotation, RFQ) folyamatokat automatizáló webalkalmazás, amely egy magyarországi papírgyár beszerzési igényei alapján készült. Az alkalmazás a vevők által a szállító felé intézett ajánlatkérések egységesítését, gyorsítását és részleges automatizálását célozza, kiváltva a korábban Excel-táblákban és jegyzetekben vezetett, hibára hajlamos, csoportmunkára alkalmatlan folyamatot.

Az alkalmazás egy szakdolgozat ("Ajánlatkérési folyamatok automatizálása RFQ alkalmazással: Tervezés, Fejlesztés és Integráció", Kodolányi János Egyetem, Bodnár István) keretében készült, és felhőalapú infrastruktúrában (AWS Elastic Beanstalk) került POC (Proof of Concept) jelleggel üzembe helyezésre.

## Fő funkciók

- **Regisztráció és bejelentkezés**: Az alkalmazást csak regisztrált, partnercégekhez tartozó felhasználók érhetik el, különböző szerepkörökkel.
- **Ajánlatkérési folyamat**: Egymásra épülő, az előző lépés(ek) által meghatározott értékkészletű választási lépések vezetik végig a vevőt az ajánlatkérés összeállításán és beküldésén. Egyszerre több, egymástól független ajánlat is összeállítható, a munkamenet elmenthető és később folytatható.
- **TDS ellenőrzés**: A gyártó által tesztelt és preferált termékkombinációk esetén letölthető a TDS (Technical Data Sheet, műszaki adatlap); a megrendelő elfogadhatja azt, vagy módosítást kérhet.
- **Adminisztrációs felület**: Termékek és paraméterek létrehozása, módosítása, törlése, valamint felhasználókezelés.
- **Riportálás**: A megrendelésekhez és termékekhez kapcsolódó riportok előállítása.

## Technológiai háttér

| Funkció | Alkalmazott megoldás |
| --- | --- |
| Backend keretrendszer | Node.js, Express |
| Backend nyelv | JavaScript, SQL |
| Frontend keretrendszer | Node.js (EJS sablonok) |
| Frontend nyelv | JavaScript, HTML, CSS |
| Adatbázis | PostgreSQL (AWS RDS for PostgreSQL) |
| Felhasználói hitelesítés | Passport.js (passport-local) |
| Alkalmazás üzembe helyezése | AWS Elastic Beanstalk |
| Webszerver | nginx |
| Loggolás és monitoring | AWS CloudWatch |
| Verziókezelés | Git |

A fejlesztés során felhasznált Node.js modulok listája a [`package.json`](./package.json) fájlban található.

## Repository felépítése

```
.
├── app.js                          # Az alkalmazás törzse: API végpontok, PostgreSQL lekérdezések
├── .ebextensions/
│   └── rds.config                  # Az RDS adatbázis végpontjának automatikus beolvasása telepítéskor
├── .platform/
│   ├── copy_files.config
│   ├── files/eu-central-1-bundle.pem   # AWS RDS SSL CA-tanúsítványlánc (nyilvános)
│   ├── hooks/prebuild/01_copy_files.sh # Tanúsítványok másolása a futtató környezetbe
│   └── nginx/nginx.conf            # nginx konfiguráció (443-as porton futó HTTPS)
├── cert/
│   └── eu-central-1-bundle.pem     # AWS RDS SSL CA-tanúsítványlánc (nyilvános)
├── public/
│   ├── assets/scripts/             # Kliensoldali JavaScript (admin.js, cart.js, common.js, render.js)
│   └── css/style.css               # Stíluslap
├── views/                          # EJS sablonok és statikus HTML oldalak
│   └── partials/footer.ejs
├── package.json
└── package-lock.json
```

### Fontosabb API végpontok

| Végpont | Leírás |
| --- | --- |
| `/users` | Felhasználók és felhasználói adatok kezelése (lista, szűrés, adatfrissítés) |
| `/mw` | Middleware: ajánlatkérés ideiglenes mentése, listázása, törlése, beküldése, TDS ellenőrzés |
| `/mw/:data` | Adminisztrációs adatok előállítása, szűrése, törlése |
| `/protected` | Bejelentkezés után elérhető védett oldal |
| `/admin` | Adminisztrációs felület (termékek, paraméterek, felhasználók kezelése) |
| `/report`, `/api/report:data` | Riportálási felület és a hozzá tartozó adatok |
| `/profile` | Felhasználói profil megtekintése, módosítása |
| `/register`, `/login`, `/logout` | Regisztráció, bejelentkezés, kijelentkezés |

## Fejlesztői környezet beállítása

Előfeltételek:

- [Node.js](https://nodejs.org) (a fejlesztés a v20.x verzióval történt)
- [PostgreSQL](https://www.postgresql.org/download/) adatbázis-szerver
- Git

Telepítés:

```bash
git clone <ez a repository>
cd rfq
npm install
```

Az alkalmazás futtatásához szükséges környezeti változókat egy `.env` fájlban kell megadni a projekt gyökerében (a fájl biztonsági okokból **nincs** verziókezelve). Az alkalmazás a `dotenv` modulon keresztül olvassa be az alábbi jellegű beállításokat:

```
DB_HOST=<postgresql host>
DB_PORT=5432
DB_DATABASE=<adatbázis neve>
DB_USER=<felhasználónév>
DB_PASSWORD=<jelszó>
SESSION_SECRET=<session titkosításhoz használt kulcs>
APP_PORT=3000
```

> Megjegyzés: a fenti lista korábban tévesen `DB_NAME` néven szerepeltette az
> adatbázisnevet - az `app.js` ténylegesen a `DB_DATABASE` változót olvassa
> (`process.env.DB_DATABASE`), ez lett javítva. Az `APP_PORT` opcionális,
> alapértelmezetten 3000.

Az alkalmazás indítása fejlesztői módban:

```bash
npm start
```

## Üzembe helyezés (AWS Elastic Beanstalk)

Az alkalmazás POC környezetben AWS Elastic Beanstalk platform-szolgáltatáson (PaaS) fut, az alábbi fő komponensekkel:

- **VPC / Subnet**: alapértelmezett AWS VPC és alhálózatok.
- **Elastic Beanstalk + EC2**: az alkalmazás automatizált telepítése és skálázása; előfeltétel egy `AWSServiceRoleForRDS` IAM szerepkör (policy: `AmazonRDSServiceRolePolicy`) létrehozása.
- **Amazon RDS for PostgreSQL**: kezelt adatbázis-szolgáltatás; az `.ebextensions/rds.config` szkript telepítés után automatikusan kiolvassa és beállítja az RDS végpont címét.
- **nginx**: a `.platform/nginx/nginx.conf` felülírja az alapértelmezett konfigurációt, hogy a HTTPS forgalom a szabványos 443-as porton keresztül érje el a Node.js alkalmazást, a 80-as portról pedig automatikus átirányítás történik HTTPS-re.
- **AWS CloudWatch**: az infrastruktúra, a futtató környezet és az alkalmazás logjainak és metrikáinak központi gyűjtése és monitorozása.

A telepítés utáni lépésként a felhasznált EC2 instance biztonsági csoportjában (Security Group) a 443-as (és szükség esetén a 80-as, 22-es) porton engedélyezni kell a hozzáférést a kívánt IP-cím(ek) számára.

## IT biztonság

- A kliens és a szerver közötti kommunikáció HTTPS-en keresztül titkosított.
- Az adatbázis-szerver kizárólag privát hálózatból érhető el, a kapcsolat a Beanstalk és az RDS között az 5432-es porton, titkosítva (a `eu-central-1-bundle.pem` AWS CA-tanúsítványlánc felhasználásával) történik.
- Az adatbázis-hozzáférési adatok (host, felhasználónév, jelszó, tanúsítvány) a Beanstalk konfigurációjában, a felhasználók elől elrejtve tárolódnak.
- Az alkalmazás az SQL lekérdezéseket paraméterezve állítja össze az SQL injection kockázatának csökkentése érdekében.
- Az AWS Console eléréséhez egyedi felhasználók és MFA (kétlépcsős hitelesítés) szükséges.
- **A `.env` fájl és a privát kulcsot tartalmazó `.pem` fájlok (`cert.pem`, `csr.pem`, `key.pem`) szándékosan nincsenek felöltve ebbe a repository-ba** – ezeket a `.gitignore` kizárja. Az `eu-central-1-bundle.pem` az AWS RDS nyilvános CA-tanúsítványlánca, ez nem érzékeny adat.

Bővebben a biztonsági megoldásokról a szakdolgozat 5. fejezete (IT biztonság) számol be.

## Támogatott böngészők

Safari, Google Chrome, Microsoft Edge, Firefox.

## Licenc

ISC (lásd [`package.json`](./package.json)).

## Szerző

Bodnár István – Kodolányi János Egyetem, Üzemmérnök-informatikus alapképzési szak. Konzulens: dr. Pitlik László.
