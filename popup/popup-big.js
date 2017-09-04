'use strict';

//browser.runtime.onMessage.addListener(receiveEvents);
//
// function receiveEvents(fhcEvent) {
//     if (fhcEvent.eventType) {
//         switch (fhcEvent.eventType) {
//             case 1:
//                 fhcEvent.value = JSON.parse(fhcEvent.value);
//                 console.log("Received a content event! for " + fhcEvent.id + " content is: " + fhcEvent.value);
//                 break;
//             case 2:
//                 console.log("Received a formelement event! for " + fhcEvent.id + " which is a " + fhcEvent.type);
//                 break;
//         }
//     }
// }

//const gettingItem = browser.storage.local.get();
//gettingItem.then((results) => {
//  document.querySelector("#panel-content").textContent = JSON.stringify(results, null, 2);
//});


// var dataSet = [
//     [ 1,  "os_username", "mahies", 692, 1364453733248, 1487678983265, "http://www.dummy.net" ],
//     [ 2,  "searchbar-history", "java ssl rsa rc4 128", 1, 1487662321458, 1487662321458, "http://www.dummy.net" ],
//     [ 3,  "session[username]", "mahies", 26, 1460972197985, 1487600954650, "http://www.dummy.net" ],
//     [ 4,  "j_username", "mahies", 563, 1364976724597, 1487664013000, "http://www.dummy.net" ],
//     [ 5,  "searchbar-history", "slack formatting", 1, 1487587276769, 1487587276769, "http://www.dummy.net" ],
//     [ 6,  "searchbar-history", "spring annotation-driven", 1, 1487584649085, 1487584649085, "http://www.dummy.net" ],
//     [ 7,  "searchbar-history", "tx:annotation-driven t", 1, 1487584620969, 1487584620969, "http://www.dummy.net" ],
//     [ 8,  "searchbar-history", "log request response servletfilter", 1, 1487583965434, 1487583965434, "http://www.dummy.net/page/another/here" ],
//     [ 9,  "searchbar-history", "java [] add", 1, 1487578995966, 1487578995966, "http://www.dummy.net" ],
//     [ 10, "searchbar-history", "PayloadLoggingInterceptor", 1, 1487573054408, 1487573054408, "http://www.dummy.net" ],
//     [ 11, "searchbar-history", "spring-ws marshalSendAndReceive log xml", 1, 1487572977722, 1487572977722, "http://www.dummy.net" ],
//     [ 12, "searchString", "timestamp", 1, 1487571865292, 1487571865292, "http://www.dummy.net" ],
//     [ 13, "searchbar-history", "spooky fairy", 1, 1487416016680, 1487416016680, "http://www.dummy.net" ],
//     [ 14, "email", "+31613277188", 1, 1487416335000, 1487416335000, "http://www.dummy.net" ],
//     [ 15, "searchbar-history", "javascript test null", 1, 1487323353156, 1487323353156, "http://www.dummy.net" ],
//     [ 16, "q", "java", 2, 1484581340242, 1487317384749, "http://www.dummy.net" ],
//     [ 17, "q", "tomcat", 2, 1487317309190, 1487317333609, "http://www.dummy.net" ],
//     [ 18, "q", "parent", 1, 1487317317078, 1487317317078, "http://www.dummy.net" ],
//     [ 19, "searchbar-history", "fairy", 1, 1487315491640, 1487315491640, "http://www.dummy.net" ],
//     [ 20, "searchbar-history", "facebook assign page role person can't be added", 1, 1487313184451, 1487313184451, "http://www.dummy.net" ],
//     [ 21, "searchbar-history", "translate", 1, 1487311945033, 1487311945033, "http://www.dummy.net" ],
//     [ 22, "code", "48184", 1, 1487311821827, 1487311821827, "http://www.dummy.net" ],
//     [ 23, "reg_email_confirmation__", "+31613277188", 2, 1487311602827, 1487311629990, "http://www.dummy.net" ],
//     [ 24, "reg_email__", "+31613277188", 2, 1487311602827, 1487311629990, "http://www.dummy.net" ],
//     [ 25, "lastname", "Le Blanc", 2, 1487311602827, 1487311629990, "http://www.dummy.net" ],
//     [ 26, "firstname", "Adv", 1, 1487311629990, 1487311629990, "http://www.dummy.net" ],
//     [ 27, "firstname", "A", 1, 1487311602827, 1487311602827, "http://www.dummy.net" ],
//     [ 28, "searchbar-history", "facebook", 1, 1487311351132, 1487311351132, "http://www.dummy.net" ],
//     [ 29, "searchbar-history", "apache camel http", 1, 1487144358590, 1487144358590, "http://www.dummy.net" ],
//     [ 30, "searchbar-history", "jaxbmarshaller threadsafe", 1, 1487070445816, 1487070445816, "http://www.dummy.net" ],
//     [ 31, "searchbar-history", "javasctipt childnode text", 1, 1487058444395, 1487058444395, "http://www.dummy.net" ],
//     [ 32, "searchbar-history", ".hasOwnProperty", 1, 1487057614461, 1487057614461, "http://www.dummy.net" ],
//     [ 33, "searchbar-history", "querySelectorAll data", 1, 1487057465060, 1487057465060, "http://www.dummy.net" ],
//     [ 34, "searchbar-history", "querySelector", 1, 1487056856567, 1487056856567, "http://www.dummy.net" ],
//     [ 35, "searchbar-history", "inernationalize chrome etension html", 1, 1487056186412, 1487056186412, "http://www.dummy.net" ],
//     [ 36, "searchbar-history", "mozilla webextensions locale", 1, 1487052533485, 1487052533485, "http://www.dummy.net" ],
//     [ 37, "userReleaseDate", "13-02-2017", 1, 1486996272837, 1486996272837, "http://www.dummy.net" ],
//     [ 38, "name", "klic-belangen-frontend_2.0.0.55", 1, 1486996259811, 1486996259811, "http://www.dummy.net" ],
//     [ 39, "description", "Belangen frontend", 1, 1486996259811, 1486996259811, "http://www.dummy.net" ],
//     [ 40, "searchbar-history", "geocat.net", 1, 1486993780756, 1486993780756, "http://www.dummy.net" ],
//     [ 41, "searchbar-history", "swagger client create", 1, 1486993396001, 1486993396001, "http://www.dummy.net" ],
//     [ 42, "searchbar-history", "swagger", 1, 1486993331945, 1486993331945, "http://www.dummy.net" ],
//     [ 43, "rn", "gerlo", 1, 1486992561292, 1486992561292, "http://www.dummy.net" ],
//     [ 44, "n", "gerlo", 1, 1486992555215, 1486992555215, "http://www.dummy.net" ],
//     [ 45, "searchbar-history", "React.createElement", 1, 1486983888728, 1486983888728, "http://www.dummy.net" ],
//     [ 46, "summary", "bmkl-api netinformatie-opvraagservice niet leveren via lokaal zipbestand", 1, 1486976259239, 1486976259239, "http://www.dummy.net" ],
//     [ 47, "searchbar-history", "e10s list]", 1, 1486969575850, 1486969575850, "http://www.dummy.net" ],
//     [ 48, "searchbar-history", "firefox add-ons", 1, 1486967537827, 1486967537827, "http://www.dummy.net" ],
//     [ 49, "searchbar-history", "glasvezel bitengebied hof", 1, 1486966072050, 1486966072050, "http://www.dummy.net" ],
//     [ 50, "wpName", "Stephan", 80, 1364547284740, 1486965771124, "http://www.dummy.net" ],
//     [ 51, "mo", "11294535", 1, 1486711195375, 1486711195375, "http://www.dummy.net" ],
//     [ 52, "n", "smit", 3, 1486641146194, 1486711164580, "http://www.dummy.net" ],
//     [ 53, "searchbar-history", "Suppoort", 1, 1486709627992, 1486709627992, "http://www.dummy.net" ],
//     [ 54, "searchbar-history", "regex tester", 1, 1486664576258, 1486664576258, "http://www.dummy.net" ],
//     [ 55, "searchbar-history", "sjoerd smorenburg", 1, 1486643492535, 1486643492535, "http://www.dummy.net" ],
//     [ 56, "session_key", "stephanmahieu@yahoo.com", 24, 1470832678961, 1486643382007, "http://www.dummy.net" ],
//     [ 57, "n", "smo", 1, 1486642445396, 1486642445396, "http://www.dummy.net" ],
//     [ 58, "n", "smoren", 1, 1486642433483, 1486642433483, "http://www.dummy.net" ],
//     [ 59, "n", "hulleman", 2, 1486641880217, 1486642349361, "http://www.dummy.net" ],
//     [ 60, "n", "hosper", 2, 1486641627271, 1486642280113, "http://www.dummy.net"  ]
// ];



