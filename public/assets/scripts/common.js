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

function showMessage(message, className) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = message;
  messageDiv.className = `message ${className}`;
  messageDiv.style.display = 'block';

  setTimeout(() => {
      messageDiv.style.display = 'none';
  }, 3000); // 3 másodperc után eltűnik az üzenet
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