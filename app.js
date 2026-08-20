require('dotenv').config();

var sessionstore = require('sessionstore');
const express = require('express');
const https = require('https');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { Pool } = require('pg');
var flash = require('connect-flash');
const fs = require('fs');
const bodyParser = require('body-parser');
const faker = require('faker');

const app = express();
const port = process.env.APP_PORT || 3000;
//.env
const JWT_SECRET = process.env.JWT_SECRET;

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
https.createServer(options, app).listen(process.env.APP_PORT, () => {
  console.log('HTTPS server running on port ' + process.env.APP_PORT);
});
app.use(session({
  store: sessionstore.createSessionStore(),
  secret: process.env.SESSION_SECRET,
  name: "rfq_cookie",
  cookie: {
    maxAge: 3600000,
    rolling: true,
    secure: true, // this should be true only when you don't want to show it for security reason
    httpOnly: false, // A cookie nem elérhető JavaScript-en keresztül
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
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Incorrect password.' });
        }
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
    var qry = "";
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
  if (req.isAuthenticated()) {
    const { head, data } = req.body;
    try {
      if (head === "update_detalis") {
        const query = await updateUser(data);
        const result = await pool.query(query);
        res.status(200).send({ message: 'User successfully updated' });
      } else if (head === "list") {
        const query = await listUsers();
        const result = await pool.query(query);
        res.status(200).send({ data: result.rows });
      } else if (head === "usersfilter") {
        const { query, values } = await filterUsers(data);
        const result = await pool.query(query, values);
        res.status(200).send({ data: result.rows });
      } else if (head === "profile_update") {
        const {query, values, status, error} = await updateProfile(data);
        if (error) {
          return res.status(500).send({message: 'Database error', status: 'error'});
        }
        const result = await pool.query(query, values);
        if (status === 'updated') {
          res.status(200).send({data: result.rows, message: 'Profile updated successfully', status: 'success'});
        } else if (status === 'inserted') {
          res.status(201).send({data: result.rows, message: 'Profile created successfully', status: 'success'});
        }
      }
      } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send({ message: 'Error processing request', status: 'error' });
      }

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
  return result;
}

async function createOrder(userid) {
  await pool.query(`INSERT INTO rfq (customer_id, tissue, plies, grammatura, diameter, reels, quotatient, pack1, pack2, orderweight, w1, w2, ediameter, certification, weeknum, tds, _comment) 
                    SELECT customer_id, tissue, plies, grammatura, diameter, reels, quotatient, pack1, pack2, orderweight, w1, w2, ediameter, certification, weeknum, tds, _comment 
                    FROM cart WHERE customer_id = $1`, [userid]);

  const result = await pool.query(`SELECT * FROM cart WHERE customer_id = $1`, [userid]);
  return result.rows;
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
  let conditions = [];

  if (data.s1) {
    conditions.push(`tissue LIKE '${data.s1}%'`);
  }
  if (data.s2) {
    conditions.push(`reel = ${data.s2}`);
  }
  if (data.s3) {
    conditions.push(`grammatura = ${data.s3}`);
  }

  let query = "SELECT * FROM portfolio";
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  return query;
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
        console.log("filter")
        const query = await buildFilterQuery(data); // await hozzáadva
        const result = await pool.query(query);
        res.status(200).send({ message: 'Filter applied', data: result.rows });
      }
    } catch (err) {
      console.error('Error processing request:', err);
      res.status(500).send({ error: 'Internal Server Error' });
    }
  }
});


