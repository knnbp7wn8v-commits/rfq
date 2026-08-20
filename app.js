require('dotenv').config();

const sessionstore = require('sessionstore');
const express = require('express');
const https = require('https');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { Pool } = require('pg');
const flash = require('connect-flash');
const fs = require('fs');
const bodyParser = require('body-parser');
const faker = require('faker');

const app = express();
const port = process.env.APP_PORT || 3000;

// Szerepkör-azonosítók (customers.role_id) - lásd adatbázis 'roles' tábla
const ROLES = {
  ADMIN: 3,
};

// PostgreSQL connection setup
/* const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: true,               // Állítsd `true`-ra, ha érvényes tanúsítványt használsz
    ca: fs.readFileSync('cert/eu-central-1-bundle.pem'), // Tanúsítvány fájl elérési útja
  },
});*/
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
})
// Kapcsolat ellenőrzése
pool.connect()
    .then(() => {
      console.log('Database connected successfully');
    })
    .catch(err => {
      console.error('Database connection error:', err.stack);
    });



app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(flash());
app.use(express.static('public')); // Serve static files from 'public' directory if you have any
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
https.createServer(options, app).listen(port, () => {
  console.log('HTTPS server running on port ' + port);
});
app.use(session({
  store: sessionstore.createSessionStore(),
  secret: process.env.SESSION_SECRET,
  name: "rfq_cookie",
  cookie: {
    maxAge: 3600000,
    rolling: true,
    secure: true, // csak HTTPS kapcsolaton keresztül küldi el a böngésző
    httpOnly: true, // A cookie nem elérhető JavaScript-en keresztül (XSS elleni védelem)
    sameSite: 'strict' // Megakadályozza a cross-site cookie küldést
  },
  resave: true,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  // Csak akkor resetel, ha a kérés nem a session lekérő endpoint és a session aktív, és a felhasználó be van jelentkezve
  // console.log(req.originalUrl);
  if (req.session.cookie && req.isAuthenticated()) {
    // console.log(`Session cookie maxAge: ${req.session.cookie.maxAge}`);
    req.session.cookie.maxAge = 3600000; // 1 óra
    req.session.touch();
  }
  next();
});

passport.use('local', new LocalStrategy(
  { usernameField: "email" }, async (email, password, done) => {
    try {
      const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect password.' });
        }
        // Az önregisztrált felhasználók fiókját admin oldalról kell
        // aktiválni (customers.status) - jóváhagyás előtt nem léphetnek be.
        if (!user.status) {
          return done(null, false, { message: 'A fiók még nincs aktiválva. Kérjük, várja meg az adminisztrátor jóváhagyását.' });
        }
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect username.' });
      }
    } catch (err) {
      return done(err);
    }
  }));

// Passport local strategy for login with username and password


// Serialize and deserialize user instances to and from the session.
passport.serializeUser((user, done) => {
  done(null, user.customer_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [id]);
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(new Error('User not found.'));
    }
  } catch (err) {
    done(err);
  }
});


// Serve the registration form
app.get('/register', (req, res) => {
  // Assuming you have a register.html file in a 'views' directory
  res.sendFile(__dirname + '/views/register.html');
});

// Serve the login form
app.get('/login', (req, res) => {
  // Assuming you have a login.html file in a 'views' directory
  res.sendFile(__dirname + '/views/login.html');
});
function getdata(data) {
  return new Promise((resolve, reject) => {
    let qry = "";
    switch (data) {
      case "portfolio":
        qry = "SELECT * FROM portfolio";
        break;
      case "plie_param":
        qry = "SELECT * FROM plie_param";
        break;
      case "ediam_param":
        qry = "SELECT * FROM ediam_param";
        break;
      default:
        return reject(new Error(`Invalid target: ${data}`));
    }
    pool.query(
      qry,
      (err, result) => {
        return err ? reject(err) : resolve(result.rows);
      }
    );
  });
}


// Frissítés funkció
async function updateUser(data) {
  let query = "";
  let values = [];

  if (data.password === "") {
    // Paraméterezett lekérdezés, SQL injection védelemmel
    query = `UPDATE customers SET role_id = $1, status = $2 WHERE customer_id = $3`;
    values = [data.role, data.status, data.id];
  } else {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    query = `UPDATE customers SET role_id = $1, status = $2, password = $3 WHERE customer_id = $4`;
    values = [data.role, data.status, hashedPassword, data.id];
  }

  try {
    await pool.query(query, values); // Biztonságos lekérdezés
    return { message: 'User successfully updated' };
  } catch (err) {
    console.error('Error updating user:', err);
    throw new Error('Database error during user update');
  }
}
async function updateProfile(data) {
  const q = "SELECT * FROM addresses WHERE u_id = $1";
  const v = [data.id];
  try {
    const r = await pool.query(q,v);
    if (r.rows.length > 0) {
      let query = "";
      let values = [];
      query = `UPDATE addresses SET country = $1, city = $2, postal_code = $3, address = $4 WHERE u_id = $5`;
      values = [data.country, data.city, data.postal, data.address, data.id];
      return {query, values, status: 'updated'};
    } else {
      let query = "";
      let values = [];
      query = `INSERT INTO addresses (u_id, country, city, postal_code, address) VALUES ($1, $2, $3, $4, $5);`;
      values = [data.id, data.country, data.city, data.postal, data.address];
      return {query, values, status: 'inserted' };
    }
  } catch (err) {
    console.error('Error updating profile:', err);
    return { error: 'database_error' };
  }

}

