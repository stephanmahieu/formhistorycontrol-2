//import {DateUtil} from '../common/DateUtil.js';
//import {XmlUtil}  from '../common/XmlUtil.js';

'use strict';

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    document.getElementById("buttonExport").addEventListener("click", handleExport);
});



function handleExport(evt) {
    let req = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
    req.onerror = function (event) {
        console.error("Database open error", this.error);
    };
    req.onsuccess = function (event) {
        let db = event.target.result;
        //console.log("Database opened successfully.");

        let textEntries = [];
        let multilines = [];

        let count = 0;
        let objStore = db.transaction(DbConst.DB_STORE_TEXT, "readonly").objectStore(DbConst.DB_STORE_TEXT);
        let cursorReq = objStore.index("by_last").openCursor(null, "prev");
        cursorReq.onsuccess = function(evt) {
            var cursor = evt.target.result;
            if (cursor) {
                let fhcEntry = cursor.value;
                //console.log("Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type + "} KEY=[" + fhcEntry.fieldkey + "]");

                count += 1;
                if (fhcEntry.type === 'input' || fhcEntry.type === 'input') {
                    // TODO add extra properties
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
                        pagetitle: fhcEntry.pagetitle
                    });
                }

                cursor.continue();
            }
            else {
                //console.log("No more entries!");
                //console.log("Exporting " + textEntries.length + " text-entries and " + multilines.length + " multiline entries");

                document.getElementById('count-text').textContent = textEntries.length;
                document.getElementById('count-multiline').textContent = multilines.length;

                let content = XmlUtil.serializeToXMLString(textEntries, multilines);
                setDownloadLink(content);
            }
        }
    };

}


function setDownloadLink(content) {
    let alink = document.getElementById('link');
    let button = document.getElementById('buttonExport');

    // Alternative:
    //
    // https://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file
    // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL -> possibly do a URL.revokeObjectURL()
    //
    // let file;
    // let oprions = {
    //     type: 'application/xml',
    //     size: content.length
    // };
    // try {
    //     // Specify the filename using the File constructor, but ...
    //     file = new File([content], "formhistory.xml", oprions);
    // } catch (e) {
    //     // ... fall back to the Blob constructor if that isn't supported.
    //     file = new Blob([content], oprions);
    // }
    // let url = URL.createObjectURL(file);
    // console.log("Attaching URL to link: " + url);
    //
    // alink.setAttribute('href', url);

    alink.setAttribute('href', 'data:application/xml;charset=utf-8,' + encodeURIComponent(content));
    alink.setAttribute('download', "formhistory.xml");

    button.setAttribute("disabled", "disabled");
    alink.style.display = "inline";
}