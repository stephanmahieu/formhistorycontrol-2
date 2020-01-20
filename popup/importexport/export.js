/*
 * Copyright (c) 2020. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

//import {DateUtil} from '../common/DateUtil.js';
//import {XmlUtil}  from '../common/XmlUtil.js';

'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 888:
                if (fhcEvent.interfaceThemeChanged) {
                    // options have changed, reload
                    OptionsUtil.getInterfaceTheme().then(res => {
                        ThemeUtil.switchTheme(res);
                    });
                }
                break;
            case 666:
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.closePopupByID(window.id);
                });
                break;
        }
    }
});

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    document.getElementById("buttonExport").addEventListener("click", download);
    document.getElementById("buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
    document.addEventListener("keyup", onKeyClicked);
});


function download() {
    let timeStarted = showBusy();

    let req = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
    req.onerror = function (/*event*/) {
        hideBusy(timeStarted);
        console.error("Database open error", this.error);
    };
    req.onsuccess = function (event) {
        let db = event.target.result;
        //console.log("Database opened successfully.");

        let textEntries = [];
        let multilines = [];

        let count = 0;
        let objStore = db.transaction(DbConst.DB_STORE_TEXT, "readonly").objectStore(DbConst.DB_STORE_TEXT);
        let cursorReq = objStore.index(DbConst.DB_TEXT_IDX_LAST).openCursor(null, "prev");
        cursorReq.onsuccess = function(evt) {
            let cursor = evt.target.result;
            if (cursor) {
                let fhcEntry = cursor.value;
                //console.log("Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type + "} KEY=[" + fhcEntry.fieldkey + "]");

                count += 1;
                if (fhcEntry.type === 'input') {
                    textEntries.push({
                        name: fhcEntry.name,
                        value: fhcEntry.value,
                        used: fhcEntry.used,
                        first: fhcEntry.first,
                        last: fhcEntry.last,
                        /* new */
                        type: fhcEntry.type,
                        host: fhcEntry.host,
                        url: fhcEntry.uri,
                        pagetitle: fhcEntry.pagetitle
                    });
                } else {
                    multilines.push({
                        id: "",
                        name: fhcEntry.name,
                        type: fhcEntry.type,
                        formid: "",
                        host: fhcEntry.host,
                        url: fhcEntry.uri,
                        first: fhcEntry.first,
                        last: fhcEntry.last,
                        content: fhcEntry.value,
                        /* new */
                        used: fhcEntry.used,
                        pagetitle: fhcEntry.pagetitle
                    });
                }

                cursor.continue();
            }
            else {
                hideBusy(timeStarted);
                //console.log("No more entries!");
                //console.log("Exporting " + textEntries.length + " text-entries and " + multilines.length + " multiline entries");

                // update stats
                document.getElementById('count-text').textContent = textEntries.length;
                document.getElementById('count-multiline').textContent = multilines.length;

                let exportFilename = 'formhistory-export-' + currentDateFilenameSafe() + '.xml';
                let content = XmlUtil.serializeToXMLString(textEntries, multilines);
                let file = new Blob([content], {type: 'text/xml'});
                let downloadUrl = URL.createObjectURL(file);

                browser.downloads.download({
                    url: downloadUrl,
                    saveAs: true,
                    filename: exportFilename,
                    conflictAction: 'overwrite'
                }).then(
                    (id) => {
                        // console.log(`Download started, id: ${id}`);
                        file = null;
                        content = null;
                    },
                    (error) => {
                        console.error(`Download failed. ${error}`);
                        file = null;
                        content = null;
                    }
                );
            }
        }
    };
}

function currentDateFilenameSafe() {
    // return date as 'yyyyMMdd_HHmmss'
    return DateUtil.getCurrentISOdateString()
        .replace(/[: -]/g, '')
        .replace(/T/g, '_')
        .replace(/\.\d*/, '');
}

function onKeyClicked(event) {
    const keyName = event.key;

    if (keyName === 'Escape') {
        if (WindowUtil.isModalDialogActive()) {
            WindowUtil.doCancelModalDialog();
        } else {
            WindowUtil.closeThisPopup();
        }
    }
}

function showBusy() {
    document.querySelector('#overlaystatus').classList.add('spinner');
    document.querySelector('#overlaystatus').style.display = 'block';
    return new Date();
}

function hideBusy(timeStarted) {
    // the busy spinner is visible for a minimum amount of time to avoid flickering so the user gets a chance
    // to see the spinner and read the text
    const minVisibleDisplayTime = 1200;
    let displayPause = 0;
    let timeElapsed = (new Date()) - timeStarted;
    if (timeElapsed < minVisibleDisplayTime) {
        displayPause = minVisibleDisplayTime - timeElapsed;
    }
    setTimeout(() => {
        document.querySelector('#overlaystatus').style.display = 'none';
        document.querySelector('#overlaystatus').classList.remove('spinner');
    }, displayPause);
}
