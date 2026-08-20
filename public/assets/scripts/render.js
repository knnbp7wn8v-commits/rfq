rendercustomer();
function createElement(type, attributes, ...children) {
    const element = document.createElement(type);
    for (const key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
    children.forEach(child => {
        if (typeof child === "string") {
            element.innerHTML += child;
        } else {
            element.appendChild(child);
        }
    });
    return element;
}

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
addEvent(orderBut, "click", () => requestforquote());
document.body.appendChild(orderBut);

function addEvent(element, eventType, handler) {
    element.addEventListener(eventType, handler);
}

const body = document.body;

const orderDivHeadTitle = createSpan("orderDivHeadTitle", "divTitle", "Products");
const orderDivHead = createDiv("orderDivHead", "cursor: pointer;", orderDivHeadTitle);
addEvent(orderDivHead, "click", () => collapse(orderDivHead.id));

const addressDivTitle = createSpan("addressDivTitle", "divTitle", "Address");
const addressDivHead = createDiv("addressDivHead", "cursor: pointer;", addressDivTitle);
addEvent(addressDivHead, "click", () => collapse(addressDivHead.id));

const requestsDivHeadTitle = createSpan("requestsDivHeadTitle", "divTitle", "Requests");
const requestDivHead = createDiv("requestsDivHead", "cursor: pointer;", requestsDivHeadTitle);
addEvent(requestDivHead, "click", () => collapse(requestDivHead.id));

const addressDiv = createDiv("addressDiv", "display:none");
const orderDiv = createDiv("orderDiv", "display:block");
const requestsDiv = createDiv("requestsDiv", "display:none");

// Repeat for other elements as needed




const parityDiv = createDiv("parityDiv");
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
const d1_label = createLabel("", "Delivery Address");
delivery1.appendChild(d1_label);
const d2_label = createLabel("", "<span>Country:</span>");
const d2_in = createInput("text", "d2_in");
const d3_label = createLabel("", "<span>Postal Code:</span>");
const d3_in = createInput("text", "d3_in");
const d4_label = createLabel("", "<span>Address:</span>");
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
const companyTag = createLabel("", "Company Details")
companyTag.classList.add("labelclass");
const c1 = createLabel("", "<span>Name:</span>");
const c1_in = createInput("text", "c1_in", "" );
const c2 = createLabel("", "<span>VAT number:</span>");
const c2_in = createInput("text", "c2_in");
const c3 = createLabel("", "<span>Contact Person:</span>");
const c3_in = createInput("text", "c3_in");
const c4 = createLabel("", "<span>E-mail:</span>");
const c4_in = createInput("text", "c4_in");
const c5 = createLabel("", "<span>Phone nr:</span>");
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
var paymentTag = createLabel("paymentTag", "", "labelclass");
var p1_0 = createLabel("p1_0", "<span>Payment term:</span>", "");
var p0_l = createLabel("p0_l", "<span> </span>", "dummylabel");
var p1_l = createLabel("p1_l", "<span>prepayment</span>", "payment_table");
var p1_in = createInput("checkbox", "p1_in", "Prepayment")
p1_in.checked = true;
p1_in.onclick = function() {
    paymentthis(this.id);
}
p1_in.setAttribute("value", "Prepayment");
var p2_l = createLabel("p2_l", "<span>in 3 days</span>", "payment_table");
var p2_in = createInput("checkbox", "p2_in", "In 3 days");
p2_in.onclick = function() {
    paymentthis(this.id);
}
var p3_l = createLabel("p3_l", "<span>in 5 days</span>", "payment_table");
var p3_in = createInput("checkbox", "p3_in", "In 5 days");
p3_in.onclick = function() {
    paymentthis(this.id);
}
var p4_l = createLabel("p4_l", "<span>in 30 days</span>", "payment_tabel");
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

var emailDiv = createDiv("emailDiv", "display:block");
//emailDiv.setAttribute("style", "display:block");
var sendemail = createButton("sendEmail", "Send request in email");
sendemail.onclick = function() {
    sendtheemail();
}
emailDiv.appendChild(sendemail);
body.appendChild(orderDivHead);
body.appendChild(orderDiv);
body.appendChild(addressDivHead);
body.appendChild(addressDiv);
body.appendChild(requestDivHead);
body.appendChild(requestsDiv);
body.appendChild(emailDiv);

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
//const form = createForm('formId', 'form-style-1', 'submit', 'post');
const form = createDiv("form");
orderDiv.appendChild(form);
orderDiv.appendChild(orderBut);
const tissueDiv = createDiv('tissueDiv');
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
tissueDiv.appendChild(createBr());
tissueDiv.appendChild(tissueSelect);

// Append to form or another container
form.appendChild(tissueDiv);

async function rendercustomer() {
    const response = await fetch('/mw/{"head":"customer"}');
    const data = await response.json();
    //const data = JSON.parse(rawData.data); // Assuming the server response needs to be parsed as JSON
    document.getElementById("c1_in").value = data.data[0].customer_name;
    document.getElementById("c2_in").value = data.data[0].vat_number;
    document.getElementById("c3_in").value = data.data[0].contact_name;
    document.getElementById("c4_in").value = data.data[0].email;
    document.getElementById("c5_in").value = data.data[0].phone;
    document.getElementById("requestsnr").innerHTML = data.data2[0].count;
}

async function renderoptions(n, where) {
    const response = await fetch('/mw/{"head":"option", "data":"' + n + '", "where":"' + where + '"}');
    const data = await response.json();
    time = Math.trunc(data.time / 1000);
    const selectElement = document.getElementById(n);
    var option = document.createElement('option');
    option.value = "Select";
    option.textContent = "Select";
    selectElement.appendChild(option);
    data.data.forEach(optionData => {
        option = document.createElement('option');
        switch (n) {
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
            weight = optionData.weight;
            break;
        }
        selectElement.appendChild(option);
    })
}

function removeOptions(selectElement) {
    var i, L = selectElement.options.length - 1;
    for(i = L; i >= 0; i--) {
       selectElement.remove(i);
    }
 }

function renderSelects(name, where) {
    const div = createDiv(name + 'Div');
    const label = createLabel(name + 'Tag', name, 'labelclass');
    const select = createSelect(name);
    //const optionsData = ['Option1', 'Option2']; // Example options data
    //optionsData.forEach(optionValue => {
    //    const option = createElement('option', {}, optionValue);
    //    select.appendChild(option);
    //});
    select.setAttribute("onchange", name + "_select_id()");
    div.appendChild(label);
    div.appendChild(createBr());
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
    const reelsTag2 = createLabel('reelsTag2', "Number of reels are in one pack: " + quotatient + "</br>Height of one pack: " + p + "</br>Is it passable?", "</br>");
    const b1 = createButton('b1', 'Yes', 'yes()', 'button');
    addEvent(b1, "click", () => yes());
    const b2 = createButton('b2', 'no', 'no()', 'button');
    addEvent(b2, "click", () => no());
    reelsTag2Div.appendChild(createBr());
    reelsTag2Div.appendChild(reelsTag2);
    reelsTag2Div.appendChild(createBr());
    reelsTag2Div.appendChild(b2);
    reelsTag2Div.appendChild(b1);
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
    b1.innerHTML = "Set";
    b1.setAttribute("id", "b3");
    b1.setAttribute("type", "button");
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
    let br = document.createElement("br");
    let reelsTag2 = document.createElement('label');
    let div2 = document.getElementById("reelsTag2Div");
    reelsTag2.innerHTML = "Number of reels are in one pack: " + quotatient + "</br>Height of one pack: " + p + " cm" ;
    reelsTag2.setAttribute("id", "reelsTag2");
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
    weight_t =  Math.floor(weight / 274) * document.getElementById("Reels").value.split(" ")[0];
    const label = createLabel("", "Expected weight of one reel: " + weight_t + " kg </br>Expected weight of one pack: " + weight_t * quotatient + " kg<br>Is it OK?<br>", "lblweight");
    const b4 = createButton('b4', 'Yes', '', 'button');
    addEvent(b4, "click", () => weightyes());
    const b5 = createButton('b4', 'No', '', 'button');
    addEvent(b5, "click", () => weightno());
    const div = createDiv("weightDiv");
    div.appendChild(label);
    div.appendChild(b5);
    div.appendChild(b4);
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
    const label = createLabel("", "Instead of the original " + quotatient + " reels/pack, we recommend:</br>" + pack1 + "+" + pack2 + " reels/pack. </br>The expected weight of the packages: " + w1 + "+" + w2 + " kg.</br>", "lblweight");
    const b6 = createButton('b6', 'Yes', '', 'button');
    addEvent(b6, "click", () => weight_2nd_yes());
    const b7 = createButton('b7', 'No', '', 'button');
    addEvent(b7, "click", () => weight_2nd_no());
    const div2 = createDiv("buttonDiv");
    const div = createDiv("weightDiv");
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
    const label = createLabel("reelsTag2", "</br>please decrease the height of the reels or the core height!", "");
    const div = createDiv("reelsTag2Div");
    div.appendChild(label);
    document.getElementById("ReelsDiv").appendChild(div);
    document.getElementById("Reels")[0].selected = true;
}
function weight_2nd_yes() {
    weightyes();
    document.getElementById("weightDiv").innerHTML = "<label>Expected weight of the reels: " + w1 + " + " + w2 + " kg<br>Expected weight of the packs: " + w1 * pack1 + " + " + w2 * pack2 + " kg";
}

function weightyes() {
    document.getElementById("weightDiv").innerHTML = "<label>Expected weight of one reel: " + weight_t + " kg<br>Expected weight of one pack: " + weight_t * quotatient + " kg";
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
    const tds_div = createDiv("tds_div");
    const orderWeightDiv = createDiv("orderWeightDiv");
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
    for (i=1; i<3; i++) {
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
      .then(response => response.json())
      .then(data => {
        if (data.counter.rowCount > 0) {
            document.getElementById("tds_div").innerHTML = "";
            var tdslbldiv = createDiv("tdslbldiv");
            var tdslbl = createLabel("", "We found a technical data sheet what meet your request.<br><a target='blank' href='/assets/TDS/TDS_" + data.counter.rows[0].sku + ".pdf' >Click here!</a><br>Is it passable for you?<br>");
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
      .catch(error => console.error('Error:', error));
}
function set_orderweight() {
    if (document.getElementById("trucklbl")) {
        TotalWeight_calc();
        document.getElementById("trucklbl").innerHTML = "Expected number of trucks: " + totalTrucks;
    } else {
        TotalWeight_calc();
        const div = createDiv("truckDiv");
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