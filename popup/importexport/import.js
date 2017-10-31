//import {DateUtil} from '../common/DateUtil.js';
//import {XmlUtil}  from '../common/XmlUtil.js';

'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 888:
                // options have changed, reload
                OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});
                break;
            case 666:
                browser.windows.getCurrent({populate: false, windowTypes: ["popup"]}).then((window)=>{
                    WindowUtil.closePopupByID(window.id);
                });
                break;
        }
    }
});

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});

    document.getElementById('files').addEventListener('change', handleFileSelect);
    document.getElementById("buttonImport").addEventListener("click", handleImport);
    document.getElementById("buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
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

    let fileList = document.getElementById('files').files;
    for (let i = 0, f; f = fileList[i]; i++) {
        console.log(
            "Selected file: " + f.name + ", " +
            "type " + (f.type || "n/a" ) + ", " +
            f.size + " bytes, " +
            "last modified: " + (f.lastModified ? new Date(f.lastModified).toISOString() : "n/a")
        );

        // only process xml files
        if ('text/xml' !== f.type) {
            console.log("Not an xml file, skipping...");
            WindowUtil.showModalError("importErrorTitle", "importErrorNotXml");
            continue;
        }

        console.log("Importing file " + f.name + "...");
        let reader = new FileReader();

        reader.onerror = function(evt) {
            switch(evt.target.error.code) {
                case evt.target.error.NOT_FOUND_ERR:
                    WindowUtil.showModalError("importErrorTitle", "importErrorNotFound");
                    break;
                case evt.target.error.NOT_READABLE_ERR:
                    WindowUtil.showModalError("importErrorTitle", "importErrorNotReadable");
                    break;
                case evt.target.error.ABORT_ERR:
                    break; // noop
                default:
                    WindowUtil.showModalError("importErrorTitle", "importErrorUnknown");
            }
        };

        reader.onloadstart = function(/*evt*/) {
            document.getElementById('import-progress').value = 0;
            console.log("- loading...");
        };

        reader.onprogress = function(evt){
            let percentLoaded = 0;
            if (evt.lengthComputable) {
                percentLoaded = Math.round((evt.loaded / evt.total) * 100);
            }
            document.getElementById('import-progress').value = percentLoaded;
            console.log("- progress ", percentLoaded, "%");
        };

        reader.onabort = function(/*evt*/) {
            console.log("- cancelled");
            WindowUtil.showModalError("importErrorTitle", "importErrorUnknown");
        };

        reader.onload = function(/*evt*/) {
            let result = XmlUtil.parseXMLdata(reader.result);
            console.log("found " + result.entries.length + " text-entries and " + result.multiline.length + " multiline-entries");

            document.getElementById('count-text').textContent = result.entries.length;
            document.getElementById('count-multiline').textContent = result.multiline.length;
            document.getElementById('import-progress').value = 100;

            _storeTextEntries(result.entries);
            _storeMultilineEntries(result.multiline);

            // notify popup(s) that new data has been added so they can update their view
            browser.runtime.sendMessage({
                eventType: 777
            });
        };

        reader.readAsText(f, "utf-8");
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