let openChildRow;
let openTr;
function closePrevChildIfOpen() {
    if (openChildRow) {
        openChildRow.child.hide();
        openTr.removeClass('shown');
        openChildRow = null;
        openTr = null;

        // $('div.detail-root', openChildRow.child()).slideUp( function () {
        //     openChildRow.child.hide();
        //     openTr.removeClass('shown');
        //     openChildRow = null;
        //     openTr = null;
        // });
    }
}

$(document).ready(function() {
    let table = $('#fhcTable').DataTable( {
        scrollY: 300,
        paging: false,
        order: [[ 7, "desc" ]],
        columns: [
            {
                responsivePriority: 1,
                className: 'details-control',
                orderable: false,
                data: null,
                defaultContent: ''
            },
            { title: "Id", responsivePriority: 2 },
            { title: "Veldnaam", responsivePriority: 3 },
            { title: "Waarde", responsivePriority: 4  },
            { title: "Type", responsivePriority: 10  },
            { title: "Aantal", responsivePriority: 5  },
            { title: "Eerst gebruikt", responsivePriority: 9  },
            { title: "Laatst gebruikt", responsivePriority: 7  },
            { title: "Oud", responsivePriority: 6 },
            { title: "Bron", responsivePriority: 8  }
        ],
        columnDefs: [
            {
                targets: [ 1 ],
                visible: false,
                searchable: false
            },
            {
                targets: 2,
                data: 1,
                className: "dt-head-left",
                render: function ( data, type, full, meta ) {
                    return ellipsis(data, type, 25, false, true);
                }
            },
            {
                targets: 3,
                data: 2,
                className: "dt-head-left",
                render: function ( data, type, full, meta ) {
                    return ellipsis(data, type, 40, false, true);
                }
            },
            {
                targets: 4,
                data: 3,
                className: "dt-head-left"
            },
            {
                targets: 5,
                data: 4,
                type: "num",
                searchable: false,
                className: "dt-right"
            },
            {
                targets: 6,
                data: 5,
                className: "dt-head-left",
                render: function ( data, type, full, meta ) {
                    return formatDate(data, type);
                }
            },
            {
                targets: 7,
                data: 6,
                className: "dt-head-left",
                render: function ( data, type, full, meta ) {
                    return formatDate(data, type);
                }
            },
            {
                targets: 8,
                data: 6,
                className: "dt-head-left",
                render: function ( data, type, full, meta ) {
                    return formatAge(data, type);
                }
            },
            {
                targets: 9,
                data: 7,
                className: "dt-head-left",
                render: function ( data, type, full, meta ) {
                    return ellipsis(data, type, 25, false, true);
                }
            }
        ]
    } );


    // Add event listener for opening and closing details
    $('#fhcTable')
        .find('tbody').on('click', 'td.details-control', function () {
            let tr = $(this).closest('tr');
            let row = table.row( tr );

            if (row.child.isShown()) {
                // This row is already open - close it
                $('div.detail-root', row.child()).slideUp('fast', function () {
                    row.child.hide();
                    tr.removeClass('shown');
                });
            }
            else {
                closePrevChildIfOpen();
                openChildRow = row.child( formatDetail(row.data()), 'no-padding');
                openChildRow.show();
                openTr = tr;
                tr.addClass('shown');
                $('div.detail-root', row.child()).slideDown('fast');
            }
        }).end()
        .find('tbody').on( 'click', 'tr', function () {
            $(this).toggleClass('selected');
        }
    );
    // $('#fhcTable').find('tbody').on( 'click', 'tr', function () {
    //     $(this).toggleClass('selected');
    // });

    // table.on('page.dt', function () {
    //     closePrevChildIfOpen();
    // });


    $('nav li').hover(
        function() {
            $('ul', this).stop().slideDown(200);
        },
        function() {
            $('ul', this).stop().slideUp(200);
        }
    );


    // Add event listeners for the buttons
    $('#buttons').find('button').on('click', function (event) {
        onButtonClicked(event.currentTarget.id);
    });

    // Add event listeners for the menu items
    $('nav ul li ul li span').on('click', function (event) {
        onMenuClicked(event.currentTarget.id);
    });

    // populate the database
    populateFromDatabase(table);
});



