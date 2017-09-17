//import {DateUtil} from '../common/DateUtil.js';
//import {XmlUtil}  from '../common/XmlUtil.js';

'use strict';

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    document.getElementById('files').addEventListener('change', handleFileSelect);
    document.getElementById("buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
});


function handleFileSelect(evt) {
    let fileList = evt.target.files;
    for (let i = 0, f; f = fileList[i]; i++) {
        console.log(
            "Selected file: " + f.name + ", " +
            "type " + (f.type || "n/a" ) + ", " +
            f.size + " bytes, " +
            "last modified: " + (f.lastModified ? new Date(f.lastModified).toISOString() : "n/a")
        );

        // Only process image files.
        if ('text/xml' !== f.type) {
            console.log("Not an xml file, skipping...");
            continue;
        }

        console.log("Importing file " + f.name + "...");
        let reader = new FileReader();

        reader.onerror = function(evt) {
            switch(evt.target.error.code) {
                case evt.target.error.NOT_FOUND_ERR:
                    alert('File Not Found!');
                    break;
                case evt.target.error.NOT_READABLE_ERR:
                    alert('File is not readable');
                    break;
                case evt.target.error.ABORT_ERR:
                    break; // noop
                default:
                    alert('An error occurred reading this file.');
            }
        };

        reader.onloadstart = function(/*evt*/) {
            console.log("- loading...");
        };

        reader.onprogress = function(/*evt*/){
            let percentLoaded = 0;
            if (evt.lengthComputable) {
                percentLoaded = Math.round((evt.loaded / evt.total) * 100);
            }
            console.log("- progress ", percentLoaded, "%");
        };

        reader.onabort = function(/*evt*/) {
            console.log("- cancelled");
            alert('File read cancelled');
        };

        reader.onload = function(/*evt*/) {
            let result = XmlUtil.parseXMLdata(reader.result);
            console.log("found " + result.entries.length + " text-entries and " + result.multiline.length + " multiline-entries");

            document.getElementById('count-text').textContent = result.entries.length;
            document.getElementById('count-multiline').textContent = result.multiline.length;

            _storeTextEntries(result.entries);
            _storeMultilineEntries(result.multiline);
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
            first    : multilineEntry.first,
            last     : multilineEntry.last,
            /* Extra */
            id       : multilineEntry.id
          /*formid   : multilineEntry.formid,*/
        });
    });
}