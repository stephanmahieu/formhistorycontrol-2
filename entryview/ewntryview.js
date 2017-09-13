//import {DateUtil} from '../common/DateUtil.js';
//import {XmlUtil}  from '../common/XmlUtil.js';

'use strict';

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    populateView();

    // Add event listeners for the buttons
    document.getElementById("buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
});


function populateView() {
    console.log("Populating view using local storage");

    let gettingData = browser.storage.local.get("entryObject");
    gettingData.then(onDataRetrieved, onDataRetrieveError);
}

function onDataRetrieved(data) {
    console.log("Data retrieved", data);
    let entryObject = data.entryObject;
    let primaryKey = entryObject.primaryKey;
    let name = entryObject.name;
    let value = entryObject.value;
    let type = entryObject.type;
    let used = entryObject.used;
    let first = entryObject.first;
    let last = entryObject.last;
    let url = entryObject.url;
    document.getElementById('name').textContent = name;
    document.getElementById('value').textContent = value;
}

function onDataRetrieveError(error) {
    console.error(`Error retrieving data from local storage: ${error}`);
}