// Felhasználók listázása funkció
async function listUsers() {
  const query = `
    SELECT customers.customer_id, customers.customer_name, customers.vat_number, customers.contact_name, customers.email, 
           customers.phone, customers.role_id, customers.date_joined, customers.status, roles.rolename 
    FROM customers 
    JOIN roles ON customers.role_id = roles.role_id
  `;

  try {
    const result = await pool.query(query); // Paraméterezett lekérdezés, ha szükséges
    return result.rows;
  } catch (err) {
    console.error('Error fetching users:', err);
    throw new Error('Database error during users list retrieval');
  }
}


// Felhasználók szűrése funkció
async function filterUsers(data) {
  const conditions = [];
  const values = [];

  if (data.s4) {
    conditions.push("customer_name LIKE $" + (conditions.length + 1));
    values.push(data.s4 + '%');
  }
  if (data.s5) {
    conditions.push("vat_number LIKE $" + (conditions.length + 1));
    values.push(data.s5 + '%');
  }
  if (data.s6) {
    conditions.push("contact_name LIKE $" + (conditions.length + 1));
    values.push(data.s6 + '%');
  }
  if (data.s7) {
    conditions.push("email LIKE $" + (conditions.length + 1));
    values.push(data.s7 + '%');
  }
  if (data.s8) {
    conditions.push("phone LIKE $" + (conditions.length + 1));
    values.push(data.s8 + '%');
  }
  if (data.s10) {
    conditions.push("role_id = $" + (conditions.length + 1));
    values.push(data.s10);
  }
  if (data.s11) {
    conditions.push("status = $" + (conditions.length + 1));
    values.push(data.s11);
  }

  let query = `SELECT customers.customer_id, customers.customer_name, customers.vat_number, customers.contact_name, customers.email, 
  customers.phone, customers.role_id, customers.date_joined, customers.status, roles.rolename 
  FROM customers JOIN roles ON customers.role_id = roles.role_id WHERE 1=1`;

  if (conditions.length > 0) {
    query += " AND " + conditions.join(" AND ");
  }
  return { query, values };
}
app.post('/users', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send({ message: 'Not authenticated' });
  }
  const { head, data } = req.body;
  const isAdminManagement = ['update_detalis', 'list', 'usersfilter'].includes(head);
  if (isAdminManagement && req.user.role_id !== ROLES.ADMIN) {
    // A felhasználók listázása/módosítása admin jogosultsághoz kötött funkció.
    return res.status(403).send({ message: 'Forbidden' });
  }
  try {
    if (head === "update_detalis") {
      // updateUser már lefuttatja a lekérdezést, itt nincs mit újra futtatni.
      await updateUser(data);
      res.status(200).send({ message: 'User successfully updated' });
    } else if (head === "list") {
      // listUsers már lefuttatja a lekérdezést és a sorokat adja vissza.
      const rows = await listUsers();
      res.status(200).send({ data: rows });
    } else if (head === "usersfilter") {
      const { query, values } = await filterUsers(data);
      const result = await pool.query(query, values);
      res.status(200).send({ data: result.rows });
    } else if (head === "profile_update") {
      // A profilját csak a saját bejelentkezett felhasználó módosíthatja -
      // a kliens által küldött id-t figyelmen kívül hagyjuk (IDOR elleni védelem).
      const profileData = { ...data, id: req.user.customer_id };
      const { query, values, status, error } = await updateProfile(profileData);
      if (error) {
        return res.status(500).send({ message: 'Database error', status: 'error' });
      }
      const result = await pool.query(query, values);
      if (status === 'updated') {
        res.status(200).send({ data: result.rows, message: 'Profile updated successfully', status: 'success' });
      } else if (status === 'inserted') {
        res.status(201).send({ data: result.rows, message: 'Profile created successfully', status: 'success' });
      }
    } else {
      res.status(400).send({ message: 'Unknown request type' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send({ message: 'Error processing request', status: 'error' });
  }
});

async function addToCart(userid, data) {
  const query = `INSERT INTO cart (customer_id, tissue, plies, grammatura, diameter, reels, quotatient, orderweight, ediameter, certification, weeknum, tds, _comment) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
  const values = [userid, data.tissue, data.plies, data.grammatura, data.diameter, data.reels, data.quotatient, data.orderweight, data.ediameter, data.certification, data.weeknum, data.tds, data.comment];
  await pool.query(query, values);

  const rowResult = await pool.query('SELECT COUNT(cartid) FROM cart WHERE customer_id = $1', [userid]);
  return rowResult.rows[0].count;
}

async function getCart(userid) {
  const query = `SELECT * FROM cart WHERE customer_id = $1`;
  const result = await pool.query(query, [userid]);
  return result.rows;
}

async function removeFromCart(cartid, userid) {
  // Továbbra is prepared statement-et használunk, így biztonságos
  await pool.query(`DELETE FROM cart WHERE cartid = $1 AND customer_id = $2`, [cartid, userid]); // hozzáadtam customer_id ellenőrzést is

  const rowResult = await pool.query('SELECT COUNT(cartid) FROM cart WHERE customer_id = $1', [userid]);
  return rowResult.rows[0].count;
}

async function checkTDS(data) {
  const query = `SELECT SKU FROM tds WHERE itemtype = $1 AND plies = $2 AND height = $3 AND grammatura = $4 AND diameter = $5 AND ediameter = $6`;
  const values = [data.itemtype, data.plies, data.height, data.grammatura, data.diameter, data.ediameter];
  const result = await pool.query(query, values);
  return result.rows;
}

async function createOrder(userid) {
  // A beszúrás és a kosár ürítése egy tranzakcióban történik, hogy a
  // megrendelés kétszer beküldve ne duplikálja a korábban már átvitt
  // tételeket (a kosár korábban sosem ürült ki rendelés után).
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO rfq (customer_id, tissue, plies, grammatura, diameter, reels, quotatient, pack1, pack2, orderweight, w1, w2, ediameter, certification, weeknum, tds, _comment)
       SELECT customer_id, tissue, plies, grammatura, diameter, reels, quotatient, pack1, pack2, orderweight, w1, w2, ediameter, certification, weeknum, tds, _comment
       FROM cart WHERE customer_id = $1
       RETURNING *`,
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

async function removeAllFromCart(userid) {
  await pool.query(`DELETE FROM cart WHERE customer_id = $1`, [userid]);
}

async function getCustomerDetails(customerId) {
  const query = `SELECT * FROM customers WHERE customer_id = $1`;
  const result = await pool.query(query, [customerId]);
  return result.rows;
}

async function buildFilterQuery(data) {
  const conditions = [];
  const values = [];

  if (data.s1) {
    values.push(data.s1 + '%');
    conditions.push(`tissue LIKE $${values.length}`);
  }
  if (data.s2) {
    values.push(data.s2);
    conditions.push(`reel = $${values.length}`);
  }
  if (data.s3) {
    values.push(data.s3);
    conditions.push(`grammatura = $${values.length}`);
  }

  let query = "SELECT * FROM portfolio";
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  return { query, values };
}
app.post('/mw', async (req, res) => {
  if (req.isAuthenticated()) {
    req.session.touch();
    const { head, data } = req.body;
    const userid = req.user.customer_id;

    try {
      if (head === "cart") {
        const counter = await addToCart(userid, data);
        res.status(200).send({ message: 'Data successfully saved', counter });
      } else if (head === "cartlist") {
        const cartItems = await getCart(userid);
        res.status(200).send({ message: 'Cart items retrieved', data: cartItems });
      } else if (head === "removecart") {
        const counter = await removeFromCart(data, userid);
        res.status(200).send({ message: 'Item successfully deleted', counter });
      } else if (head === "tdscheck") {
        const tdsResult = await checkTDS(data);
        res.status(200).send({ message: 'TDS check successful', data: tdsResult });
      } else if (head === "order") {
        const orderItems = await createOrder(userid);
        res.status(200).send({ message: 'Order successfully created', data: orderItems });
      } else if (head === "removeall") {
        await removeAllFromCart(userid);
        res.status(200).send({ message: 'All items successfully deleted' });
      } else if (head === "details") {
        const customerDetails = await getCustomerDetails(data.id);
        res.status(200).send({ message: 'Customer details retrieved', data: customerDetails });
      } else if (head === "filter") {
        const { query, values } = await buildFilterQuery(data);
        const result = await pool.query(query, values);
        res.status(200).send({ message: 'Filter applied', data: result.rows });
      } else {
        res.status(400).send({ message: 'Unknown request type' });
      }
    } catch (err) {
      console.error('Error processing request:', err);
      res.status(500).send({ error: 'Internal Server Error' });
    }
  } else {
    res.status(401).send({ message: 'Not authenticated' });
  }
});


function getSessionTime(request) {
  return request.session.cookie.expires - Date.now();
}
async function getDataResponse(target) {
  return await getdata(target);
}
// Fehérlistázott célok az admin CRUD (/mw/:data "add"/"delete") számára.
// A tábla nevét SQL azonosítóként (INTO/FROM után) NEM lehet paraméterként
// átadni, ezért az csak akkor kerülhet a lekérdezés szövegébe, ha pontosan
// egyezik ennek a fehérlistának egyik kulcsával - a kliens által küldött
// egyéb adat (oszlopértékek) mindig paraméterezve fut.
const ADMIN_CRUD_TARGETS = {
  portfolio: {
    columns: [
      { name: 'tissue', type: 'string' },
      { name: 'reel', type: 'number' },
      { name: 'grammatura', type: 'number' },
    ],
  },
  plie_param: {
    columns: [
      { name: 'plie', type: 'string' },
      { name: 'diameter', type: 'number' },
    ],
  },
  ediam_param: {
    columns: [
      { name: 'eheight', type: 'number' },
      { name: 'truck', type: 'string' },
      { name: 'tissue', type: 'string' },
      { name: 'weight', type: 'number' },
    ],
  },
};

async function adminInsertRows(target, rows) {
  const targetDef = ADMIN_CRUD_TARGETS[target];
  if (!targetDef) {
    throw new Error(`Invalid target: ${target}`);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No rows to insert');
  }

  const values = [];
  const rowPlaceholders = rows.map((row) => {
    const placeholders = targetDef.columns.map(({ name, type }) => {
      let value = row[name];
      if (type === 'number') {
        value = Number(value);
        if (!Number.isFinite(value)) {
          throw new Error(`Invalid numeric value for column "${name}"`);
        }
      } else {
        value = String(value);
      }
      values.push(value);
      return `$${values.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });

  const columnNames = targetDef.columns.map((c) => c.name).join(', ');
  const query = `INSERT INTO ${target} (${columnNames}) VALUES ${rowPlaceholders.join(', ')}`;
  await pool.query(query, values);
}

async function adminDeleteRows(target, ids) {
  if (!ADMIN_CRUD_TARGETS[target]) {
    throw new Error(`Invalid target: ${target}`);
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('No ids to delete');
  }
  const numericIds = ids.map((id) => {
    const n = parseInt(id, 10);
    if (!Number.isInteger(n)) {
      throw new Error(`Invalid id: ${id}`);
    }
    return n;
  });
  await pool.query(`DELETE FROM ${target} WHERE id = ANY($1)`, [numericIds]);
}
async function getOptions(optionName, whereCondition) {
  let query = "";
  let values = [];
  switch (optionName) {
    case "Tissue":
      query = "SELECT DISTINCT tissue FROM portfolio";
      break;
    case "Plies":
      query = "SELECT * FROM plies";
      break;
    case "Grammatura":
      query = "SELECT DISTINCT grammatura FROM portfolio WHERE tissue = $1";
      values = [whereCondition];
      break;
    case "Diameter":
      query = "SELECT DISTINCT diameter FROM plie_param WHERE plie = $1";
      values = [whereCondition];
      break;
    case "Reels":
      query = "SELECT DISTINCT reel FROM portfolio WHERE tissue = $1 ORDER BY reel ASC";
      values = [whereCondition];
      break;
    case "Ediameter":
      query = "SELECT DISTINCT eheight, truck, weight FROM ediam_param WHERE tissue = $1";
      values = [whereCondition];
      break;
    default:
      throw new Error("Invalid option name");
  }
  const result = await pool.query(query, values);
  return result.rows;
}
async function getCustomerMoreDetails(customerId) {
  // Két külön, paraméterezett lekérdezés: a pg egyetlen query() hívása
  // nem ad vissza tömböt több utasítás esetén, ezért nem fűzhetők össze.
  const customerResult = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [customerId]);
  const cartResult = await pool.query('SELECT COUNT(cartid) FROM cart WHERE customer_id = $1', [customerId]);
  return { customerData: customerResult.rows, cartCount: cartResult.rows };
}
app.get('/mw/:data', async (request, response) => {
  if (request.isAuthenticated()) {
    const time = getSessionTime(request);

    try {
      const parsedData = JSON.parse(request.params.data);
      const { target, head } = parsedData;

      if (head === "data") {
        const data = await getDataResponse(target);
        const responseData = { message: "Data successfully retrieved", data: data };
        return response.json(responseData);
      } else if (head === "add" || head === "delete") {
        // Adminisztrációs törzsadat-kezelés (portfolio/plie_param/ediam_param).
        // Korábban a kliens a teljes SQL-utasítást küldte, amit a szerver
        // validáció nélkül futtatott le - ez tetszőleges SQL végrehajtását
        // tette volna lehetővé bármely bejelentkezett felhasználó számára.
        // Mostantól csak admin jogosultsággal, és csak a fehérlistázott
        // (ADMIN_CRUD_TARGETS) táblákra, paraméterezett lekérdezéssel fut.
        if (!request.user || request.user.role_id !== ROLES.ADMIN) {
          return response.status(403).send({ message: 'Forbidden' });
        }
        if (head === "add") {
          await adminInsertRows(target, parsedData.data);
        } else {
          await adminDeleteRows(target, parsedData.data);
        }
        const message = head === "add" ? "Data successfully inserted" : "Data successfully deleted";
        const data = await getDataResponse(target);
        const responseData = { time, message, data };
        return response.json(responseData);
      } else if (head === "option") {
        const optionName = parsedData.data;
        const whereCondition = parsedData.where || null;
        const data = await getOptions(optionName, whereCondition);
        const responseData = { time, data };
        return response.json(responseData);
      } else if (head === "customer") {
        const customerDetails = await getCustomerMoreDetails(request.user.customer_id);
        const responseData = { data: customerDetails.customerData, data2: customerDetails.cartCount };
        return response.json(responseData);
      } else if (head === "cart") {
        // Cart-related logic here
      } else {
        response.status(400).send({ message: 'Unknown request type' });
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Invalid JSON in /mw/:data:', error);
        return response.status(400).send({ message: 'Invalid request payload' });
      }
      console.error('Error processing request:', error);
      response.status(500).send('Internal Server Error');
    }
  } else {
    response.status(401).send({ message: 'Not authenticated' });
  }
});



// Protected route
app.get('/protected', (req, res) => {
  if (req.isAuthenticated()) {
    // Megjegyzés: itt korábban egy soha le nem állított setInterval futott
    // (minden egyes /protected kérés egy újabb, örökké élő időzítőt indított
    // - memóriaszivárgás), amely emellett egy nem definiált 'res' változóra
    // hivatkozott volna hiba esetén. A session hátralévő idejét a kliens a
    // már meglévő /session-status végponton kérdezheti le, szerveroldali
    // időzítő nélkül - ezért az itteni setInterval-t eltávolítottuk.
    pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.user.customer_id], (err, result) => {
      if (err) {
        console.error('SQL ERROR:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.render('index.ejs', { data: result.rows[0] });
      }
    })
  } else {
    // Redirect unauthenticated requests to login page
    res.redirect('/login');
  }
});
app.get('/aszf', (req, res) => {
  if (req.isAuthenticated()) {
    // For simplicity, sending text response, but you could also render an HTML page
    pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.user.customer_id], (err, result) => {
      if (err) {
        console.error('SQL ERROR:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.render('aszf.ejs', { data: result.rows[0] });
      }
    })
  } else {
    // Redirect unauthenticated requests to login page
    res.redirect('/login');
  }
});
app.get('/elerhetoseg', (req, res) => {
  if (req.isAuthenticated()) {
    // For simplicity, sending text response, but you could also render an HTML page
    pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.user.customer_id], (err, result) => {
      if (err) {
        console.error('SQL ERROR:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.render('elerhetoseg.ejs', { data: result.rows[0] });
      }
    })
  } else {
    // Redirect unauthenticated requests to login page
    res.redirect('/login');
  }
});

app.get('/cookie-policy', (req, res) => {
  if (req.isAuthenticated()) {
    // For simplicity, sending text response, but you could also render an HTML page
    pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.user.customer_id], (err, result) => {
      if (err) {
        console.error('SQL ERROR:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.render('cookie-policy.ejs', { data: result.rows[0] });
      }
    })
  } else {
    // Redirect unauthenticated requests to login page
    res.redirect('/login');
  }
});
app.get('/admin', (req, res) => {
  if (req.isAuthenticated() && req.user.role_id === ROLES.ADMIN) {
    const time = req.session.cookie.expires - new Date(Date.now());
    // Az admin.ejs nézet a data[0]..data[13] tömbindexeket olvassa ki,
    // ezért a sorrend megegyezik az eredeti, pontosvesszővel elválasztott
    // lekérdezéssorozattal - csak a customer_id már paraméterezve fut.
    Promise.all([
      pool.query('SELECT * FROM tissue'),
      pool.query('SELECT * FROM grammatura'),
      pool.query('SELECT * FROM reels'),
      pool.query('SELECT * FROM portfolio'),
      pool.query('SELECT * FROM plies'),
      pool.query('SELECT * FROM diameter'),
      pool.query('SELECT * FROM plie_param'),
      pool.query('SELECT * FROM eheight'),
      pool.query('SELECT * FROM truck'),
      pool.query('SELECT * FROM weight ORDER BY weight ASC'),
      pool.query('SELECT * FROM ediam_param'),
      pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.user.customer_id]),
      pool.query(`SELECT customers.customer_id, customers.customer_name, customers.vat_number, customers.contact_name, customers.email,
                  customers.phone, customers.role_id, customers.date_joined, customers.status, roles.rolename
                  FROM customers JOIN roles ON customers.role_id = roles.role_id`),
      pool.query('SELECT * FROM rfq'),
    ])
      .then((data) => {
        res.render('admin.ejs', { data, time });
      })
      .catch((err) => {
        console.error('SQL ERROR:', err);
        res.redirect('/login');
      });
  } else {
    // Redirect unauthenticated requests to login page
    res.redirect('/login');
  }
});

app.get('/report', (req, res) => {
  if (req.isAuthenticated() && req.user.role_id === ROLES.ADMIN) {
    pool.query('SELECT customer_id, customer_name FROM customers', (err, result) => {
      if (err) {
        console.error('SQL ERROR:', err);
        res.redirect('/login');
      } else {
        res.render('report.ejs', { data: result });
      }
    });
  } else {
    // Redirect unauthenticated requests to login page
    res.redirect('/login');
  }
});

app.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    // A profile.ejs nézet a data[0]..data[2] tömbindexeket olvassa ki
    // (customers, addresses, rfq), ezért a sorrendet megtartjuk.
    Promise.all([
      pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.user.customer_id]),
      pool.query('SELECT * FROM addresses WHERE u_id = $1', [req.user.customer_id]),
      pool.query('SELECT * FROM rfq WHERE customer_id = $1', [req.user.customer_id]),
    ])
      .then((data) => {
        res.render('profile.ejs', { data });
      })
      .catch((err) => {
        console.error('SQL ERROR:', err);
        res.status(500).send('Internal Server Error');
      });
  } else {
    res.redirect('/login');
  }
});

// Registration endpoint
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

app.post('/register', async (req, res) => {
  const { customer, vat, name, email, phone, password } = req.body;

  if (!customer || !vat || !name || !email || !phone || !password) {
    return res.status(400).send('Minden mező kitöltése kötelező');
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).send('Érvénytelen e-mail cím');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).send(`A jelszónak legalább ${MIN_PASSWORD_LENGTH} karakter hosszúnak kell lennie`);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO customers(customer_name, vat_number, contact_name, email, phone, password) VALUES($1, $2, $3, $4, $5, $6) RETURNING customer_id', [customer, vat, name, email, phone, hashedPassword]);
    res.redirect('/login');
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation error code
      res.status(400).send('Email already exists');
    } else {
      console.error('Error during registration:', error);
      res.status(500).send('An error occurred');
    }
  }
});

// Login route
app.post('/login', passport.authenticate('local', {
  successRedirect: '/protected',
  failureRedirect: '/login',
  failureFlash: true,
}));


app.post("/logout", (req, res, next) => {
  // A korábbi verzió egy sehol máshol nem használt 'token' változót
  // nullázott, ami nem jelentkeztette ki ténylegesen a felhasználót -
  // a session cookie érvényben maradt volna kijelentkezés után is.
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy(() => {
      res.clearCookie('rfq_cookie');
      res.redirect('/login');
    });
  });
});
app.get('/session-status', (req, res) => {
  if (req.session) {
    const remainingTime = req.session.cookie.maxAge / 1000; // másodpercekben
    res.json({ timeLeft: remainingTime });
  } else {
    res.json({ timeLeft: 0 });
  }
});

async function insertCustomers(num) {
  const insertQuery = `
        INSERT INTO customers (customer_name, vat_number, contact_name, email, phone, password, role_id, date_joined, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

  for (let i = 0; i < num; i++) {
    const customerName = faker.company.companyName(); // Véletlenszerű cég név
    const vatNumber = faker.datatype.number({ min: 1000000000, max: 9999999999 }).toString(); // Véletlenszerű 10 jegyű VAT szám
    const contactName = faker.name.findName(); // Véletlenszerű név
    const email = faker.internet.email(contactName.split(' ')[0]); // Véletlenszerű email cím a névből
    const phone = faker.phone.phoneNumber(); // Véletlenszerű telefonszám
    const password = await bcrypt.hash('password123', 10); // Véletlenszerű jelszó (hashed)
    const roleId = 1; // Állandó érték
    const dateJoined = `${2024}-${String(faker.date.past().getMonth() + 1).padStart(2, '0')}-${String(faker.date.past().getDate()).padStart(2, '0')}`; // Véletlenszerű dátum 2024-ben
    const status = false; // Állandó érték

    const values = [customerName, vatNumber, contactName, email, phone, password, roleId, dateJoined, status];

    try {
      await pool.query(insertQuery, values);
    } catch (error) {
      console.error('Error inserting customer:', error);
    }
  }
}
// Lehetséges customer_id értékek
const customerIds = [2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

// Tissue, plies és grammatura beállítások
const tissues = ['toilet', 'kitchen towel', 'hanky', 'facial', 'napkin'];
const pliesOptions = {
  1: [305, 403],
  2: [76, 152, 305],
  3: [76, 152, 305],
  4: [76, 152, 305],
  5: [76, 152, 305],
};

// Grammatura és reels értékek tissue alapján
const tissueProperties = {
  toilet: {
    grammatura: [14.5, 15, 15.5, 16.5, 17, 19.5],
    reels: [280, 275, 274, 272, 270, 268, 265]
  },
  'kitchen towel': {
    grammatura: [17, 17.5, 18, 19.5, 21, 25],
    reels: [280, 275, 274, 272, 270, 268, 265]
  },
  hanky: {
    grammatura: [14.5, 15, 15.5, 16.5, 17, 19.5],
    reels: [259, 137, 135, 80, 58, 42, 39, 36, 34, 32, 29, 20, 18, 17]
  },
  facial: {
    grammatura: [14.5, 15, 15.5, 16.5, 17, 19.5],
    reels: [259, 137, 135, 80, 58, 42, 39, 36, 34, 32, 29, 20, 18, 17]
  },
  napkin: {
    grammatura: [14.5, 15, 15.5, 16.5, 17, 19.5],
    reels: [259, 137, 135, 80, 58, 42, 39, 36, 34, 32, 29, 20, 18, 17]
  }
};
// SQL beszúrási lekérdezés
async function insertRFQ(data) {
  const insertQuery = `
        INSERT INTO rfq (customer_id, tissue, plies, grammatura, diameter, reels, quotatient, pack1, pack2, orderweight, w1, w2, ediameter, certification, weeknum, tds, _comment, requestdate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `;

  const values = [
    data.customer_id, data.tissue, data.plies, data.grammatura, data.diameter, data.reels,
    data.quotatient, data.pack1, data.pack2, data.orderweight, data.w1, data.w2,
    data.ediameter, data.certification, data.weeknum, data.tds, data.comment, data.requestdate
  ];

  await pool.query(insertQuery, values);
}
// Véletlenszerű adat generálása
async function generateRandomRFQ() {
  const tissue = tissues[Math.floor(Math.random() * tissues.length)];
  const plies = Object.keys(pliesOptions)[Math.floor(Math.random() * Object.keys(pliesOptions).length)];
  const diameter = pliesOptions[plies][Math.floor(Math.random() * pliesOptions[plies].length)];
  const grammatura = tissueProperties[tissue].grammatura[Math.floor(Math.random() * tissueProperties[tissue].grammatura.length)];
  const reels = tissueProperties[tissue].reels[Math.floor(Math.random() * tissueProperties[tissue].reels.length)];
  const orderweight = Math.floor(Math.random() * 1000) + 100; // 100 és 1100 között
  const certification = Math.random() < 0.5; // 50% eséllyel true vagy false
  const weeknum = Math.floor(Math.random() * 52) + 1; // 1-52 között
  const requestdate = new Date(Date.UTC(2023, 0, 1 + Math.floor(Math.random() * 297))).toISOString().split('T')[0]; // 2023.01.01 - 2024.10.24 között

  // Quotatient számítása
  const quotatient = Math.floor(280 / reels);

  // Véletlenszerű customer_id kiválasztása
  const customer_id = customerIds[Math.floor(Math.random() * customerIds.length)];

  // TDS érték véletlenszerűen (null vagy 1-108 között)
  const tds = Math.random() < 0.7 ? null : Math.floor(Math.random() * 108) + 1;

  const data = {
    customer_id,
    tissue,
    plies: Number(plies),
    grammatura,
    diameter,
    reels,
    quotatient,
    pack1: Math.floor(Math.random() * 10) + 1, // 1-10 között
    pack2: Math.floor(Math.random() * 10) + 1, // 1-10 között
    orderweight,
    w1: Math.floor(Math.random() * 100) + 1, // 1-100 között
    w2: Math.floor(Math.random() * 100) + 1, // 1-100 között
    ediameter: diameter, // Vagy bármilyen más logika alapján
    certification,
    weeknum,
    tds,
    comment: 'Generated by script', // Megjegyzés
    requestdate
  };

  await insertRFQ(data);
}
// Teszt-/demóadat-generáló végpont. Kizárólag admin jogosultsággal és csak
// nem éles környezetben érhető el - éles (production) build-ben ne fusson.
app.get('/test/:data', async (request, response) => {
  if (!request.isAuthenticated() || request.user.role_id !== ROLES.ADMIN) {
    return response.status(403).send({ message: 'Forbidden' });
  }
  if (process.env.NODE_ENV === 'production') {
    return response.status(404).send({ message: 'Not found' });
  }

  try {
    const parsedData = JSON.parse(request.params.data);
    const { head } = parsedData;

    if (head === "fakeuser") {
      await insertCustomers(10); // Példa: 10 rekord létrehozása
      response.status(200).send({ message: 'Adatok beszúrása kész', status: 'success' });
    } else if (head === "fakerfq") {
      for (let i = 0; i < 999; i++) {
        await generateRandomRFQ();
      }
      response.status(200).send({ message: 'Adatok beszúrása kész', status: 'success' });
    } else {
      response.status(400).send({ message: 'Unknown request type' });
    }
    // Megjegyzés: a pool.end() korábban itt szerepelt, de az az egész
    // alkalmazás közös adatbázis-kapcsolatát zárta volna le - ezt eltávolítottuk.
  } catch (err) {
    console.error('Error processing /test request:', err);
    response.status(500).send({ message: 'Internal Server Error' });
  }
});
// Termékigény Riport
// Az elérhető "time" ablakok fehérlistája - lásd views/report.ejs #time select.
const REPORT_TIME_WINDOWS = new Set(['7 days', '30 days', '3 month', '6 month', '1 year']);

app.get('/api/report/:data', async (req, res) => {
  // Ez az API a /report (admin) oldal diagramjait szolgálja ki, ezért ugyanaz
  // a jogosultsági szint vonatkozik rá, mint a /report route-ra.
  if (!req.isAuthenticated() || req.user.role_id !== ROLES.ADMIN) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const parsedData = JSON.parse(req.params.data);
    const { chart, year, month, time, company } = parsedData;

    let query = "";
    let group = "";
    switch (chart) {
      case "chart1":
        query = "SELECT tissue AS productType, SUM(orderweight) AS totalQuantity FROM rfq";
        group = " GROUP BY tissue";
        break;
      case "chart2":
        query = "SELECT grammatura AS weight, plies AS layers, SUM(orderweight) AS totalQuantity FROM rfq";
        group = " GROUP BY grammatura, layers";
        break;
      case "chart3":
        query = "SELECT weeknum, tissue AS productType, SUM(orderweight) AS totalQuantity FROM rfq";
        group = " GROUP BY weeknum, tissue ORDER BY weeknum";
        break;
      case "chart4":
        query = "SELECT certification, SUM(orderweight) AS totalQuantity FROM rfq";
        group = " GROUP BY certification";
        break;
      case "chart5":
        query = "SELECT EXTRACT(YEAR FROM requestdate) AS year, EXTRACT(MONTH FROM requestdate) AS month, SUM(orderweight) AS totalQuantity FROM rfq";
        group = " GROUP BY year, month ORDER BY year, month";
        break;
      default:
        return res.status(400).json({ message: 'Unknown chart type' });
    }

    // Minden szűrőfeltétel paraméterezve kerül a lekérdezésbe (SQL injection védelem).
    const conditions = [];
    const values = [];

    if (year) {
      const yearNum = parseInt(year, 10);
      if (!Number.isInteger(yearNum)) {
        return res.status(400).json({ message: 'Invalid year' });
      }
      values.push(yearNum);
      conditions.push(`EXTRACT(YEAR FROM requestdate) = $${values.length}`);

      if (month) {
        const monthNum = parseInt(month, 10);
        if (!Number.isInteger(monthNum)) {
          return res.status(400).json({ message: 'Invalid month' });
        }
        values.push(monthNum);
        conditions.push(`EXTRACT(MONTH FROM requestdate) = $${values.length}`);
      }
    }

    if (time) {
      // A 'time' értéket egy zárt fehérlistával validáljuk, csak utána
      // kerülhet (szó szerinti egyezésként) az INTERVAL kifejezésbe -
      // paraméterként nem adható át, mert a PostgreSQL INTERVAL literál
      // szintaxisa nem fogadja el a $n helyettesítést ezen a pozíción.
      if (!REPORT_TIME_WINDOWS.has(time)) {
        return res.status(400).json({ message: 'Invalid time window' });
      }
      conditions.push(`requestdate >= CURRENT_DATE - INTERVAL '${time}'`);
    }

    if (company) {
      const companyId = parseInt(company, 10);
      if (!Number.isInteger(companyId)) {
        return res.status(400).json({ message: 'Invalid company' });
      }
      values.push(companyId);
      conditions.push(`customer_id = $${values.length}`);
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const fullQuery = query + where + group;
    const result = await pool.query(fullQuery, values);
    res.status(200).json(result.rows);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: 'Invalid request payload' });
    }
    console.error('Error fetching product demand report:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});




app.use((req, res, next) => {
  if (req.isAuthenticated()) {
  res.redirect('/login');
  } else {
    res.redirect('/');
  }
  //res.status(404).send("Sorry can't find that!")
})