const DB_NAME = "FormHistoryControl8";
const DB_VERSION = 1;
const DB_STORE_TEXT = 'text_history8';

function populateFromDatabase(table) {
    $("#overlaystatus").show();

    let req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = function (/*event*/) {
        console.error("Database open error", this.error);
        $("#overlaystatus").hide();
    };
    req.onsuccess = function (event) {
        // Better use "this" than "req" to get the result to avoid problems with garbage collection.
        let db = event.target.result;
        //console.log("Database opened successfully.");

        let count = 0;
        let objStore = db.transaction(DB_STORE_TEXT, "readonly").objectStore(DB_STORE_TEXT);
        let cursorReq = objStore.index("by_last").openCursor(null, "prev");

        cursorReq.onsuccess = function(evt) {
            let cursor = evt.target.result;
            if (cursor) {
                let fhcEntry = cursor.value;
                //console.log("Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type + "} KEY=[" + fhcEntry.fieldkey + "]");

                table.row.add([cursor.key, fhcEntry.name, fhcEntry.value, fhcEntry.type, fhcEntry.used, fhcEntry.first, fhcEntry.last, fhcEntry.host]);

                // only update display after 25 rows and when finished
                count += 1;
                if (count === 25) {
                    table.draw();
                }

                cursor.continue();
            }
            else {
                //console.log("No more entries!");
                table.draw();
                $("#overlaystatus").hide();
            }
        }
    };
}

