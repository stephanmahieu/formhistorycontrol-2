/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 888:
                if (fhcEvent.interfaceThemeChanged) {
                    OptionsUtil.getInterfaceTheme().then(res => {
                        ThemeUtil.switchTheme(res);
                    });
                }
                if (fhcEvent.dateFormatChanged) {
                    // there is no way (yet) to alter the render function after initialization
                }
                break;

            case 111:
                databaseChangeSingleItem(fhcEvent.what, fhcEvent.primaryKey, fhcEvent.fhcEntry);
                break;
        }
    }
});

function databaseChangeSingleItem(what, primaryKey, fhcEntry) {
    let table = $('#fhcTable').DataTable();
    switch(what) {
        case 'add':
            table.row
                .add([primaryKey, fhcEntry.name, fhcEntry.value, fhcEntry.type, fhcEntry.used, fhcEntry.first, fhcEntry.last, fhcEntry.host, fhcEntry.uri])
                .draw();
            break;

        case 'update':
            table.rows().every(
                function (/* rowIdx, tableLoop, rowLoop */) {
                    if (this.data()[0] === primaryKey) {
                        let d = this.data();
                        d[1] = fhcEntry.name;
                        d[2] = fhcEntry.value;
                        d[3] = fhcEntry.type;
                        d[4] = fhcEntry.used;
                        d[5] = fhcEntry.first;
                        d[6] = fhcEntry.last;
                        d[7] = fhcEntry.host;
                        d[8] = fhcEntry.uri;
                        this.invalidate();
                        table.draw();
                    }
                }
            );
            break;

        case 'delete':
            table.rows().every(
                function (/* rowIdx, tableLoop, rowLoop */) {
                    if (this.data()[0] === primaryKey) {
                        this.remove();
                        table.draw();
                    }
                }
            );
            break;
    }
}


function populateViewFromDatabase(table, refreshEvery, forFields, forHost, doResize) {
    // check if database is accessible
    if (!WindowUtil.isDatabaseAccessible()) {
        return;
    }

    $("#overlaystatus").addClass('spinner').show();

    let req = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
    req.onerror = function () {
        console.error("Database open error", this.error);
        $("#overlaystatus").hide();
    };
    req.onsuccess = function (event) {
        // Better use "this" than "req" to get the result to avoid problems with garbage collection.
        let db = event.target.result;
        //console.log("Database opened successfully.");

        // create a lookup map
        let forFieldsMap;
        if (forFields) {
            forFieldsMap = new Map();
            forFields.forEach((field)=>{forFieldsMap.set(field.name, field.type)});
        }

        let timeStarted = new Date();
        let timeElapsed;
        let timeout = false;

        let count = 0;
        let countNotShown = 0;
        let objStore = db.transaction(DbConst.DB_STORE_TEXT, "readonly").objectStore(DbConst.DB_STORE_TEXT);
        let cursorReq = objStore.index(DbConst.DB_TEXT_IDX_LAST).openCursor(null, "prev");
        cursorReq.onsuccess = function(evt) {
            let cursor = evt.target.result;
            if (cursor) {
                let fhcEntry = cursor.value;
                //console.log("Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type + "} KEY=[" + fhcEntry.fieldkey + "]");

                if (!timeout) {

                    timeElapsed = (new Date()) - timeStarted;
                    if (timeElapsed > 5000) {
                        // building the datatable takes too long abort the populating process
                        timeout = true;
                    }

                    // either show all entries or show only the fields/host requested
                    if (!forFields || fhcEntry.name === "" || forFieldsMap.has(fhcEntry.name) || fhcEntry.host === forHost) {
                        table.row.add([cursor.primaryKey, fhcEntry.name, fhcEntry.value, fhcEntry.type, fhcEntry.used, fhcEntry.first, fhcEntry.last, fhcEntry.host, fhcEntry.uri]);
                        count += 1;
                    }

                    // only update display after 15 rows and when finished
                    if (count === refreshEvery) {
                        if (doResize) {
                            resizeTable();
                        }
                        table.draw();
                        adjustSearchBox();
                    }
                } else {
                    ++countNotShown;
                }

                cursor.continue();
            }
            else {
                //console.log("No more entries!");
                if (doResize) {
                    resizeTable();
                }
                table.draw();
                $("#overlaystatus").removeClass('spinner').hide();

                // hide page control if all entries are shown
                $('#fhcTable_paginate').toggle((-1 !== table.page.len()));

                adjustSearchBox();

                if (timeout) {
                    // populating table aborted due to timeout, inform the user
                    WindowUtil.showModalWarning({titleId: 'dialogWarningTitle', msgId: 'timeoutTooMuchDataWarning', args: [countNotShown, count+countNotShown]});
                }
            }
        }
    };
}

function resizeTable() {
    let buttonSpace = 160;
    if (window.innerWidth < 768) {
        // miscellaneous DataTable components will stack on top of each other, leave more room for the buttons
        buttonSpace = 220;
    }
    $('.dataTables_scrollBody').css('max-height', "none").css('height', window.innerHeight-buttonSpace+"px");
}

function adjustSearchBox() {
    // adjust size searchbox for placeholder to fit nicely
    const inpSearch = $("#fhcTable_filter input")[0];
    if (inpSearch) {
        const placeholderText = inpSearch.getAttribute("placeholder");
        inpSearch.setAttribute("size", placeholderText.length + 2);

        addSearchBoxEraseButton();
    }
}

function addSearchBoxEraseButton() {
    // add erase icon searchbox
    if (!$("#fhcTable_filter_erase").length) {
        const inpSearchLbl = $($("#fhcTable_filter label")[0]);
        if (inpSearchLbl.length) {
            inpSearchLbl.append('<div id="fhcTable_filter_erase">X</div>');
            $("#fhcTable_filter_erase").on('click', function(event) {
                // Event listener for erasing the searchbox
                $($("#fhcTable_filter input")[0]).val('').trigger('cut');
                return false;
            });
        }
    }
}

function haveSelectedItems() {
    const rows = $('#fhcTable').DataTable().rows('.selected');
    return rows.data().length > 0
}