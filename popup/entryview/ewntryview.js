//import {DateUtil} from '../common/DateUtil.js';
//import {XmlUtil}  from '../common/XmlUtil.js';

'use strict';

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    ThemeUtil.switchTheme(OptionsUtil.getThema());

    populateView();
    document.getElementById("buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
    document.getElementById("buttonCancel").addEventListener("click", WindowUtil.closeThisPopup);
});


function populateView() {
    console.log("Populating view using local storage");

    let gettingData = browser.storage.local.get("entryObject");
    gettingData.then(onDataRetrieved, onDataRetrieveError);
}

function onDataRetrieved(data) {
    console.log("Data retrieved", data);
    let entryObject = data.entryObject;
    let doWhat = entryObject.doWhat;
    let multiKeys = entryObject.multiKeys;
    let primaryKey = entryObject.primaryKey;
    let name = entryObject.name;
    let value = entryObject.value;
    let type = entryObject.type;
    let used = entryObject.used;
    let first = entryObject.first;
    let last = entryObject.last;
    let url = entryObject.url;

    if (doWhat === "view" || (doWhat === "edit" && multiKeys.length === 1)) {
        document.getElementById('name').value = name;
        document.getElementById('value').value = value;
        document.getElementById('typeSelect').value = type;
        document.getElementById('used').value = used;
        document.getElementById('first').value = DateUtil.dateToDateString(new Date(first));
        document.getElementById('last').value = DateUtil.dateToDateString(new Date(last));
        if (type === 'input') {
            document.getElementById('value').value = value;
        } else {
            document.getElementById('url').value = url;
            document.getElementById('multiline-value').value = value;
        }
    }

    if (doWhat === "edit") {
        // enable fields
        document.getElementById('name').removeAttribute('disabled');
        if (type === 'input') {
            document.getElementById('value').removeAttribute('disabled');
        } else {
            document.getElementById('multiline-value').removeAttribute('disabled');
        }
        document.getElementById('typeSelect').removeAttribute('disabled');
        document.getElementById('used').removeAttribute('disabled');
    }

    if (type === 'input') {
        document.getElementById('urlRow').style.display = 'none';
        document.getElementById('multiline-value').style.display = 'none';
    } else {
        document.getElementById('value').style.display = 'none';
    }

    if (doWhat === "edit") {
        document.getElementById('buttonClose').style.display = 'none';
        document.getElementById('buttonOkay').style.display = 'block';
        document.getElementById('buttonCancel').style.display = 'block';
    }
}

function onDataRetrieveError(error) {
    console.error(`Error retrieving data from local storage: ${error}`);
}
