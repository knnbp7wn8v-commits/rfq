function portfolio_render(data) {
   const table = document.getElementById("portfolio");
   const rows = table.rows;
   for (let i = rows.length - 1; i > 0; i--) {
      table.deleteRow(i);
   }


   for (let row of data) {
      table.insertRow();
      let newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.className = "td-select";
      const chkbox = document.createElement("input");
      chkbox.setAttribute("type", "checkbox");
      chkbox.setAttribute("id", row.id);
      newCell.appendChild(chkbox);
      newCell = table.rows[table.rows.length - 1].insertCell();
      const tissuePill = document.createElement("span");
      tissuePill.className = "tissue-pill";
      tissuePill.textContent = row.tissue;
      newCell.appendChild(tissuePill);
      newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.textContent = row.reel + " cm";
      newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.textContent = row.grammatura + " gsm";
   }
   // Megjegyzés: korábban itt egy "document.getElementById('div_2a').appendChild(table)"
   // hívás állt, ami a táblázatot a div_2a UTOLSÓ gyermekévé tette volna - a jelenlegi
   // (kártyás) elrendezésben a div_2a a táblázaton kívül egy fejlécet és a lapozó
   // vezérlőket is tartalmazza, ezért ez a hívás a táblázatot a lapozó ALÁ helyezte
   // volna át minden szűrés/hozzáadás/törlés után. A hívás valójában feleslegessé is
   // vált: a "table" objektum a getElementById("portfolio") révén már a DOM megfelelő
   // helyén van, a sorok deleteRow/insertRow általi módosítása nem igényli az elem
   // újbóli beillesztését.
}

function users_render(data) {
   // Megjegyzés: a ciklus törzsében korábban két egymást követő
   // "table.insertRow()" hívás állt - az első eredménye (egy teljesen
   // üres, cellák nélküli <tr>) sosem lett felhasználva, csak a
   // MÁSODIK ("newRow") kapta meg a tényleges adatokat. Ez minden
   // egyes ügyfélhez egy láthatatlan, de érvényes (üres) sort is
   // beszúrt a táblázatba - a hiba vizuálisan alig tűnt fel, mert az
   // üres <tr>-nek nem volt tartalma/magassága, de feleslegesen
   // duplázta a DOM-sorok számát szűrés/frissítés után. Javítva:
   // csak a ténylegesen feltöltött sor jön létre.
   const table = document.getElementById("customers");
   const rows = table.rows;
   for (let i = rows.length - 1; i > 0; i--) {
      table.deleteRow(i);
   }
   for (let row of data) {
      const newRow = table.insertRow();
      newRow.id = `row-${row.customer_id}`;
      newRow.onclick = function() {
         details(row.customer_id);
      }
      let newCell = newRow.insertCell();
      newCell.textContent = row.customer_name;
      newCell = newRow.insertCell();
      newCell.textContent = row.vat_number;
      newCell = newRow.insertCell();
      newCell.textContent = row.contact_name;
      newCell = newRow.insertCell();
      newCell.textContent = row.email;
      newCell = newRow.insertCell();
      newCell.textContent = row.phone;
      newCell = newRow.insertCell();
      newCell.textContent = row.date_joined;
      newCell = newRow.insertCell();
      newCell.textContent = row.rolename;
      newCell = newRow.insertCell();
      newCell.textContent = row.status;
   }

}
function plie_param_render(data) {
   if (document.getElementById("plie_params")) {
      document.getElementById("plie_params").remove()
   }
   let table = document.createElement('table');
   table.setAttribute("id", "plie_params");
   // A "data-table" osztályt korábban csak a szerveroldalról (EJS)
   // renderelt kezdeti táblázat kapta meg (lásd admin.ejs) - az
   // itt, JS-ből ÚJRAlétrehozott <table> elem osztály nélkül jött
   // létre, ezért egy Add/Delete művelet után a táblázat elvesztette
   // a modern felület stílusát. Javítva.
   table.className = "data-table";
   table.insertRow();
   var headerCell = document.createElement("TH");
   headerCell.innerHTML = "Select All";
   const input = document.createElement("input");
   input.setAttribute("type", "checkbox");
   input.setAttribute("id", "selectall");
   input.setAttribute("value", "plie_params");
   input.setAttribute("onchange", "selectall(this)");
   headerCell.appendChild(document.createElement('br'));
   headerCell.appendChild(input);
   const row = table.rows[table.rows.length - 1];
   row.appendChild(headerCell);
   headerCell = document.createElement("TH");
   headerCell.innerHTML = "Plie";
   row.appendChild(headerCell);
   headerCell = document.createElement("TH");
   headerCell.innerHTML = "Diameter";
   row.appendChild(headerCell);
   for (let row of data) {
      table.insertRow();
      let newCell = table.rows[table.rows.length - 1].insertCell();
      const chkbox = document.createElement("input");
      chkbox.setAttribute("type", "checkbox");
      chkbox.setAttribute("id", row.id);
      newCell.appendChild(chkbox);
      newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.textContent = row.plie;
      newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.textContent = row.diameter + " cm";
   }
   document.getElementById("div_3b1").appendChild(table);
}

