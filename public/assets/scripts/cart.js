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
    for (i = 1; i < 3; i++) {
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
        .then(response => response.json())
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
        .then(response => response.json())
        .then(data => {
            renderlist(data.data);
        })
        .catch(error => console.error('Error:', error));

}

function renderlist(cartlist) {
    let ele2 = document.getElementById("requestsDiv")
    ele2.innerHTML = "";
    cartlist.forEach((item) => {
        let div = createDiv(item.cartid + "-div", "listrequestdiv")
        let lbl1 = createLabel("lbl1", "<span class='requestspan'>Tissue: </span><span class='requestvaluespan'>" + item.tissue + "</span>", "reqestslbl");
        let lbl2 = createLabel("lbl2", "<span class='requestspan'>Plies: </span><span class='requestvaluespan'>" + item.plies + "</span>", "requestlbl");
        let lbl3 = createLabel("lbl3", "<span class='requestspan'>Grammatura: </span><span class='requestvaluespan'>" + item.grammatura + "</span>", "requestlbl");
        let lbl4 = createLabel("lbl4", "<span class='requestspan'>Diameter: </span><span class='requestvaluespan'>" + item.diameter + "</span>", "requestlbl");
        let lbl5 = createLabel("lbl5", "<span class='requestspan'>Reels: </span><span class='requestvaluespan'>" + item.reels + "</span>", "requestlbl");
        let lbl6 = createLabel("lbl5", "<span class='requestspan'>Nr. the reels in 1 pack:: </span><span class='requestvaluespan'>" + item.quotatient + "</span>", "requestlbl");
        let lbl7 = createLabel("lbl5", "<span class='requestspan'>Core height: </span><span class='requestvaluespan'>" + item.ediameter + "</span>", "requestlbl");
        let lbl8 = createLabel("lbl5", "<span class='requestspan'>Certification needed: </span><span class='requestvaluespan'>" + item.certification + "</span>", "requestlbl");
        let lbl9 = createLabel("lbl5", "<span class='requestspan'>Requested weight: </span><span class='requestvaluespan'>" + item.orderweight + "</span>", "requestlbl");
        let lbl10 = createLabel("lbl5", "<span class='requestspan'>Requested week: </span><span class='requestvaluespan'>" + item.weeknum + "</span>", "requestlbl");
        let lbl11 = createLabel("lbl5", "", "requestlbl");
        let txt01 = createLabel("txt01", "", "requestlbl");
        if (item.tds != "") {
            lbl11.innerHTML = "<span class='requestspan'>Accepable TDS: </span><span class='requestvaluespan'>" + item.tds + "</span>"
        }
        if (item.comment != "") {
            txt01.innerHTML = "<span class='requestspan'>Accepable TDS: </span><span class='requestvaluespan tds_comment'>" + item.comment + "</span>"
        }
        let remdiv = document.createElement("div");
        remdiv.classList.add("remdiv");
        remdiv.innerHTML = "<span class='remdivspan' onclick='removefromcart(" + item.cartid + ")'>REMOVE</span>"
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
        .then(response => response.json())
        .then(data => {
            document.getElementById("requestsnr").innerHTML = data.counter;
            listrequest();
        })
        .catch(error => console.error('Error:', error));

}

function sendtheemail() {

    if (document.getElementById("requestsnr").innerHTML > 0) {
        var z = 0;
        var mailbody = "";
        var html = "";
        var from = (document.getElementById("c1_in").value === "") ? alert("The Name field cannot be empty!") : document.getElementById("c1_in").value; z = z + 1;
        var par = "";
        if (document.getElementById("parity1").checked == true) {
            par = document.getElementById("parity1").value;
            z = z + 1;
        } else {
            par = document.getElementById("parity2").value;
            z = z + 1;
        }
        var transport_cost = "";
        if (document.getElementById("trcost").checked == true) {
            transport_cost = "yes";
        } else {
            transport_cost = "no";
        }
        var country_val = (document.getElementById("d2_in").value === "") ? alert("The Country field cannot be empty") : document.getElementById("d2_in").value; z = z + 1;
        var postal_val = (document.getElementById("d3_in").value === "") ? alert("The Postal code field cannot be empty") : document.getElementById("d3_in").value; z = z + 1;
        var adress_val = (document.getElementById("d4_in").value === "") ? alert("The Address field cannot be empty") : document.getElementById("d4_in").value; z = z + 1;
        var vat_val = (document.getElementById("c2_in").value === "") ? alert("The VAT field cannot be empty") : document.getElementById("c2_in").value; z = z + 1;
        var contact_val = (document.getElementById("c3_in").value === "") ? alert("The Contact person field cannot be empty") : document.getElementById("c3_in").value; z = z + 1;
        var email_val = (document.getElementById("c4_in").value === "") ? alert("The Email field cannot be empty") : document.getElementById("c4_in").value; z = z + 1;
        var phone_val = (document.getElementById("c5_in").value === "") ? alert("The Phone field cannot be empty") : document.getElementById("c5_in").value; z = z + 1;
        var payment_val = "";
        for (var i = 1; i < 5; i++) {
            if (document.getElementById("p" + i + "_in").checked == true) {
                payment_val = document.getElementById("p" + i + "_in").value;
            }
        }
        if (z == 9) {
            var res = confirm("Are you sure you want to send the RFQ?");
            if (res == true) {
                mailbody = '<div style="display: block; margin-bottom: 20px"><div><div style="font-size:22px">Request for Quote </div>' +
                    '<br><lbl><span style="display: inline-block;width: 180px; font-weight: bold; font-size="18px">Company </span></lbl><br>' +
                    '<lbl><span style="display: inline-block;width: 180px;">Company Name: </span><span>' + from + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">VAT Number: </span><span>' + vat_val + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Contact Person: </span><span>' + contact_val + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Email: </span><span>' + email_val + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Phone number: </span><span>' + phone_val + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;"></span><span></span></lbl><br>' +
                    '<br><lbl><span style="display: inline-block;width: 180px; font-weight: bold; font-size="18px">Delivery Address </span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Country: </span><span>' + country_val + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Postal Code: </span><span>' + postal_val + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Address: </span><span>' + adress_val + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Parity: </span><span>' + par + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Transpor cost requested: </span><span>' + transport_cost + '</span></lbl>' +
                    '<br><lbl><span style="display: inline-block;width: 180px;">Payment term: </span><span>' + payment_val + '</span></lbl>' +
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
                    .then(response => response.json())
                    .then(data => {
                        var cartlist = data.data;
                        cartlist.forEach((item) => {
                            html = '<div style="display: block;margin-bottom: 20px"><div>' +
                                '<lbl><span style="display: inline-block;width: 180px;">Tissue: </span><span>' + item.tissue + '</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Plies: </span><span>' + item.plies + '</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Grammatura: </span><span>' + item.grammatura + '</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Diameter: </span><span>' + item.diameter + '</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Reels: </span><span>' + item.reels + '</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Nr. the reels in 1 pack: </span><span>' + item.quotatient + '</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Core height: </span><span>' + item.ediameter + '</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Certification needed: </span><span>' + item.certification + '</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Requested weight: </span><span>' + item.orderweight + ' ton(s)</span></lbl>' +
                                '<br><lbl><span style="display: inline-block;width: 180px;">Requested week: </span><span>' + item.weeknum + '</span></lbl><br></div></div>';
                            mailbody += html;

                        })
                        //set the parameter as per you template parameter[https://dashboard.emailjs.com/templates]
                        var templateParams = {
                            to_name: 'Bodnár István',
                            from_name: from,
                            my_html: mailbody
                        };
                        (function () {
                            emailjs.init("2IULQU1dR18iim7yH"); //please encrypted user id for malicious attacks
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
                                    .then(response => response.json())
                                    .then(data => {

                                    })
                                    .catch(error => console.error('Error:', error));
                                alert('Your request has been sent!', response.status, response.text);
                                document.getElementById("requestsnr").innerHTML = "0";
                                document.getElementById('Tissue').value = "Select"
                                const parentDiv = document.getElementById('form');
                                const elementToKeep = document.getElementById('tissueDiv');
                                while (parentDiv.firstChild) {
                                    parentDiv.removeChild(parentDiv.firstChild);
                                }
                                parentDiv.appendChild(elementToKeep);
                            }, function (error) {
                                alert('FAILED...', error);
                            });
                    })
                    .catch(error => console.error('Error:', error));



            }

        }
    }

}