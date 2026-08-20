/**
 * HTML-re nézve veszélyes karakterek escape-elése. Minden olyan helyen
 * használandó, ahol felhasználó (vagy adatbázisból származó) szöveg
 * HTML-tartalomba (pl. e-mail törzsbe) kerül string-összefűzéssel, nem
 * pedig biztonságos DOM-elem-építéssel (createElement/textContent).
 * Lásd: kod_atvilagitas_kliens.md, 1.1-1.2 pont.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Egységesen kezeli a fetch() válaszát: sikeres (2xx) válasz esetén a
 * JSON törzzsel tér vissza, egyébként elutasított Promise-t ad vissza egy
 * érthető hibaüzenettel - így a hívó .then()-lánca nem próbál egy hibaválasz
 * (pl. lejárt munkamenet -> 401) törzsét sikeres adatként feldolgozni.
 * Lásd: kod_atvilagitas_kliens.md, 2.4 pont.
 */
function checkResponse(response) {
  return response.json()
    .catch(() => ({}))
    .then(body => {
      if (!response.ok) {
        throw new Error(body.message || body.error || ('HTTP hiba: ' + response.status));
      }
      return body;
    });
}

/**
 * Egységes kliensoldali naplózás. Minden korábbi közvetlen console.log()/
 * console.error() hívást ez váltja fel, hogy a naplózás módja (formátum,
 * szint, esetleges jövőbeli szerverre küldés) egyetlen helyen legyen
 * módosítható, ne szórtan minden fájlban külön-külön.
 */
const Logger = {
  info(...args) {
    console.log('[INFO]', new Date().toISOString(), ...args);
  },
  warn(...args) {
    console.warn('[WARN]', new Date().toISOString(), ...args);
  },
  error(...args) {
    console.error('[ERROR]', new Date().toISOString(), ...args);
  }
};

/**
 * Nem tolakodó visszajelző sáv. Ha az oldal HTML-je nem tartalmaz #message
 * elemet (pl. a vásárlói oldal, index.ejs), a függvény létrehozza azt - így
 * bármelyik oldalról, sablon-módosítás nélkül hívható.
 */
function showMessage(message, className) {
  let messageDiv = document.getElementById('message');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'message';
    document.body.appendChild(messageDiv);
  }
  messageDiv.textContent = message;
  messageDiv.className = `message ${className}`;
  messageDiv.style.display = 'block';

  setTimeout(() => {
      messageDiv.style.display = 'none';
  }, 3000); // 3 másodperc után eltűnik az üzenet
}

/**
 * Egyedi, nem natív megerősítő párbeszédablak. A natív confirm()-ot váltja
 * ki, amely blokkolja a JS-szálat és nem stílusozható. Promise-t ad vissza:
 * true, ha a felhasználó megerősítette, false, ha megszakította.
 * Lásd: kod_atvilagitas_kliens.md, 5. pont ("alert()/confirm() alapú
 * felhasználói interakció").
 */
function showConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;'
      + 'background:rgba(0,0,0,0.5);display:flex;align-items:center;'
      + 'justify-content:center;z-index:1000;';

    const box = document.createElement('div');
    box.className = 'confirm-box';
    box.style.cssText = 'background:#fff;padding:20px 24px;border-radius:5px;'
      + 'max-width:400px;width:90%;box-shadow:0 2px 10px rgba(0,0,0,0.3);';

    const text = document.createElement('p');
    text.textContent = message;
    text.style.cssText = 'margin:0 0 16px 0;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:6px 16px;cursor:pointer;';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = 'OK';
    okBtn.style.cssText = 'padding:6px 16px;cursor:pointer;';

    function close(result) {
      overlay.remove();
      resolve(result);
    }
    okBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
    overlay.onclick = (evt) => {
      if (evt.target === overlay) {
        close(false);
      }
    };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    box.appendChild(text);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
}
function openTab(evt, tabName) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tabName).style.display = "flex";
  evt.currentTarget.className += " active";
}