function requestforquote() {
    let tds
    let tissue_value = document.getElementById("Tissue").value;
    let plies_value = document.getElementById("Plies").value;
    let grammatura_value = document.getElementById("Grammatura").value;
    if (grammatura_value == "other") {
        grammatura_value = document.getElementById("grammaturaOther").value;
    }
    let diameter_value = document.getElementById("Diameter").value;
    let reels_value = document.getElementById("Reels").value;
    let quotatient_value = quotatient; /* a tekercsek száma egy csomagban*/
    let ediameter_value = document.getElementById("Ediameter").value;
    let certification_value = "";
    for (let i = 1; i < 3; i++) {
        if (document.getElementById("cert" + i).checked == true) {
            certification_value = document.getElementById("cert" + i).value;
        }
    }
    let orderWeightNum_value = document.getElementById("orderWeightNum").value;
    let weekNum_value = document.getElementById("weekNum").value;
    let tdscheckvalue = "";
    let comments = "";
    if (document.getElementById("tds_in1")) {
        if (document.getElementById("tds_in1").checked == true) {
            tdscheckvalue = document.getElementById("tds_in1").value;
            comments = document.getElementById("comments").value;
        } else {
            tdscheckvalue = document.getElementById("tds_in2").value;
            comments = document.getElementById("comments").value;
        }
    }

    const data = {
        head: "cart",
        data: {
            tissue: tissue_value,
            plies: plies_value,
            grammatura: grammatura_value,
            diameter: diameter_value,
            reels: reels_value,
            quotatient: quotatient_value,
            orderweight: orderWeightNum_value,
            ediameter: ediameter_value,
            certification: certification_value,
            weeknum: weekNum_value,
            tds: tdscheckvalue,
            comment: comments
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
            console.log('Success:', data.message);
            document.getElementById("requestsnr").innerHTML = data.counter
        })
        .catch(error => console.error('Error:', error));
}


function listrequest() {
    const data = {
        head: "cartlist"
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
            renderlist(data.data);
        })
        .catch(error => console.error('Error:', error));

}

/**
 * Egy kosártétel egy sorát (pl. "Tissue: XY") építi fel biztonságosan,
 * DOM-elemekből - nem HTML-string összefűzéssel. Az item.* mezők a
 * felhasználó saját, korábban beküldött adatai (pl. a "Megjegyzés" mező
 * szabad szöveg), ezért escapelés nélküli innerHTML-be írásuk tárolt
 * XSS-t jelentett. Lásd: kod_atvilagitas_kliens.md, 1.1 pont.
 */
function createFieldRow(labelText, value, extraValueClass) {
    const labelSpan = createSpan('', 'requestspan', labelText);
    const valueClass = extraValueClass ? 'requestvaluespan ' + extraValueClass : 'requestvaluespan';
    const valueSpan = createSpan('', valueClass, value === null || value === undefined ? '' : String(value));
    return createElement('label', {}, labelSpan, valueSpan);
}