function ediam_param_render(data) {
   if (document.getElementById("ediam_params")) {
      document.getElementById("ediam_params").remove()
   }
   let table = document.createElement('table');
   table.setAttribute("id", "ediam_params");
   // Lásd a plie_param_render()-ben lévő azonos megjegyzést.
   table.className = "data-table";
   table.insertRow();
   var headerCell = document.createElement("TH");
   headerCell.innerHTML = "Select All";
   const input = document.createElement("input");
   input.setAttribute("type", "checkbox");
   input.setAttribute("id", "selectall");
   input.setAttribute("value", "ediam_params");
   input.setAttribute("onchange", "selectall(this)");
   headerCell.appendChild(document.createElement('br'));
   headerCell.appendChild(input);
   const row = table.rows[table.rows.length - 1];
   row.appendChild(headerCell);
   headerCell = document.createElement("TH");
   headerCell.innerHTML = "Height";
   row.appendChild(headerCell);
   headerCell = document.createElement("TH");
   headerCell.innerHTML = "Trucks";
   row.appendChild(headerCell);
   headerCell = document.createElement("TH");
   headerCell.innerHTML = "Tissue";
   row.appendChild(headerCell);
   headerCell = document.createElement("TH");
   headerCell.innerHTML = "Weight";
   row.appendChild(headerCell);
   for (let row of data) {
      table.insertRow();
      let newCell = table.rows[table.rows.length - 1].insertCell();
      const chkbox = document.createElement("input");
      chkbox.setAttribute("type", "checkbox");
      chkbox.setAttribute("id", row.id);
      newCell.appendChild(chkbox);
      newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.textContent = row.eheight + " cm";
      newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.textContent = row.truck;
      newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.textContent = row.tissue;
      newCell = table.rows[table.rows.length - 1].insertCell();
      newCell.textContent = row.weight + " kg";
   }
   document.getElementById("div_4b1").appendChild(table);
}


function selectall(t) {
   const ids = document.querySelectorAll('#' + t.value + ' input[type="checkbox"]');
   if (t.checked == false) {
      ids.forEach(function (el) {
         if (el.id != "selectall") {
            el.checked = false;
         }
      })
   } else {
      ids.forEach(function (el) {
         if (el.id != "selectall") {
            el.checked = true;
         }
      })
   }
}
function w3_open() {
   document.getElementById("mySidebar").style.display = "block";
   document.getElementById("myOverlay").style.display = "block";
}

function w3_close() {
   document.getElementById("mySidebar").style.display = "none";
   document.getElementById("myOverlay").style.display = "none";
}

