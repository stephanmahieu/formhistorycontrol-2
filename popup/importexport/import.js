/*
 * Copyright (c) 2017. Stephan Mahieu
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
            case 808:
                // restore this window to default size and position
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.restoreToDefault(window.id, FHC_WINDOW_IMPORT);
                });
                break;
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

    document.getElementById('files').addEventListener('change', handleFileSelect);
    document.getElementById("buttonImport").addEventListener("click", handleImport);
    document.getElementById("buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
    document.addEventListener("keyup", onKeyClicked);

    // no event available for window move, check periodically
    setInterval(function() {WindowUtil.checkAndSaveCurrentWindowPosition(FHC_WINDOW_IMPORT);}, 5*1000);
});

let resizeTimer;
window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // resizing has stopped
        WindowUtil.saveWindowPrefs(FHC_WINDOW_IMPORT);
    }, 250);
});

function handleFileSelect(evt) {
    document.getElementById('import-progress').value = 0;
    if (evt.target.files && evt.target.files.length > 0) {
        document.getElementById("buttonImport").removeAttribute("disabled");
    } else {
        document.getElementById("buttonImport").setAttribute("disabled", "disabled");
    }
}

function handleImport() {
    document.getElementById("buttonImport").setAttribute("disabled", "disabled");

    const fileList = document.getElementById('files').files;

    FileUtil.upload(fileList, 'text/xml', 'import-progress').then(content => {
        const result = XmlUtil.parseXMLdata(content);
        // console.log("found " + result.entries.length + " text-entries and " + result.multiline.length + " multiline-entries");

        document.getElementById('count-text').textContent = result.entries.length;
        document.getElementById('count-multiline').textContent = result.multiline.length;
        document.getElementById('import-progress').value = 100;

        _storeTextEntries(result.entries);
        _storeMultilineEntries(result.multiline);

        // notify popup(s) that new data has been added so they can update their view
        browser.runtime.sendMessage({
            eventType: 777
        });
    });
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


/**
 * Send text entries to the background handler for adding to the datastore.
 *
 * @param textEntries {Array}
 * @private
 */
function _storeTextEntries(textEntries) {
    textEntries.forEach(function(textEntry, /* index, array*/) {
        //console.log(textEntry, index);
        // host used to be absent in old versions
        let host = (textEntry.host) ? textEntry.host : "local.import";
        let url = (textEntry.url) ? textEntry.url : "http://local.import";
        browser.runtime.sendMessage({
            eventType: 4,
            type     : "input",
            name     : textEntry.name,
            value    : textEntry.value,
            host     : host,
            url      : url,
            pagetitle: "",
            used     : textEntry.used,
            first    : textEntry.first,
            last     : textEntry.last
        });
    });
}

/**
 * Send multiline entries to the background handler for adding to the datastore.
 *
 * @param multilineEntries {Array}
 * @private
 */
function _storeMultilineEntries(multilineEntries) {
    multilineEntries.forEach(function(multilineEntry, /* index, array*/) {
        //console.log(multilineEntry, index);
        browser.runtime.sendMessage({
            eventType: 4,
            type     : multilineEntry.type,
            name     : multilineEntry.name,
            value    : multilineEntry.content,
            host     : multilineEntry.host,
            url      : multilineEntry.url,
            pagetitle: "",
            used     : multilineEntry.used,
            first    : multilineEntry.firstsaved,
            last     : multilineEntry.lastsaved,
            /* Extra */
            id       : multilineEntry.id
          /*formid   : multilineEntry.formid,*/
        });
    });
}