function getSessionTime(request) {
  return request.session.cookie.expires - Date.now();
}
async function getDataResponse(target) {
  return await getdata(target);
}
async function addOrDeleteData(query, action) {
  await pool.query(query);
  const message = action === "add" ? "Data successfully inserted" : "Data successfully deleted";
  return message;
}
async function getOptions(optionName, whereCondition) {
  let query = "";
  switch (optionName) {
    case "Tissue":
      query = "SELECT DISTINCT tissue FROM portfolio";
      break;
    case "Plies":
      query = "SELECT * FROM plies";
      break;
    case "Grammatura":
      query = `SELECT DISTINCT grammatura FROM portfolio WHERE tissue = '${whereCondition}'`;
      break;
    case "Diameter":
      query = `SELECT DISTINCT diameter FROM plie_param WHERE plie = '${whereCondition}'`;
      break;
    case "Reels":
      query = `SELECT DISTINCT reel FROM portfolio WHERE tissue = '${whereCondition}' ORDER BY reel ASC`;
      break;
    case "Ediameter":
      query = `SELECT DISTINCT eheight, truck, weight FROM ediam_param WHERE tissue = '${whereCondition}'`;
      break;
    default:
      throw new Error("Invalid option name");
  }
  const result = await pool.query(query);
  return result.rows;
}
async function getCustomerMoreDetails(customerId) {
  const sql = `SELECT * FROM customers WHERE customers.customer_id = ${customerId}; 
               SELECT COUNT(cartid) FROM cart WHERE cart.customer_id = ${customerId}`;
  const result = await pool.query(sql);;
  return { customerData: result[0].rows, cartCount: result[1].rows };
}
app.get('/mw/:data', async (request, response) => {
  if (request.isAuthenticated()) {
    const time = getSessionTime(request);
    const parsedData = JSON.parse(request.params.data);
    const { target, head } = parsedData;

    try {
      if (head === "data") {
        const data = await getDataResponse(target);
        const responseData = { message: "Data successfully retrieved", data: data };
        return response.json(responseData);
      } else if (head === "add" || head === "delete") {
        const qry = parsedData.data;
        const message = await addOrDeleteData(qry, head);
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
        response.redirect('/login');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      response.status(500).send('Internal Server Error');
    }
  }
});



// Protected route
app.get('/protected', (req, res) => {
  if (req.isAuthenticated()) {
    setInterval(() => {
      logSessionTime(req);
    }, 1000); // 1 másodpercenként fut
    // Send or render the protected content
    // For simplicity, sending text response, but you could also render an HTML page
    var sql = "SELECT * from customers WHERE customer_id=" + req.user.customer_id;
    pool.query(sql, (err, result) => {
      if (err) {
        console.log('SQL ERROR');
      } else {
        res.render('index.ejs', { data: result.rows[0] });
        //console.log(result.rows[0])
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
    var sql = "SELECT * from customers WHERE customer_id=" + req.user.customer_id;
    pool.query(sql, (err, result) => {
      if (err) {
        console.log('SQL ERROR');
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
    var sql = "SELECT * from customers WHERE customer_id=" + req.user.customer_id;
    pool.query(sql, (err, result) => {
      if (err) {
        console.log('SQL ERROR');
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
    var sql = "SELECT * from customers WHERE customer_id=" + req.user.customer_id;
    pool.query(sql, (err, result) => {
      if (err) {
        console.log('SQL ERROR');
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
  if (req.isAuthenticated() && req.user.role_id === 3) {
    const time = req.session.cookie.expires - new Date(Date.now());
    // Send or render the protected content
    // For simplicity, sending text response, but you could also render an HTML page
    var sql = "SELECT * FROM tissue; SELECT * FROM grammatura; \
    SELECT * FROM reels; \
    SELECT * FROM portfolio; \
    SELECT * FROM plies; \
    SELECT * from diameter; \
    SELECT * from plie_param; \
    SELECT * from eheight; \
    SELECT * from truck; \
    SELECT * from weight ORDER BY weight ASC; \
    SELECT * from ediam_param; \
    SELECT * from customers WHERE customer_id=" + req.user.customer_id + "; \
    SELECT customers.customer_id, customers.customer_name, customers.vat_number, customers.contact_name, customers.email, \
    customers.phone, customers.role_id, customers.date_joined, customers.status, roles.rolename \
    FROM customers JOIN roles ON customers.role_id = roles.role_id; \
    SELECT * FROM rfq";
    pool.query(sql, (err, result) => {
      if (err) {
        console.log('SQL ERROR');
        res.redirect('/login');
      } else {
        res.render('admin.ejs', { data: result, time: time });
      }
    });

    //res.sendFile(__dirname + '/views/admin.html');
  } else {
    // Redirect unauthenticated requests to login page
    res.redirect('/login');
  }
});

app.get('/report', (req, res) => {
  if (req.isAuthenticated() && req.user.role_id === 3) {

    var sql = "SELECT customer_id, customer_name FROM customers;";
    pool.query(sql, (err, result) => {
      if (err) {
        console.log('SQL ERROR');
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
    var sql = "SELECT * from customers WHERE customer_id=" + req.user.customer_id + "; SELECT * FROM addresses WHERE u_id = " + req.user.customer_id + "; SELECT * FROM rfq WHERE customer_id = " + req.user.customer_id;
    pool.query(sql, (err, result) => {
      if (err) {
        console.log('SQL ERROR');
      } else {
        res.render('profile.ejs', {data: result});
      }
    })
  } else {
    res.redirect('/login');
  }})

// Registration endpoint
// [Update this with the registration logic including bcrypt for password hashing]
app.post('/register', async (req, res) => {
  //const { username, password } = req.body;
  const { customer, vat, name, email, phone, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query('INSERT INTO customers(customer_name, vat_number, contact_name, email, phone, password) VALUES($1, $2, $3, $4, $5, $6) RETURNING customer_id', [customer, vat, name, email, phone, hashedPassword]);
    res.redirect('/login');
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation error code
      res.status(400).send('Email already exists');
    } else {
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


app.post("/logout", (req, res) => {
  token = null;

  res.redirect("/")
});
app.get('/session-status', (req, res) => {
  if (req.session) {
    const remainingTime = req.session.cookie.maxAge / 1000; // másodpercekben
    res.json({ timeLeft: remainingTime });
  } else {
    res.json({ timeLeft: 0 });
  }
});

function logSessionTime(req) {
  if (req.session && req.session.cookie) {
    const timeLeft = req.session.cookie.maxAge;
    // console.log(`rfq_cookie hátralévő ideje: ${timeLeft / 1000} másodperc`);
  } else {
    res.redirect('/login');
    // console.log('Nincs aktív session cookie.');
  }
}

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
app.get('/test/:data', (request, response) => {
  if (request.isAuthenticated()) {
    const parsedData = JSON.parse(request.params.data);
    const { target, head } = parsedData;

    try {
      if (head === "fakeuser") {
        // Adatok beszúrása
        (async () => {
          await insertCustomers(10); // Példa: 100 rekord létrehozása
          console.log('Adatok beszúrása kész.');
          await pool.end(); // Kapcsolat lezárása
          res.status(200).send({message: 'Adatok beszúrása kész', status: 'success'});
        })();
      } else if (head === "fakerfq") {
        // Adatok beszúrása
        (async () => {
          for (let i = 0; i < 999; i++) {
            await generateRandomRFQ();
          }
          response.status(200).send({message: 'Adatok beszúrása kész', status: 'success'});
          console.log('Adatok beszúrása kész.');
          await pool.end(); // Kapcsolat lezárása
        })();
      }
    } catch(err) {

    }
  }})
// Termékigény Riport
app.get('/api/report/:data', async (req, res) => {
  const parsedData = JSON.parse(req.params.data);
  console.log(parsedData);
  const { chart, year, month, time, company } = parsedData;
  let query = "";
  let group = ""
  let where = "";
  try {
    if (chart === "chart1") {
      query = `
            SELECT tissue AS productType, SUM(orderweight) AS totalQuantity
            FROM rfq
        `;
      group = " GROUP BY tissue";
    } else if (chart === "chart2") {
      query = `
            SELECT grammatura AS weight, plies AS layers, SUM(orderweight) AS totalQuantity
            FROM rfq
        `;
      group = " GROUP BY grammatura, layers"
    } else if (chart === "chart3") {
      query = `
            SELECT weeknum, tissue AS productType, SUM(orderweight) AS totalQuantity
            FROM rfq
        `;
      group = " GROUP BY weeknum, tissue ORDER BY weeknum";
    } else if (chart === "chart4") {
      query = "SELECT certification, SUM(orderweight) AS totalQuantity FROM rfq";
      group = " GROUP BY certification"
    } else if (chart === "chart5") {
      query = `
            SELECT EXTRACT(YEAR FROM requestdate) AS year, EXTRACT(MONTH FROM requestdate) AS month, SUM(orderweight) AS totalQuantity
            FROM rfq
        `;
      group = " GROUP BY year, month ORDER BY year, month"
    }
    if (month !== "" && year !== "") {
      where = "WHERE EXTRACT(YEAR FROM requestdate) = " + year + " AND EXTRACT(MONTH FROM requestdate) = " + month;
    } else if (year !== "") {
      where = where + " WHERE EXTRACT(YEAR FROM requestdate) = " + year;
    }
    if (time !== "") {
      where = where + " WHERE requestdate >= CURRENT_DATE - INTERVAL '" + time + "'";
    }
    if (company !== "") {
      if (where !== "" ) {
        where = where + " AND customer_id = " + company;
      } else {
        where = " WHERE customer_id = " + company;
      }
    }
    query = query + " " + where + group;
    console.log(query);
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
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
