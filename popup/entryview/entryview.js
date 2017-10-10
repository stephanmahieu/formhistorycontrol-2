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

    let removingData = browser.storage.local.remove("entryObject");
    removingData.then(onDataRemoved, onDataRemoveError);

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
    if (doWhat === "add") {
        // populate with defaults
        document.getElementById('used').value = '1';
        const nowDateString = DateUtil.getCurrentDateString();
        document.getElementById('first').value = nowDateString;
        document.getElementById('last').value = nowDateString;
    }

    if (doWhat === "edit" || doWhat === "add") {
        // enable fields
        document.getElementById('name').removeAttribute('disabled');
        if (type === 'input') {
            document.getElementById('value').removeAttribute('disabled');
        } else {
            document.getElementById('multiline-value').removeAttribute('disabled');
        }
        document.getElementById('typeSelect').removeAttribute('disabled');
        document.getElementById('used').removeAttribute('disabled');
        document.getElementById('first').removeAttribute('disabled');
        document.getElementById('last').removeAttribute('disabled');
        document.getElementById('url').removeAttribute('disabled');
    }

    if (type === 'input') {
        document.getElementById('urlRow').style.display = 'none';
        document.getElementById('multiline-value').style.display = 'none';
    } else {
        document.getElementById('value').style.display = 'none';
    }

    if (doWhat !== "view") {
        document.getElementById('buttonClose').style.display = 'none';
        document.getElementById('buttonOkay').style.display = 'block';
        document.getElementById('buttonCancel').style.display = 'block';
    }
}

function onDataRemoved() {
    console.log('Data removed');
}

function onDataRetrieveError(error) {
    console.error(`Error retrieving data from local storage: ${error}`);
}
function onDataRemoveError(error) {
    console.warn(`Error removing data from local storage: ${error}`);
}