function renderlist(cartlist) {
    let ele2 = document.getElementById("requestsDiv")
    ele2.innerHTML = "";
    cartlist.forEach((item) => {
        let div = createDiv(item.cartid + "-div", "listrequestdiv")
        let lbl1 = createFieldRow("Tissue: ", item.tissue);
        lbl1.className = "reqestslbl";
        let lbl2 = createFieldRow("Plies: ", item.plies);
        lbl2.className = "requestlbl";
        let lbl3 = createFieldRow("Grammatura: ", item.grammatura);
        lbl3.className = "requestlbl";
        let lbl4 = createFieldRow("Diameter: ", item.diameter);
        lbl4.className = "requestlbl";
        let lbl5 = createFieldRow("Reels: ", item.reels);
        lbl5.className = "requestlbl";
        let lbl6 = createFieldRow("Nr. the reels in 1 pack:: ", item.quotatient);
        lbl6.className = "requestlbl";
        let lbl7 = createFieldRow("Core height: ", item.ediameter);
        lbl7.className = "requestlbl";
        let lbl8 = createFieldRow("Certification needed: ", item.certification);
        lbl8.className = "requestlbl";
        let lbl9 = createFieldRow("Requested weight: ", item.orderweight);
        lbl9.className = "requestlbl";
        let lbl10 = createFieldRow("Requested week: ", item.weeknum);
        lbl10.className = "requestlbl";
        let lbl11 = null;
        let txt01 = null;
        if (item.tds != "") {
            lbl11 = createFieldRow("Accepable TDS: ", item.tds);
            lbl11.className = "requestlbl";
        }
        if (item.comment != "") {
            txt01 = createFieldRow("Accepable TDS: ", item.comment, "tds_comment");
            txt01.className = "requestlbl";
        }
        let remdiv = document.createElement("div");
        remdiv.classList.add("remdiv");
        const remSpan = createSpan('', 'remdivspan', 'REMOVE');
        addEvent(remSpan, "click", () => removefromcart(item.cartid));
        remdiv.appendChild(remSpan);
        div.appendChild(remdiv);
        div.appendChild(lbl1);
        div.appendChild(createBr());
        div.appendChild(lbl2);
        div.appendChild(createBr());
        div.appendChild(lbl3);
        div.appendChild(createBr());
        div.appendChild(lbl4);
        div.appendChild(createBr());
        div.appendChild(lbl5);
        div.appendChild(createBr());
        div.appendChild(lbl6);
        div.appendChild(createBr());
        div.appendChild(lbl7);
        div.appendChild(createBr());
        div.appendChild(lbl8);
        div.appendChild(createBr());
        div.appendChild(lbl9);
        div.appendChild(createBr());
        div.appendChild(lbl10);
        div.appendChild(createBr());
        if (item.tds != "") {
            div.appendChild(lbl11);
            div.appendChild(createBr());
        }
        if (item.comment != "") {
            div.appendChild(txt01);
            div.appendChild(createBr());
        }
        ele2.appendChild(div);
    });
    if (ele2.style.display == "none") {
        ele2.style.display = "block";
    }
}

function removefromcart(cartid) {
    const data = {
        head: "removecart",
        data: cartid
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
            document.getElementById("requestsnr").innerHTML = data.counter;
            listrequest();
        })
        .catch(error => console.error('Error:', error));

}

