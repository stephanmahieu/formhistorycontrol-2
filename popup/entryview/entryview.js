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
    document.getElementById("buttonOkay").addEventListener("click", onOkayButton);
});

function onOkayButton() {
    // validate
    let newName = document.getElementById('name').value;
    let newValue = document.getElementById('value').value;
    let newType = document.getElementById('typeSelect').value;

    switch (objEntryData.doWhat) {
        case 'add':
            // fields non-empty
            let valueFieldId = newType==='input' ? 'value' : 'multiline-value';
            if (!validateRequiredFields(['name',valueFieldId,'typeSelect','used','first','last'])) {
                WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorMissingRequired');
            }
            break;
    }
}

function populateView() {
    console.log("Populating view using local storage");

    let gettingData = browser.storage.local.get("entryObject");
    gettingData.then(onDataRetrieved, onDataRetrieveError);
}

let objEntryData;
function onDataRetrieved(data) {
    console.log("Data retrieved", data);

    let removingData = browser.storage.local.remove("entryObject");
    removingData.then(onDataRemoved, onDataRemoveError);

    objEntryData = {
        doWhat: data.entryObject.doWhat,
        multiKeys: data.entryObject.multiKeys,
        primaryKey: data.entryObject.primaryKey,
        name: data.entryObject.name,
        value: data.entryObject.value,
        type: data.entryObject.type,
        used: data.entryObject.used,
        first: data.entryObject.first,
        last: data.entryObject.last,
        url: data.entryObject.url,
        isMultiple: (data.entryObject.multiKeys.length > 1)
    };

    document.getElementById('operationInfo').innerText = getOperationInfo(objEntryData.doWhat, objEntryData.isMultiple);

    if (objEntryData.doWhat === "view" || (objEntryData.doWhat === "edit" && !objEntryData.isMultiple)) {
        document.getElementById('name').value = objEntryData.name;
        document.getElementById('value').value = objEntryData.value;
        document.getElementById('typeSelect').value = objEntryData.type;
        document.getElementById('used').value = objEntryData.used;
        document.getElementById('first').value = DateUtil.dateToDateString(new Date(objEntryData.first));
        document.getElementById('last').value = DateUtil.dateToDateString(new Date(objEntryData.last));
        if (objEntryData.type === 'input') {
            document.getElementById('value').value = objEntryData.value;
        } else {
            document.getElementById('url').value = objEntryData.url;
            document.getElementById('multiline-value').value = objEntryData.value;
        }
    }
    if (objEntryData.doWhat === "add") {
        // populate with defaults
        document.getElementById('used').value = '1';
        const nowDateString = DateUtil.getCurrentDateString();
        document.getElementById('first').value = nowDateString;
        document.getElementById('last').value = nowDateString;
    }

    if (objEntryData.doWhat === "edit" || objEntryData.doWhat === "add") {
        // enable fields
        document.getElementById('name').removeAttribute('disabled');
        if (objEntryData.type === 'input') {
            document.getElementById('value').removeAttribute('disabled');
        } else {
            document.getElementById('multiline-value').removeAttribute('disabled');
        }
        document.getElementById('typeSelect').removeAttribute('disabled');
        document.getElementById('used').removeAttribute('disabled');
        //document.getElementById('first').removeAttribute('disabled');
        //document.getElementById('last').removeAttribute('disabled');
        document.getElementById('url').removeAttribute('disabled');
    }

    if (objEntryData.type === 'input') {
        document.getElementById('urlRow').style.display = 'none';
        document.getElementById('multiline-value').style.display = 'none';
    } else {
        document.getElementById('value').style.display = 'none';
    }

    if (objEntryData.doWhat !== "view") {
        document.getElementById('buttonClose').style.display = 'none';
        document.getElementById('buttonOkay').style.display = 'block';
        document.getElementById('buttonCancel').style.display = 'block';
    }
}

function getOperationInfo(doWhat, multiple) {
    let operationInfoId = '';
    switch (doWhat) {
        case 'view':
            operationInfoId = 'operationViewField';
            break;
        case 'add':
            operationInfoId = 'operationAddField';
            break;
        case 'edit':
            operationInfoId = multiple ? 'operationEditMultipleFields' : 'operationEditOneField';
            break;
    }
    return operationInfoId ? browser.i18n.getMessage(operationInfoId) : '';
}

function validateRequiredFields(fieldIds) {
    let isOkay = true;
    fieldIds.forEach(id => {
        let elem = document.getElementById(id);
        if (!elem.value) {
            elem.classList.add('missing-value');
            isOkay = false;
        } else {
            elem.classList.remove('missing-value');
        }
    });
    return isOkay;
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