function details(id) {
   const data = {
      head: "details",
      data: {
         id: id
      }
   };
   fetch('/mw', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
   })
      .then(checkResponse)
      .then(data => {
         document.getElementById("c_details").innerHTML = "";
         let table = document.createElement('table');
         table.setAttribute("id", "c_details" + data.data[0].customer_id);
         // Megjegyzés: az itteni "table.insertRow()" a lenti ciklus ELŐTT
         // állt, felesleges üres sort szúrva a részletek-táblázat elejére
         // - lásd a users_render()-ben talált, azonos jellegű hibát erről
         // bővebben. Törölve.
         for (let row of data.data) {
            table.insertRow();
            let newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Customer Name";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = row.customer_name;
            newCell.className = "col2"
            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Vat Number";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = row.vat_number;
            newCell.className = "col2"
            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Contact Name";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = row.contact_name;
            newCell.className = "col2"
            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Email";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = row.email;
            newCell.className = "col2"
            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Phone";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = row.phone;
            newCell.className = "col2"
            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Date Joined";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = row.date_joined;
            newCell.className = "col2"
            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Role";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            var roles = document.createElement("select");
            roles.setAttribute("id", "role_id");
            var option = document.createElement("option");
            option.value = "1";
            option.textContent = "User";
            roles.appendChild(option);
            option = document.createElement("option");
            option.value = "2";
            option.textContent = "Report";
            roles.appendChild(option);
            option = document.createElement("option");
            option.value = "3";
            option.textContent = "Administrator";
            roles.appendChild(option);
            newCell.appendChild(roles);
            //newCell.textContent = row.role_id;
            newCell.className = "col2"
            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Status";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            var status = document.createElement("select");
            status.setAttribute("id", "status");
            option = document.createElement("option");
            option.value = true;
            option.textContent = "Enabled";
            status.appendChild(option);
            option = document.createElement("option");
            option.value = false;
            option.textContent = "Disabled";
            status.appendChild(option);
            newCell.appendChild(status);
            //newCell.textContent = row.status;
            newCell.className = "col2"

            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Új jelszó";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            var pass = document.createElement("input");
            pass.setAttribute("type", "password");
            pass.setAttribute("id", "password");
            var div = document.createElement("div");
            div.setAttribute("id", "passwordFeedback");
            newCell.appendChild(pass);
            newCell.appendChild(div);
            newCell.className = "col2"

            table.insertRow();
            newCell = table.rows[table.rows.length - 1].insertCell();
            newCell.textContent = "Jelszó ismétlése";
            newCell.className = "col1"
            newCell = table.rows[table.rows.length - 1].insertCell();
            var repass = document.createElement("input");
            repass.setAttribute("type", "password");
            repass.setAttribute("id", "confirmPassword");
            div = document.createElement("div");
            div.setAttribute("id", "confirmPasswordFeedback");
            newCell.appendChild(repass);
            newCell.appendChild(div);
            newCell.className = "col2"

         }
         document.getElementById("c_details").append(table);
         document.getElementById("role_id").value = data.data[0].role_id;

         document.getElementById("status").value = data.data[0].status;
         var btn = document.createElement("button");
         btn.setAttribute("id", "update");
         btn.setAttribute("type", "button");
         btn.textContent = "Update";
         btn.onclick = function () {
            // A jelszó-erősségi visszajelzés korábban csak kozmetikai volt:
            // a mentés a validatePassword() eredményétől függetlenül lefutott.
            // Üres jelszó = "a jelszó nem változik" (lásd app.js updateUser),
            // ezért csak akkor kényszerítjük ki a szabályt, ha az admin
            // ténylegesen új jelszót ad meg. Lásd: kod_atvilagitas_kliens.md, 3.2 pont.
            const newPassword = document.getElementById('password').value;
            const confirmNewPassword = document.getElementById('confirmPassword').value;
            if ((newPassword !== '' || confirmNewPassword !== '') && !validatePassword()) {
               showMessage('Kérjük, javítsa a jelszóval kapcsolatos hibákat a mentés előtt.', 'error');
               return;
            }
            details_update(data.data[0].customer_id);
         }
         document.getElementById("c_details").append(btn);

         const password = document.getElementById('password');
         const confirmPassword = document.getElementById('confirmPassword');
         const passwordFeedback = document.getElementById('passwordFeedback');
         const confirmPasswordFeedback = document.getElementById('confirmPasswordFeedback');



         password.addEventListener('keyup', validatePassword);
         confirmPassword.addEventListener('keyup', validatePassword);
      })
      .catch(error => {
         Logger.error('Error:', error);
         showMessage(error.message || 'Hiba történt az ügyfél adatainak betöltésekor.', 'error');
      });
}

/**
 * A jelszómezőket és a visszajelző elemeket korábban a HTML id-attribútumból
 * a böngésző által automatikusan létrehozott implicit globális változókon
 * (pl. `password`, `passwordFeedback`) keresztül érte el a függvény - ez
 * elavult, nem szabványos böngésző-viselkedésre támaszkodott. Most explicit
 * document.getElementById hívásokkal. Lásd: kod_atvilagitas_kliens.md, 3.1 pont.
 */
function validatePassword() {
   const passwordEl = document.getElementById('password');
   const confirmPasswordEl = document.getElementById('confirmPassword');
   const passwordFeedbackEl = document.getElementById('passwordFeedback');
   const confirmPasswordFeedbackEl = document.getElementById('confirmPasswordFeedback');

   const passwordValue = passwordEl.value;
   const confirmPasswordValue = confirmPasswordEl.value;
   let valid = true;
   let feedback = '';

   if (passwordValue.length < 10) {
      feedback += 'A jelszónak legalább 10 karakter hosszúnak kell lennie.<br>';
      valid = false;
   }

   if (!/[a-z]/.test(passwordValue)) {
      feedback += 'A jelszónak tartalmaznia kell legalább egy kisbetűt.<br>';
      valid = false;
   }

   if (!/[A-Z]/.test(passwordValue)) {
      feedback += 'A jelszónak tartalmaznia kell legalább egy nagybetűt.<br>';
      valid = false;
   }

   if (!/[0-9]/.test(passwordValue)) {
      feedback += 'A jelszónak tartalmaznia kell legalább egy számjegyet.<br>';
      valid = false;
   }

   if (valid) {
      passwordFeedbackEl.innerHTML = 'A jelszó megfelelő.';
      passwordFeedbackEl.className = 'valid';
   } else {
      passwordFeedbackEl.innerHTML = feedback;
      passwordFeedbackEl.className = 'invalid';
   }

   if (confirmPasswordValue !== passwordValue) {
      confirmPasswordFeedbackEl.textContent = 'A két jelszó nem egyezik meg.';
      confirmPasswordFeedbackEl.className = 'invalid';
      valid = false;
   } else {
      confirmPasswordFeedbackEl.textContent = 'A két jelszó megegyezik.';
      confirmPasswordFeedbackEl.className = valid ? 'valid' : 'invalid';
   }

   return valid;
}