function sendtheemail() {

    if (document.getElementById("requestsnr").innerHTML > 0) {
        // A kötelező mezők ellenőrzése: korábban egy "z" számláló minden
        // mezőnél feltétel nélkül nőtt, ezért a validáció ténylegesen sosem
        // akadályozta meg a küldést. Most egy explicit hiányzó-mezők listát
        // gyűjtünk össze, és csak akkor folytatjuk, ha üres.
        // Lásd: kod_atvilagitas_kliens.md, 2.1 pont.
        const requiredFields = [
            { id: "c1_in", label: "Name" },
            { id: "d2_in", label: "Country" },
            { id: "d3_in", label: "Postal code" },
            { id: "d4_in", label: "Address" },
            { id: "c2_in", label: "VAT" },
            { id: "c3_in", label: "Contact person" },
            { id: "c4_in", label: "Email" },
            { id: "c5_in", label: "Phone" }
        ];
        const missingFields = requiredFields.filter(f => document.getElementById(f.id).value === "");
        if (missingFields.length > 0) {
            alert("The following field(s) cannot be empty: " + missingFields.map(f => f.label).join(", "));
            return;
        }

        const from = document.getElementById("c1_in").value;
        const vat_val = document.getElementById("c2_in").value;
        const contact_val = document.getElementById("c3_in").value;
        const email_val = document.getElementById("c4_in").value;
        const phone_val = document.getElementById("c5_in").value;
        const country_val = document.getElementById("d2_in").value;
        const postal_val = document.getElementById("d3_in").value;
        const adress_val = document.getElementById("d4_in").value;

        var par = "";
        if (document.getElementById("parity1").checked == true) {
            par = document.getElementById("parity1").value;
        } else {
            par = document.getElementById("parity2").value;
        }
        var transport_cost = "";
        if (document.getElementById("trcost").checked == true) {
            transport_cost = "yes";
        } else {
            transport_cost = "no";
        }
        var payment_val = "";
        for (var i = 1; i < 5; i++) {
            if (document.getElementById("p" + i + "_in").checked == true) {
                payment_val = document.getElementById("p" + i + "_in").value;
            }
        }

        var res = confirm("Are you sure you want to send the RFQ?");
        if (res == true) {
            var html = "";
            // A form mezőinek értékét escapeHtml()-en átfuttatva fűzzük a
            // kimenő e-mail HTML törzsébe, hogy egy oda beírt <script>/HTML
            // töredék ne kerülhessen be escapelés nélkül az üzemeltetőnek
            // kiküldött levélbe. Lásd: kod_atvilagitas_kliens.md, 1.2 pont.
            var mailbody = '<div style="display: block; margin-bottom: 20px"><div><div style="font-size:22px">Request for Quote </div>' +
                '<br><lbl><span style="display: inline-block;width: 180px; font-weight: bold; font-size="18px">Company </span></lbl><br>' +
                '<lbl><span style="display: inline-block;width: 180px;">Company Name: </span><span>' + escapeHtml(from) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">VAT Number: </span><span>' + escapeHtml(vat_val) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Contact Person: </span><span>' + escapeHtml(contact_val) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Email: </span><span>' + escapeHtml(email_val) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Phone number: </span><span>' + escapeHtml(phone_val) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;"></span><span></span></lbl><br>' +
                '<br><lbl><span style="display: inline-block;width: 180px; font-weight: bold; font-size="18px">Delivery Address </span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Country: </span><span>' + escapeHtml(country_val) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Postal Code: </span><span>' + escapeHtml(postal_val) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Address: </span><span>' + escapeHtml(adress_val) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Parity: </span><span>' + escapeHtml(par) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Transpor cost requested: </span><span>' + escapeHtml(transport_cost) + '</span></lbl>' +
                '<br><lbl><span style="display: inline-block;width: 180px;">Payment term: </span><span>' + escapeHtml(payment_val) + '</span></lbl>' +
                '<br></div></div>'
            const data = {
                head: "order"
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
                    var cartlist = data.data;
                    cartlist.forEach((item) => {
                        html = '<div style="display: block;margin-bottom: 20px"><div>' +
                            '<lbl><span style="display: inline-block;width: 180px;">Tissue: </span><span>' + escapeHtml(item.tissue) + '</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Plies: </span><span>' + escapeHtml(item.plies) + '</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Grammatura: </span><span>' + escapeHtml(item.grammatura) + '</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Diameter: </span><span>' + escapeHtml(item.diameter) + '</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Reels: </span><span>' + escapeHtml(item.reels) + '</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Nr. the reels in 1 pack: </span><span>' + escapeHtml(item.quotatient) + '</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Core height: </span><span>' + escapeHtml(item.ediameter) + '</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Certification needed: </span><span>' + escapeHtml(item.certification) + '</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Requested weight: </span><span>' + escapeHtml(item.orderweight) + ' ton(s)</span></lbl>' +
                            '<br><lbl><span style="display: inline-block;width: 180px;">Requested week: </span><span>' + escapeHtml(item.weeknum) + '</span></lbl><br></div></div>';
                        mailbody += html;

                    })
                    //set the parameter as per you template parameter[https://dashboard.emailjs.com/templates]
                    var templateParams = {
                        to_name: 'Bodnár István',
                        from_name: from,
                        my_html: mailbody
                    };
                    (function () {
                        emailjs.init("2IULQU1dR18iim7yH"); // Az EmailJS "user id"-je nyilvános kulcs jellegű, kliensoldalon
                        // szándékosan látható - a visszaélés elleni védelem az EmailJS
                        // dashboardján beállítható domain-korlátozással/rate-limit-tel
                        // biztosítandó, nem a kód elrejtésével.
                    })();
                    emailjs.send('service_uux90vr', 'template_8l2zxst', templateParams)
                        .then(function (response) {
                            const data = {
                                head: "removeall"
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

                                })
                                .catch(error => console.error('Error:', error));
                            alert('Your request has been sent!');
                            document.getElementById("requestsnr").innerHTML = "0";
                            document.getElementById('Tissue').value = "Select"
                            const parentDiv = document.getElementById('form');
                            const elementToKeep = document.getElementById('tissueDiv');
                            while (parentDiv.firstChild) {
                                parentDiv.removeChild(parentDiv.firstChild);
                            }
                            parentDiv.appendChild(elementToKeep);
                        }, function (error) {
                            console.error('EmailJS send failed:', error);
                            alert('FAILED to send the request. Please try again.');
                        });
                })
                .catch(error => console.error('Error:', error));
        }
    }

}