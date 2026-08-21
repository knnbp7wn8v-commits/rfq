rendercustomer();
function createElement(type, attributes, ...children) {
    const element = document.createElement(type);
    for (const key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
    children.forEach(child => {
        if (typeof child === "string") {
            // Szöveges gyermek mindig sima szövegcsomópontként kerül be, nem
            // innerHTML-be fűzve - így egy esetlegesen adatból (adatbázisból,
            // felhasználói bevitelből) származó string sosem értelmeződik
            // HTML-ként. Lásd: kod_atvilagitas_kliens.md, 1.1 pont.
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    return element;
}

function remove_element(element) {
    const el = document.getElementById(element);
    if (el) {
        el.remove();
    }
}
// A remove_div korábban a remove_element-tel szó szerint azonos, duplikált
// függvény volt, és mindkettő {} blokk helyett [] tömb-literált használt -
// ez véletlenül működött, de megtévesztő volt. Lásd: kod_atvilagitas_kliens.md, 2.2 pont.
const remove_div = remove_element;

function createInput(type, id, value = '', extraAttributes = {}) {
    return createElement("input", { type, id, value, ...extraAttributes });
}
function createSelect(id, extraAttributes = {}) {
    return createElement("select", { id, ...extraAttributes });
}
function createLabel(forElement, text, class_name = '') {
    const label = createElement("label", { id: forElement }, text);
    label.className = class_name;
    return label;
}

function createDiv(id, style = '', ...children) {
    return createElement("div", { id, style }, ...children);
}
function createForm(id, style = '', _action, _method, ...children) {
    const form = createElement("form", { id }, ...children);
    form.className = style;
    //form.setAttribute('action', _action);
    //form.setAttribute('method', _method);
    return form;
}
function createBr() {
    return createElement("br");
}
function createSpan(id, classNames = '', text = '') {
    const span = createElement("span", { id }, text);
    span.className = classNames;
    return span;
}
function createButton(id, text, onclick = '', type) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.onclick = onclick;
    button.type = type;
    return button;
}
const orderBut = createButton('orderBut', 'Add to request', 'requestforquote()', 'button');
orderBut.className = "btn btn-outline";
addEvent(orderBut, "click", () => requestforquote());
document.body.appendChild(orderBut);

function addEvent(element, eventType, handler) {
    element.addEventListener(eventType, handler);
}

const body = document.body;
// A modern felülethez a "Products"/"Address" lépés-kártyák az #rfqSteps,
// a "Requests" összegző panel az #rfqSummary oszlopba kerül (lásd
// index.ejs) - a korábbi verzióban minden elem közvetlenül a body-hoz
// lett hozzáfűzve. A kaszkádoló kiválasztási logika (tissue_select_id
// stb.) és minden elem-azonosító változatlan maradt, ezért ez a
// átszervezés a JS-vezérlést nem érinti.
const stepsCol = document.getElementById('rfqSteps');
const summaryCol = document.getElementById('rfqSummary');

// A készítő által megadott, fix SVG-jelölés beillesztése - nem
// felhasználói/adatbázisból származó string, ezért az innerHTML
// használata itt biztonságos (lásd kod_atvilagitas_kliens.md, 1.1 pont).
function iconify(el, svgMarkup) {
    el.innerHTML = svgMarkup;
    return el;
}
const ICON_PRODUCTS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
const ICON_ADDRESS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';

function createStepTitle(num, text, iconMarkup) {
    const stepNum = createSpan('', 'step-num', String(num));
    const h2 = createElement('h2', {}, text);
    const icon = iconify(createDiv(''), iconMarkup);
    const head = createDiv('', '', stepNum, h2, icon);
    head.className = 'step-title';
    return head;
}

const orderDivHead = createStepTitle(1, 'Products', ICON_PRODUCTS);
orderDivHead.id = 'orderDivHead';
addEvent(orderDivHead, "click", () => collapse(orderDivHead.id));

const addressDivHead = createStepTitle(2, 'Address', ICON_ADDRESS);
addressDivHead.id = 'addressDivHead';
addEvent(addressDivHead, "click", () => collapse(addressDivHead.id));

// A "Requests" összegző panel fejléce - a Products/Address lépésekkel
// ellentétben ez nem összecsukható (lásd cart.js listrequest()): a
// jóváhagyott látványterv szerint ez egy állandóan látható, ragadós
// oldalsáv, ezért nincs collapse()-eseménykezelője.
const requestsDivHeadTitle = createElement('h2', {}, 'Requests');
const requestsCountBadge = createSpan('requestsnr', 'summary-count', '0');
const requestDivHead = createDiv('requestsDivHead', '', requestsDivHeadTitle, requestsCountBadge);
requestDivHead.className = 'summary-head';

const addressDiv = createDiv("addressDiv", "display:none");
addressDiv.className = 'card-body';
const orderDiv = createDiv("orderDiv", "display:block");
orderDiv.className = 'card-body';
const requestsDiv = createDiv("requestsDiv", "display:block");
requestsDiv.className = 'summary-list';

const orderCard = createDiv('orderCard', '', orderDivHead, orderDiv);
orderCard.className = 'card';
const addressCard = createDiv('addressCard', '', addressDivHead, addressDiv);
addressCard.className = 'card';
const summaryCard = createDiv('summaryCard', '', requestDivHead, requestsDiv);
summaryCard.className = 'summary-card';

// Repeat for other elements as needed




const parityDiv = createDiv("parityDiv");
parityDiv.className = 'field-group';
const parityTag = createLabel("", "Parity", "labelclass");
const parity1lbl = createLabel("parity1", "EXW");
const parity2lbl = createLabel("parity2", "DAP");
const parity1 = createInput("checkbox", "parity1", "EXW");
const parity2 = createInput("checkbox", "parity2", "DAP");
parity2.checked = true;
parity1.onclick = function () {
    paritythis(this.id);
}
parity2.onclick = function () {
    paritythis(this.id);
}
const trcostlbl = createLabel("", "Request for transport cost");
trcostlbl.setAttribute("id", "trcostlbl");
const trcost = createInput("checkbox", "trcost");
parityDiv.appendChild(createBr());
parityDiv.appendChild(parityTag);
parityDiv.appendChild(createBr());
parityDiv.appendChild(parity1);
parityDiv.appendChild(parity1lbl);
parityDiv.appendChild(createBr());
parityDiv.appendChild(parity2);
parityDiv.appendChild(parity2lbl);
parityDiv.appendChild(createBr());
parityDiv.appendChild(createBr());
parityDiv.appendChild(trcost);
parityDiv.appendChild(trcostlbl);
addressDiv.appendChild(parityDiv);

/////***************Delivery******************//////

const delivery1 = createDiv("delivery1");
delivery1.classList.add("delivery1_class");
const delivery2 = createDiv("delivery2");
delivery2.classList.add("delivery2_class");
delivery2.classList.add("field-group");
const d1_label = createLabel("", "Delivery Address");
delivery1.appendChild(d1_label);
const d2_label = createLabel("", createSpan("", "", "Country:"));
const d2_in = createInput("text", "d2_in");
const d3_label = createLabel("", createSpan("", "", "Postal Code:"));
const d3_in = createInput("text", "d3_in");
const d4_label = createLabel("", createSpan("", "", "Address:"));
const d4_in = createInput("text", "d4_in");

delivery2.appendChild(d2_label);
delivery2.appendChild(d2_in);
delivery2.appendChild(createBr());
delivery2.appendChild(d3_label);
delivery2.appendChild(d3_in);
delivery2.appendChild(createBr());
delivery2.appendChild(d4_label);
delivery2.appendChild(d4_in);

addressDiv.appendChild(delivery1);
addressDiv.appendChild(delivery2);

///////////***************Company***********/

const companyDiv = createDiv("companyDiv");
companyDiv.className = 'field-group';
const companyTag = createLabel("", "Company Details")
companyTag.classList.add("labelclass");
const c1 = createLabel("", createSpan("", "", "Name:"));
const c1_in = createInput("text", "c1_in", "" );
const c2 = createLabel("", createSpan("", "", "VAT number:"));
const c2_in = createInput("text", "c2_in");
const c3 = createLabel("", createSpan("", "", "Contact Person:"));
const c3_in = createInput("text", "c3_in");
const c4 = createLabel("", createSpan("", "", "E-mail:"));
const c4_in = createInput("text", "c4_in");
const c5 = createLabel("", createSpan("", "", "Phone nr:"));
const c5_in = createInput("text", "c5_in");
companyDiv.appendChild(companyTag);
companyDiv.appendChild(createBr());
companyDiv.appendChild(c1);
companyDiv.appendChild(c1_in);
companyDiv.appendChild(createBr());
companyDiv.appendChild(c2);
companyDiv.appendChild(c2_in);
companyDiv.appendChild(createBr());
companyDiv.appendChild(c3);
companyDiv.appendChild(c3_in);
companyDiv.appendChild(createBr());
companyDiv.appendChild(c4);
companyDiv.appendChild(c4_in);
companyDiv.appendChild(createBr());
companyDiv.appendChild(c5);
companyDiv.appendChild(c5_in);
companyDiv.appendChild(createBr());
addressDiv.appendChild(companyDiv);

var paymentDiv = createDiv("paymentDiv");
paymentDiv.className = 'field-group';
var paymentTag = createLabel("paymentTag", "", "labelclass");
var p1_0 = createLabel("p1_0", createSpan("", "", "Payment term:"), "");
var p0_l = createLabel("p0_l", createSpan("", "", " "), "dummylabel");
var p1_l = createLabel("p1_l", createSpan("", "", "prepayment"), "payment_table");
var p1_in = createInput("checkbox", "p1_in", "Prepayment")
p1_in.checked = true;
p1_in.onclick = function() {
    paymentthis(this.id);
}
p1_in.setAttribute("value", "Prepayment");
var p2_l = createLabel("p2_l", createSpan("", "", "in 3 days"), "payment_table");
var p2_in = createInput("checkbox", "p2_in", "In 3 days");
p2_in.onclick = function() {
    paymentthis(this.id);
}
var p3_l = createLabel("p3_l", createSpan("", "", "in 5 days"), "payment_table");
var p3_in = createInput("checkbox", "p3_in", "In 5 days");
p3_in.onclick = function() {
    paymentthis(this.id);
}
var p4_l = createLabel("p4_l", createSpan("", "", "in 30 days"), "payment_tabel");
var p4_in = createInput("checkbox", "p4_in", "In 30 days");
p4_in.onclick = function() {
    paymentthis(this.id);
}
paymentDiv.appendChild(paymentTag);
paymentDiv.appendChild(p1_0);
paymentDiv.appendChild(p1_in);
paymentDiv.appendChild(p1_l);
paymentDiv.appendChild(createBr());
paymentDiv.appendChild(p0_l.cloneNode());
paymentDiv.appendChild(p2_in);
paymentDiv.appendChild(p2_l);
paymentDiv.appendChild(createBr());
paymentDiv.appendChild(p0_l.cloneNode());
paymentDiv.appendChild(p3_in);
paymentDiv.appendChild(p3_l);
paymentDiv.appendChild(createBr());
paymentDiv.appendChild(p0_l.cloneNode());
paymentDiv.appendChild(p4_in);
paymentDiv.appendChild(p4_l);
addressDiv.appendChild(paymentDiv);

///////////******************email********************//////////

var emailDiv = createDiv("emailDiv", "");
var sendemail = createButton("sendEmail", "Send request in email");
sendemail.className = "btn btn-primary btn-full";
sendemail.onclick = function() {
    sendtheemail();
}
emailDiv.appendChild(sendemail);
summaryCard.appendChild(emailDiv);

if (stepsCol && summaryCol) {
    stepsCol.appendChild(orderCard);
    stepsCol.appendChild(addressCard);
    summaryCol.appendChild(summaryCard);
} else {
    // Visszaesés a korábbi, közvetlenül a body-hoz fűzött elrendezésre,
    // ha az #rfqSteps/#rfqSummary konténerek valamiért hiányoznának.
    body.appendChild(orderCard);
    body.appendChild(addressCard);
    body.appendChild(summaryCard);
}
// A kosár tartalmát induláskor is megjelenítjük az összegző panelen
// (korábban csak a fejlécben lévő, külön "Requests: N" elemre kattintva
// töltődött be a lista) - lásd cart.js listrequest()/renderlist().
listrequest();

// Define your collapse function here
function collapse(id) {
    var ele = document.getElementById(id.replace("Head", ""));
    if (ele.style.display === "block") {
        ele.style.display = "none";
    } else {
        ele.style.display = "block";
    }
}
var i, a;
let tissueData = [];
let pliesData = [];
let diameterData = [];
let reelsData = [];
let ediameterData = [];
var xmlDoc, xmlDoc2 = "";
var pack1, pack2, totalTrucks, pertrack, TotalWeight = 0;
var x, y, o, weight_xml, tds_xml = "";
var quotatient = 0;
var weight, orderWeight, weight_t, w1, w2 = 0;
// Az utoljára megtalált, egyező TDS (Technical Data Sheet) rekord
// azonosítója (tds.tdsid) - a tdscheck() tölti fel, a cart.js
// requestforquote() olvassa ki a kosárba helyezéskor, ha a felhasználó
// elfogadta a javasolt TDS-t. Lásd: kod_atvilagitas_adatbazis.md, 1.6. pont.
var matchedTdsId = null;
// Az Ediameter legördülő opcióihoz tartozó súlyértékeket egy, az adott
// opció-értékhez kötött Map-ben tároljuk, nem egy a switch-ág
// mellékhatásaként beállított, törékeny globális változóban.
// Lásd: kod_atvilagitas_kliens.md, 2.3 pont.
const ediameterWeightMap = new Map();
//const form = createForm('formId', 'form-style-1', 'submit', 'post');
const form = createDiv("form");
form.className = 'fields-stack';
orderDiv.appendChild(form);
orderDiv.appendChild(orderBut);
const tissueDiv = createDiv('tissueDiv');
tissueDiv.className = 'field';
const tissueLabel = createLabel('tissuelbl', 'Tissues', 'labelclass');
const tissueSelect = createSelect('Tissue');
renderoptions("Tissue", "");
tissueSelect.setAttribute("onchange", "tissue_select_id()");
const optionsData = ['Option1', 'Option2']; // Example options data
//optionsData.forEach(optionValue => {
//    const option = createElement('option', {}, optionValue);
//    tissueSelect.appendChild(option);
//});

tissueDiv.appendChild(tissueLabel);
tissueDiv.appendChild(tissueSelect);

// Append to form or another container
form.appendChild(tissueDiv);

// A "Send request in email" gomb vizuálisan (és funkcionálisan) letiltott
// állapotba kerül, amíg a kosár üres - korábban a gomb mindig aktívnak
// tűnt, üres kosár mellett kattintva viszont a sendtheemail() belső
// "requestsnr > 0" feltétele miatt észrevétlenül nem történt semmi. Ezt a
// segédfüggvényt mindenhol meghívjuk, ahol a kosár darabszáma változik.
function updateSendButtonState() {
    const countEl = document.getElementById("requestsnr");
    const btn = document.getElementById("sendEmail");
    if (!countEl || !btn) {
        return;
    }
    const count = Number(countEl.textContent || countEl.innerHTML) || 0;
    btn.disabled = count === 0;
    btn.classList.toggle("btn-disabled", count === 0);
    btn.classList.toggle("btn-primary", count > 0);
}

async function rendercustomer() {
    try {
        const response = await fetch('/mw/{"head":"customer"}');
        const data = await checkResponse(response);
        //const data = JSON.parse(rawData.data); // Assuming the server response needs to be parsed as JSON
        document.getElementById("c1_in").value = data.data[0].customer_name;
        document.getElementById("c2_in").value = data.data[0].vat_number;
        document.getElementById("c3_in").value = data.data[0].contact_name;
        document.getElementById("c4_in").value = data.data[0].email;
        document.getElementById("c5_in").value = data.data[0].phone;
        document.getElementById("requestsnr").innerHTML = data.data2[0].count;
        updateSendButtonState();
    } catch (error) {
        Logger.error('Ügyféladatok betöltése sikertelen:', error);
        showMessage('Failed to load your customer details. Please reload the page.', 'error');
    }
}

async function renderoptions(n, where) {
    try {
        const response = await fetch('/mw/{"head":"option", "data":"' + n + '", "where":"' + where + '"}');
        const data = await checkResponse(response);
        time = Math.trunc(data.time / 1000);
        const selectElement = document.getElementById(n);
        var option = document.createElement('option');
        option.value = "Select";
        option.textContent = "Select";
        selectElement.appendChild(option);
        if (n === "Ediameter") {
            ediameterWeightMap.clear();
        }
        data.data.forEach(optionData => {
            option = document.createElement('option');
            switch (n) {
                case "Tissue":
                option.value = optionData.tissue;
                option.textContent = optionData.tissue;
                break;
                case "Plies":
                option.value = optionData.plie;
                option.textContent = optionData.plie;
                break;
                case "Grammatura":
                option.value = optionData.grammatura;
                option.textContent = optionData.grammatura + " gsm";
                break;
                case "Diameter":
                option.value = optionData.diameter;
                option.textContent = optionData.diameter + " mm";
                break;
                case "Reels":
                option.value = optionData.reel;
                option.textContent = optionData.reel + " cm";
                break;
                case "Ediameter":
                option.value = optionData.eheight + " cm (" + optionData.truck + " packs/truck)";
                option.textContent = optionData.eheight + " cm (" + optionData.truck + " packs/truck)";
                ediameterWeightMap.set(option.value, optionData.weight);
                break;
            }
            selectElement.appendChild(option);
        })
    } catch (error) {
        Logger.error('Opciók betöltése sikertelen (' + n + '):', error);
        showMessage('Failed to load the available options. Please reload the page.', 'error');
    }
}

function removeOptions(selectElement) {
    var i, L = selectElement.options.length - 1;
    for(i = L; i >= 0; i--) {
       selectElement.remove(i);
    }
 }

function renderSelects(name, where) {
    const div = createDiv(name + 'Div');
    div.className = 'field';
    const label = createLabel(name + 'Tag', name, 'labelclass');
    const select = createSelect(name);
    //const optionsData = ['Option1', 'Option2']; // Example options data
    //optionsData.forEach(optionValue => {
    //    const option = createElement('option', {}, optionValue);
    //    select.appendChild(option);
    //});
    select.setAttribute("onchange", name + "_select_id()");
    div.appendChild(label);
    div.appendChild(select);
    form.appendChild(div);
    removeOptions(document.getElementById(name));
    renderoptions(name, where);
}

function tissue_select_id() {
    remove_div("PliesDiv");
    remove_div("GrammaturaDiv");
    remove_div("DiameterDiv");
    remove_div("ReelsDiv");
    remove_div("ReelsTag2Div");
    remove_div("ReelsTag2Div");
    remove_div("EdiameterDiv");
    remove_div("certDiv");
    remove_div("weightDiv");
    remove_div("orderWeightDiv");
    remove_div("truckDiv")
    remove_div("weekDiv")
    renderSelects('Plies', "");
}

function Plies_select_id() {
    const w = document.getElementById("Tissue").value;
    remove_div("GrammaturaDiv");
    remove_div("DiameterDiv");
    remove_div("ReelsDiv");
    remove_div("ReelsTag2Div");
    remove_div("ReelsTag2Div");
    remove_div("EdiameterDiv");
    remove_div("certDiv");
    remove_div("weightDiv");
    remove_div("orderWeightDiv");
    remove_div("truckDiv")
    remove_div("weekDiv")
    renderSelects('Grammatura', w);
}

function Grammatura_select_id() {
    const w = document.getElementById("Plies").value;
    remove_div("DiameterDiv");
    remove_div("ReelsDiv");
    remove_div("ReelsTag2Div");
    remove_div("ReelsTag2Div");
    remove_div("EdiameterDiv");
    remove_div("certDiv");
    remove_div("weightDiv");
    remove_div("orderWeightDiv");
    remove_div("truckDiv")
    remove_div("weekDiv")
    renderSelects('Diameter', w);
}

function Diameter_select_id() {
    const w = document.getElementById("Tissue").value;
    remove_div("ReelsDiv");
    remove_div("ReelsTag2Div");
    remove_div("ReelsTag2Div");
    remove_div("EdiameterDiv");
    remove_div("certDiv");
    remove_div("weightDiv");
    remove_div("orderWeightDiv");
    remove_div("truckDiv")
    remove_div("weekDiv")
    renderSelects('Reels', w);
}

function Reels_select_id() {
    remove_div("reelsTag2Div");
    remove_div("EdiameterDiv");
    remove_div("certDiv");
    remove_div("weightDiv");
    remove_div("orderWeightDiv");
    remove_div("truckDiv")
    remove_div("weekDiv")
    let h = (document.getElementById("Reels").value).split(" ")[0];
    quotatient = Math.floor(280 / h);
    p = h * quotatient;
    const reelsTag2Div = createDiv('reelsTag2Div');
    reelsTag2Div.className = 'prompt-box';
    const reelsTag2 = createElement('label', { id: 'reelsTag2' },
        "Number of reels are in one pack: " + quotatient,
        createBr(),
        "Height of one pack: " + p,
        createBr(),
        "Is it passable?"
    );
    const b1 = createButton('b1', 'Yes', 'yes()', 'button');
    b1.className = "btn btn-primary";
    addEvent(b1, "click", () => yes());
    const b2 = createButton('b2', 'no', 'no()', 'button');
    b2.className = "btn btn-outline";
    addEvent(b2, "click", () => no());
    const reelsTag2Buttons = createDiv('', '', b2, b1);
    reelsTag2Buttons.className = 'button-row';
    reelsTag2Div.appendChild(createBr());
    reelsTag2Div.appendChild(reelsTag2);
    reelsTag2Div.appendChild(createBr());
    reelsTag2Div.appendChild(reelsTag2Buttons);
    document.getElementById("ReelsDiv").appendChild(reelsTag2Div);
}

function yes() {
    remove_element('b1');
    remove_element("b2");
    ediameter();
}

function no() {
    rdiv = document.getElementById("reelsTag2Div");
    rdiv.innerHTML = "";
    const label = createLabel('lbl', 'Set the maximum height');
    const input = createInput("input", 'heightOther', '', { type: "number" });
    input.onkeypress = function () {
        validate(event)
    };
    let b1 = document.createElement('button');
    b1.textContent = "Set";
    b1.setAttribute("id", "b3");
    b1.setAttribute("type", "button");
    b1.className = "btn btn-primary";
    b1.onclick = function () {
        set();
    }
    rdiv.appendChild(createBr());
    rdiv.appendChild(label);
    rdiv.appendChild(createBr());
    rdiv.appendChild(input);
    rdiv.appendChild(b1);
}

function set() {
    remove_div("EdiameterDiv");
    remove_div("reelsTag2");
    let h = (document.getElementById("Reels").value).split(" ")[0];
    let z = document.getElementById("heightOther").value;
    quotatient = Math.floor(z/h)
    p = h*quotatient
    let reelsTag2 = createElement('label', { id: 'reelsTag2' },
        "Number of reels are in one pack: " + quotatient,
        createBr(),
        "Height of one pack: " + p + " cm"
    );
    let div2 = document.getElementById("reelsTag2Div");
    div2.appendChild(reelsTag2);
    ediameter();
  }

function validate(evt) {
    var theEvent = evt || window.event;

    // Handle paste
    if (theEvent.type === 'paste') {
        key = event.clipboardData.getData('text/plain');
    } else {
    // Handle key press
        var key = theEvent.keyCode || theEvent.which;
        key = String.fromCharCode(key);
    }
    var regex = /[0-9]|\./;
    if( !regex.test(key) ) {
      theEvent.returnValue = false;
      if(theEvent.preventDefault) theEvent.preventDefault();
    }
  }

function ediameter() {
    remove_div("certDiv");
    remove_div("weightDiv");
    remove_div("orderweightDiv");
    remove_div("truckDiv")
    remove_div("weekDiv")
    const w = document.getElementById("Tissue").value;
    renderSelects('Ediameter', w);
}



function Ediameter_select_id(selectobject) {
    remove_div("certDiv");
    remove_div("weightDiv");
    remove_div("orderWeightDiv");
    remove_div("truckDiv")
    remove_div("weekDiv")
    const selectedEdiameter = document.getElementById("Ediameter").value;
    const selectedWeight = ediameterWeightMap.get(selectedEdiameter);
    if (selectedWeight === undefined) {
        Logger.error('Nem található súlyadat a kiválasztott Ediameter opcióhoz:', selectedEdiameter);
    }
    weight_t =  Math.floor(selectedWeight / 274) * document.getElementById("Reels").value.split(" ")[0];
    const label = createElement("label", {},
        "Expected weight of one reel: " + weight_t + " kg ",
        createBr(),
        "Expected weight of one pack: " + (weight_t * quotatient) + " kg",
        createBr(),
        "Is it OK?",
        createBr()
    );
    label.className = "lblweight";
    // A "No" gomb korábban ugyanazt az id="b4" azonosítót kapta, mint a
    // "Yes" gomb (feltehetően másolás-beillesztési hiba) - érvénytelen,
    // duplikált HTML id-t eredményezve. A kattintás-eseménykezelők
    // (addEvent) a DOM-elem-referenciára, nem az id-re épülnek, ezért ez
    // egérrel kattintva nem okozott hibás viselkedést, de bármely
    // id-alapú hivatkozás (pl. teszt-automatizálás, kisegítő lehetőségek)
    // a két gomb közül a DOM-ban elsőként szereplőt (a "No" gombot)
    // találta volna meg "b4" néven. Javítva: saját, egyedi id.
    const b4 = createButton('b4', 'Yes', '', 'button');
    b4.className = "btn btn-primary";
    addEvent(b4, "click", () => weightyes());
    const b5 = createButton('b5', 'No', '', 'button');
    b5.className = "btn btn-outline";
    addEvent(b5, "click", () => weightno());
    const weightButtons = createDiv('', '', b5, b4);
    weightButtons.className = 'button-row';
    const div = createDiv("weightDiv");
    div.className = 'prompt-box';
    div.appendChild(label);
    div.appendChild(weightButtons);
    form.appendChild(div);
}

function weightno() {
    remove_element('weightDiv');
    remove_element("orderweightDiv");
    remove_element("truckDiv")
    remove_element("weekDiv")
    pack1 = Math.floor(quotatient / 2);
    pack2 = quotatient - pack1;
    w1 = Math.floor((weight_t / quotatient) * pack1);
    w2 = weight_t - w1;
    const label = createElement("label", {},
        "Instead of the original " + quotatient + " reels/pack, we recommend:",
        createBr(),
        pack1 + "+" + pack2 + " reels/pack.",
        createBr(),
        "The expected weight of the packages: " + w1 + "+" + w2 + " kg.",
        createBr()
    );
    label.className = "lblweight";
    const b6 = createButton('b6', 'Yes', '', 'button');
    b6.className = "btn btn-primary";
    addEvent(b6, "click", () => weight_2nd_yes());
    const b7 = createButton('b7', 'No', '', 'button');
    b7.className = "btn btn-outline";
    addEvent(b7, "click", () => weight_2nd_no());
    const div2 = createDiv("buttonDiv");
    div2.className = 'button-row';
    const div = createDiv("weightDiv");
    div.className = 'prompt-box';
    div.appendChild(label);
    div2.appendChild(b7);
    div2.appendChild(b6);
    div.appendChild(div2);
    form.appendChild(div);
}

function weight_2nd_no() {
    remove_element("weightDiv");
    remove_element("EdiameterDiv");
    remove_element("reelsTagDiv");
    remove_element("reelsTag2Div");
    remove_element("orderweightDiv");
    remove_element("truckDiv")
    remove_element("weekDiv")
    const label = createElement("label", { id: "reelsTag2" },
        createBr(),
        "please decrease the height of the reels or the core height!"
    );
    const div = createDiv("reelsTag2Div");
    div.appendChild(label);
    document.getElementById("ReelsDiv").appendChild(div);
    document.getElementById("Reels")[0].selected = true;
}
function weight_2nd_yes() {
    weightyes();
    const weightDiv = document.getElementById("weightDiv");
    weightDiv.innerHTML = "";
    const label = createElement("label", {},
        "Expected weight of the reels: " + w1 + " + " + w2 + " kg",
        createBr(),
        "Expected weight of the packs: " + (w1 * pack1) + " + " + (w2 * pack2) + " kg"
    );
    weightDiv.appendChild(label);
}

function weightyes() {
    const weightDiv = document.getElementById("weightDiv");
    weightDiv.innerHTML = "";
    const summaryLabel = createElement("label", {},
        "Expected weight of one reel: " + weight_t + " kg",
        createBr(),
        "Expected weight of one pack: " + (weight_t * quotatient) + " kg"
    );
    weightDiv.appendChild(summaryLabel);
    const label1 = createLabel("", "Cerification");
    const cert1lbl = createLabel("", "FSC needed");
    const cert2lbl = createLabel("", "No needs for FSC");
    cert1lbl.setAttribute("for", "cert1");
    cert2lbl.setAttribute("for", "cert2");
    const cert1 = createInput('checkbox', "cert1", "yes");
    const cert2 = createInput('checkbox', "cert2", "no");
    cert2.checked = true;
    cert1.onclick = function () {
        selectthis(this.id);
    }
    cert2.onclick = function () {
        selectthis(this.id);
    }
    const div = createDiv("certDiv");
    div.className = 'prompt-box';
    const tds_div = createDiv("tds_div");
    const orderWeightDiv = createDiv("orderWeightDiv");
    orderWeightDiv.className = 'field';
    const label = createLabel("orderWeightlbl", "Needs in ton: ");
    const orderWeightNum = createInput("input", "orderWeightNum");
    orderWeightNum.onkeyup = function () {
        set_orderweight();
    }
    orderWeightNum.setAttribute("type", "number");
    orderWeightNum.classList.add("orderWeightNum_class");
    div.appendChild(label1);
    div.appendChild(createBr());
    div.appendChild(cert1);
    div.appendChild(cert1lbl);
    div.appendChild(createBr());
    div.appendChild(cert2);
    div.appendChild(cert2lbl);
    div.appendChild(tds_div);
    form.appendChild(div);
    orderWeightDiv.appendChild(label);
    orderWeightDiv.appendChild(orderWeightNum);
    form.appendChild(orderWeightDiv);
}
function selectthis(id) {
    for (var i = 1; i < 3; i++) {
        document.getElementById("cert" + i).checked = false;
    }
    document.getElementById(id).checked = true;
    tdscheck();
}
/**
 * Performs a TDS (Technical Data Sheet) check by sending a POST request to the server.
 * Retrieves the user input values from the HTML form and sends them as JSON data.
 * If a matching TDS is found, it dynamically generates HTML elements to display the TDS information.
 */
function tdscheck() {
    const _tissue= document.getElementById("Tissue").value;
    const _plies = document.getElementById("Plies").value;
    const _grammatura = document.getElementById("Grammatura").value;
    const _diameter = document.getElementById("Diameter").value;
    const _reels = document.getElementById("Reels").value;
    const _ediameter = (document.getElementById("Ediameter").value).split(" ")[0];
    let _fsc = "";
    for (let i=1; i<3; i++) {
        if (document.getElementById("cert"+i).checked == true) {
            _fsc = document.getElementById("cert"+i).value;
        }
    }
    const data = {
        head: "tdscheck",
        data: {
            itemtype: _tissue,
            plies: _plies,
            height: _reels,
            grammatura: _grammatura,
            diameter: _diameter,
            ediameter: _ediameter,
            fsc: _fsc
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
        // A szerver válasza { message, data: [...] } alakú (lásd app.js
        // checkTDS/"tdscheck" ág) - a korábbi data.counter.rowCount/
        // data.counter.rows[0] hivatkozás nem létező mezőre mutatott, ezért
        // a TDS-egyezés kliensoldalon soha nem jelent meg (a .catch mindig
        // "Failed to check..." hibaüzenetet adott vissza). Lásd:
        // kod_atvilagitas_adatbazis.md.
        document.getElementById("tds_div").innerHTML = "";
        matchedTdsId = null;
        if (data.data && data.data.length > 0) {
            var tdslbldiv = createDiv("tdslbldiv");
            const sku = data.data[0].sku;
            matchedTdsId = data.data[0].tdsid;
            const tdsLink = document.createElement("a");
            tdsLink.setAttribute("target", "blank");
            // A sku értéket URL-komponensként escapeljük, hogy egy benne lévő
            // vezérlő-/idézőjel karakter se törhessen ki a href attribútumból.
            tdsLink.href = "/assets/TDS/TDS_" + encodeURIComponent(sku) + ".pdf";
            tdsLink.textContent = "Click here!";
            var tdslbl = createElement("label", {},
                "We found a technical data sheet what meet your request.",
                createBr(),
                tdsLink,
                createBr(),
                "Is it passable for you?",
                createBr()
            );
            document.getElementById("tds_div").appendChild(tdslbl)
            var tds_in1 = createInput("checkbox", "tds_in1", "yes");
            var tds_in2 = createInput("checkbox", "tds_in2", "no");
            var tds_in1lbl = createLabel("tds_in1", "yes");
            var tds_in2lbl = createLabel("tds_in2", "no");
            tds_in1lbl.setAttribute("id", "tds_in1lbl");
            tds_in2lbl.setAttribute("id", "tds_in2lbl");
            tds_in1.setAttribute("name", "tds_values");
            tds_in1.checked = true;
            tds_in1.onclick = function() {
                tdscheckin(this.id);
            }
            tds_in2.setAttribute("name", "tds_values");
            tds_in2.onclick = function() {
                tdscheckin(this.id);
            }
            tdslbldiv.appendChild(tds_in1lbl);
            tdslbldiv.appendChild(tds_in1);
            tdslbldiv.appendChild(tds_in2lbl);
            tdslbldiv.appendChild(tds_in2);
            var textarea = document.createElement("textarea");
            textarea.setAttribute("id", "comments");
            textarea.setAttribute("rows", "4");
            textarea.setAttribute("cols", "50");
            var textarealbl = createLabel("", "Comments");
            tdslbldiv.appendChild(createBr());
            tdslbldiv.appendChild(textarealbl);
            tdslbldiv.appendChild(textarea);
            document.getElementById("tds_div").appendChild(tdslbldiv)
        }
      })
      .catch(error => {
        Logger.error('TDS ellenőrzés sikertelen:', error);
        showMessage('Failed to check the technical data sheet. Please try again.', 'error');
      });
}
function set_orderweight() {
    if (document.getElementById("trucklbl")) {
        TotalWeight_calc();
        document.getElementById("trucklbl").innerHTML = "Expected number of trucks: " + totalTrucks;
    } else {
        TotalWeight_calc();
        const div = createDiv("truckDiv");
        div.className = 'prompt-box';
        const label = createLabel("trucklbl", "Expected number of trucks: " + totalTrucks);
        div.appendChild(label);
        form.appendChild(div);
    }
    remove_element("weekDiv")
    requested_week();
    window.scrollTo(0, document.body.scrollHeight);
}
/**
 * Calculates the total weight and number of trucks required for an order.
 * @returns {void}
 */
function TotalWeight_calc() {
    let total = document.getElementById("Ediameter").value;
    pertrack = ((total.split(" "))[2]).slice(1);
    TotalWeight = document.getElementById("orderWeightNum").value * 1000;
    totalTrucks = Math.ceil((TotalWeight / (weight_t * quotatient)) / pertrack);
}

function requested_week() {
    const div = createDiv("weekDiv");
    div.className = 'field';
    const label = createLabel("weeklbl", "Requested week of transport");
    const weekNum = createInput("input", "weekNum");
    weekNum.onkeypress = function () {
        validate(event);
    }
    weekNum.onkeyup = function () {

    }
    weekNum.setAttribute("type", "number");
    weekNum.classList.add("orderWeightNum_class");
    div.appendChild(label);
    div.appendChild(weekNum);
    form.appendChild(div);
}

function  tdscheckin(id) {
    for (var i = 1;i < 3; i++)
    {
        document.getElementById("tds_in" + i).checked = false;
    }
    document.getElementById(id).checked = true;
}