function details_update(id) {
   const pass = document.getElementById("password").value;
   const role = document.getElementById("role_id").value;
   const status = document.getElementById("status").value;
   const data = {
      head: "update_detalis",
      data: {
         id: id,
         password: pass,
         role: role,
         status: status
      }
   };
   fetch('/users', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
   }).then(checkResponse)
      .then(data => {
         const d = {
            head: "list",
            data: {}
         };
         fetch('/users', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json'
            },
            body: JSON.stringify(d)
         })
            .then(checkResponse)
            .then(data2 => {
               users_render(data2.data);
            })
            .catch(error => Logger.error('Error:', error));
         document.getElementById("c_details").innerHTML = "";
         showMessage(data.message, 'success');

      })
      .catch(error => {
         Logger.error('Error:', error);
         showMessage(error.message || 'Hiba történt a mentés során.', 'error');
      });

}
function usersfilter() {
   var s4 = document.getElementById('s4').value;
   var s5 = document.getElementById('s5').value;
   var s6 = document.getElementById('s6').value;
   var s7 = document.getElementById('s7').value;
   var s8 = document.getElementById('s8').value;
   var s9 = document.getElementById('s9').value;
   var s10 = document.getElementById('s10').value;
   var s11 = document.getElementById('s11').value;
   const data = {
      head: "usersfilter",
      data: {
         s4: s4,
         s5: s5,
         s6: s6,
         s7: s7,
         s8: s8,
         s9: s9,
         s10: s10,
         s11: s11
      }
   }
   fetch('/users', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
   }).then(checkResponse)
      .then(data => {
         users_render(data.data);
         document.getElementById("customers_nr").innerHTML = (data.data).length;
      })
      .catch(error => {
         Logger.error('Error:', error);
         showMessage(error.message || 'Hiba történt a szűrés során.', 'error');
      });

}

function handleKeyUp2() {
   clearTimeout(timeout);
   timeout = setTimeout(function () {
      usersfilter();
   }, 1000);
}

/**
 * A Portfolio fül Tissues/Reels/Grammatura szűrői korábban natív
 * <select>/<select multiple> listaként jelentek meg. A modernizált
 * felületen ezeket egy jelölőnégyzet-/rádiógomb-listás megjelenés
 * váltja, DE a mögöttes <select> elemek (id="tissues"/"reels"/
 * "grammatura") a DOM-ban megmaradnak - csak vizuálisan rejtve -,
 * mert a ".add" gombra kattintva ezekből olvassa ki a kiválasztott
 * értékeket (option:checked) a lentebbi, változatlanul hagyott
 * eseménykezelő. Ez a függvény szinkronban tartja a látható
 * jelölőnégyzeteket/rádiógombokat a mögöttes <select> elem
 * option.selected állapotával, hogy a meglévő "Add" logika
 * módosítás nélkül tovább működjön.
 */
function initShadowFilterList(listId, selectId) {
   const list = document.getElementById(listId);
   const select = document.getElementById(selectId);
   if (!list || !select) {
      return;
   }
   const inputs = list.querySelectorAll('input[data-option-index]');
   function syncShadowSelect() {
      inputs.forEach(function (inp) {
         const idx = Number(inp.dataset.optionIndex);
         if (select.options[idx]) {
            select.options[idx].selected = inp.checked;
         }
      });
   }
   inputs.forEach(function (input) {
      input.addEventListener('change', syncShadowSelect);
   });
   // Kezdeti szinkronizáció: a Tissues szűrő első eleme pl. már
   // betöltéskor be van jelölve (lásd admin.ejs, idx === 0 'checked'),
   // 'change' esemény nélkül. Enélkül a mögöttes <select> egyetlen
   // option-je sem lenne "selected", és az "Add" gomb kattintásakor
   // az #tissues option:checked lekérdezés üres NodeList-et adna
   // vissza, ami "Cannot read properties of undefined (reading
   // 'value')" hibát okozott a hozzáadás logikájában.
   syncShadowSelect();
}

document.addEventListener('DOMContentLoaded', function () {
   initShadowFilterList('tissues-filter-list', 'tissues');
   initShadowFilterList('reels-filter-list', 'reels');
   initShadowFilterList('grammatura-filter-list', 'grammatura');
});