function onButtonClicked(buttonId) {
    switch (buttonId) {
        case "buttonDelete":
        case "buttonCleanup":
        case "buttonModify":
        case "buttonAdd":
            console.log("buttonId " + buttonId + " clicked...");
            break;

        case "buttonClose":
            console.log("buttonId " + buttonId + " clicked...");
            _closeThisPopup();
            break;
    }
}

function onMenuClicked(menuItemId) {
    switch (menuItemId) {
        case "add":
        case "modify":
        case "delete":
        case "copy2clipboard":
        case "selectall":
        case "selectnone":
        case "selectinvert":
        case "refresh":
        case "helpoverview":
        case "releasenotes":
            console.log("menuItemId " + menuItemId + " clicked...");
            break;

        case "import":
            console.log("menuItemId " + menuItemId + " clicked...");
            createOrFocusWindow(FHC_WINDOW_IMPORT);
            break;

        case "export":
            console.log("menuItemId " + menuItemId + " clicked...");
            createOrFocusWindow(FHC_WINDOW_EXPORT);
            break;

        case "preferences":
            console.log("menuItemId " + menuItemId + " clicked...");
            createOrFocusWindow(FHC_WINDOW_OPTIONS);
            break;

        case "about":
            console.log("menuItemId " + menuItemId + " clicked...");
            createOrFocusWindow(FHC_WINDOW_ABOUT);
            break;

        case "close":
            console.log("menuItemId " + menuItemId + " clicked...");
            _closeThisPopup();
            break;
    }
}


function _closeThisPopup() {
    let getting = browser.windows.getCurrent({populate: false, windowTypes: ["popup"]});
    getting.then((window) => {
        let removing = browser.windows.remove(window.id);
        removing.onRemoved = function() {
            console.log("Window removed");
        };
        removing.onError = function() {
            console.error("Database open error", this.error);
        }
    });
}